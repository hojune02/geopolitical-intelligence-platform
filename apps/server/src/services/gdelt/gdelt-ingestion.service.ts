import { bumpEventCacheVersion, cacheGet, cacheSet } from '../../cache/redis.js';

import { env } from '../../config/env.js';

import { isBatchIngested, persistGdeltBatch } from '../../repositories/gdelt.repository.js';

import { fetchGdeltExport, fetchLatestGdeltExportUrl } from './gdelt-service.js';

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

export async function ingestGdeltBatch(exportUrl: string): Promise<'ingested' | 'skipped'> {
  const alreadyIngested = await isBatchIngested(exportUrl);

  if (alreadyIngested) {
    return 'skipped';
  }

  const batch = await fetchGdeltExport(exportUrl);

  await persistGdeltBatch(exportUrl, batch);

  await bumpEventCacheVersion();

  return 'ingested';
}

import { createRecentExportUrls } from './gdelt-export.js';

export async function runGdeltIngestionCycle(lookbackHours: number): Promise<void> {
  const latestUrl = await fetchLatestGdeltExportUrl();

  const candidates = createRecentExportUrls(latestUrl, lookbackHours);

  for (const exportUrl of candidates) {
    if (await isBatchIngested(exportUrl)) {
      continue;
    }

    try {
      await ingestGdeltBatch(exportUrl);

      console.info(`[gdelt-worker] ingested ${exportUrl}`);
    } catch (caught: unknown) {
      console.warn(`[gdelt-worker] unable to ingest ${exportUrl}`, caught);
    }
  }
}
