import { bumpEventCacheVersion, cacheGet, cacheSet } from '../../cache/redis.js';

import { env } from '../../config/env.js';

import {
  getCompletedBatchUrls,
  isBatchIngested,
  persistGdeltBatch,
} from '../../repositories/gdelt.repository.js';

import { createRecentExportUrls } from './gdelt-export.js';

import {
  fetchGdeltExport,
  fetchLatestGdeltExportUrl,
  GdeltExportNotFoundError,
} from './gdelt-service.js';

const LATEST_EXPORT_CACHE_KEY = 'gdelt:latest-export-url';

async function getLatestExportUrl(): Promise<string> {
  const cached = await cacheGet(LATEST_EXPORT_CACHE_KEY);

  if (cached !== null) {
    return cached;
  }

  const exportUrl = await fetchLatestGdeltExportUrl();

  await cacheSet(LATEST_EXPORT_CACHE_KEY, exportUrl, env.GDELT_MANIFEST_CACHE_TTL_SECONDS);

  return exportUrl;
}

export async function ingestLatestGdeltBatch() {
  const exportUrl = await getLatestExportUrl();

  const alreadyIngested = await isBatchIngested(exportUrl);

  if (alreadyIngested) {
    return {
      exportUrl,
      skipped: true,
      reason: 'already_ingested',
    };
  }

  const batch = await fetchGdeltExport(exportUrl);

  const result = await persistGdeltBatch(exportUrl, batch);

  if (!result.skipped) {
    await bumpEventCacheVersion();
  }

  return {
    exportUrl,

    skipped: result.skipped,

    totalRows: batch.totalRows,

    acceptedRows: batch.events.length,

    rejectedRows: batch.rejectedRows,

    upsertedEvents: result.upsertedEvents,
  };
}

/*
 * Stage in which a cycle failed as a whole. Per-batch failures
 * are reported in the summary instead of being thrown.
 */
export type IngestionStage = 'manifest' | 'database' | 'batches';

export class IngestionCycleError extends Error {
  public readonly stage: IngestionStage;

  public constructor(stage: IngestionStage, message: string, options?: { cause?: unknown }) {
    super(message, options);

    this.name = 'IngestionCycleError';
    this.stage = stage;
  }
}

export interface IngestionCycleOptions {
  /*
   * Wall-clock budget for the whole cycle. When set, no new batch
   * is started once the remaining time drops below
   * minBatchBudgetMs, so an HTTP-triggered cycle returns before
   * the caller (cron-job.org, Vercel) gives up on it.
   */
  timeBudgetMs?: number;

  minBatchBudgetMs?: number;
}

export interface IngestionCycleSummary {
  latestExportUrl: string;
  candidates: number;
  alreadyCompleted: number;
  ingested: number;
  upsertedEvents: number;
  missingUpstream: number;
  failed: { exportUrl: string; message: string }[];
  remaining: number;
  budgetExhausted: boolean;
  durationMs: number;
}

function describeError(caught: unknown): string {
  if (caught instanceof Error) {
    const cause = caught.cause instanceof Error ? ` (cause: ${caught.cause.message})` : '';

    return `${caught.name}: ${caught.message}${cause}`.slice(0, 300);
  }

  return String(caught).slice(0, 300);
}

export async function runGdeltIngestionCycle(
  lookbackHours: number,
  options: IngestionCycleOptions = {},
): Promise<IngestionCycleSummary> {
  const startedAt = Date.now();

  const deadline =
    options.timeBudgetMs === undefined ? Number.POSITIVE_INFINITY : startedAt + options.timeBudgetMs;

  const minBatchBudgetMs = options.minBatchBudgetMs ?? 5_000;

  let latestExportUrl: string;

  try {
    latestExportUrl = await fetchLatestGdeltExportUrl();
  } catch (caught: unknown) {
    throw new IngestionCycleError('manifest', describeError(caught), { cause: caught });
  }

  /*
   * Newest first: when the budget runs out, the freshest data is
   * already in, and older gaps are filled by later runs.
   */
  const candidates = createRecentExportUrls(latestExportUrl, lookbackHours).reverse();

  let completed: Set<string>;

  try {
    completed = await getCompletedBatchUrls(candidates);
  } catch (caught: unknown) {
    throw new IngestionCycleError('database', describeError(caught), { cause: caught });
  }

  const pending = candidates.filter((url) => !completed.has(url));

  const summary: IngestionCycleSummary = {
    latestExportUrl,
    candidates: candidates.length,
    alreadyCompleted: candidates.length - pending.length,
    ingested: 0,
    upsertedEvents: 0,
    missingUpstream: 0,
    failed: [],
    remaining: 0,
    budgetExhausted: false,
    durationMs: 0,
  };

  for (const [index, exportUrl] of pending.entries()) {
    const remainingMs = deadline - Date.now();

    if (remainingMs < minBatchBudgetMs) {
      summary.budgetExhausted = true;
      summary.remaining = pending.length - index;
      break;
    }

    try {
      const batch = await fetchGdeltExport(
        exportUrl,
        Math.min(30_000, Math.max(1_000, remainingMs - 1_000)),
      );

      const result = await persistGdeltBatch(exportUrl, batch);

      if (!result.skipped) {
        summary.ingested += 1;
        summary.upsertedEvents += result.upsertedEvents;
      }

      console.info(`[gdelt-ingest] ingested ${exportUrl} (${String(result.upsertedEvents)} events)`);
    } catch (caught: unknown) {
      if (caught instanceof GdeltExportNotFoundError) {
        summary.missingUpstream += 1;
        continue;
      }

      const message = describeError(caught);

      summary.failed.push({ exportUrl, message });

      console.warn(`[gdelt-ingest] unable to ingest ${exportUrl}: ${message}`);
    }
  }

  if (summary.ingested > 0) {
    await bumpEventCacheVersion();
  }

  summary.durationMs = Date.now() - startedAt;

  /*
   * If every attempted batch failed for a reason other than a
   * missing upstream file, the database is rejecting writes
   * (quota, read-only mode, constraint drift). Surface that
   * instead of reporting success.
   */
  if (summary.failed.length > 0 && summary.ingested === 0) {
    throw new IngestionCycleError(
      'batches',
      `All ${String(summary.failed.length)} attempted batches failed; first error: ${
        summary.failed[0]?.message ?? 'unknown'
      }`,
    );
  }

  return summary;
}
