import { createHash, timingSafeEqual } from 'node:crypto';

import { Router } from 'express';

import { env } from '../config/env.js';

import {
  IngestionCycleError,
  type IngestionStage,
  runGdeltIngestionCycle,
} from '../services/gdelt/gdelt-ingestion.service.js';

export const cronRouter = Router();

function digest(value: string): Buffer {
  return createHash('sha256').update(value).digest();
}

/*
 * Constant-time comparison; hashing first keeps the buffers the
 * same length so timingSafeEqual never throws.
 */
function isAuthorized(header: string | undefined): boolean {
  if (header === undefined) {
    return false;
  }

  return timingSafeEqual(digest(header), digest(`Bearer ${env.CRON_SECRET}`));
}

const STAGE_RESPONSES: Record<IngestionStage, { status: number; code: string }> = {
  manifest: { status: 502, code: 'GDELT_MANIFEST_UNAVAILABLE' },
  database: { status: 503, code: 'DATABASE_UNAVAILABLE' },
  batches: { status: 500, code: 'GDELT_BATCHES_FAILED' },
};

cronRouter.get('/gdelt-ingest', async (request, response, next) => {
  if (!isAuthorized(request.header('authorization'))) {
    response.status(401).json({
      error: {
        code: 'UNAUTHORIZED',
        message: 'Unauthorized',
      },
    });

    return;
  }

  try {
    const summary = await runGdeltIngestionCycle(env.GDELT_WORKER_LOOKBACK_HOURS, {
      timeBudgetMs: env.CRON_TIME_BUDGET_SECONDS * 1_000,
    });

    console.info('[cron] gdelt-ingest', JSON.stringify(summary));

    response.status(200).json({
      data: {
        completed: !summary.budgetExhausted,
        ...summary,
      },
    });
  } catch (caught: unknown) {
    if (caught instanceof IngestionCycleError) {
      const mapped = STAGE_RESPONSES[caught.stage];

      console.error(`[cron] gdelt-ingest failed at stage "${caught.stage}":`, caught.cause ?? caught);

      /*
       * The caller is already authenticated with CRON_SECRET, so the
       * stage and a short error message are safe to return. They show
       * up in cron-job.org's execution history, which makes the next
       * failure diagnosable without opening Vercel logs.
       */
      response.status(mapped.status).json({
        error: {
          code: mapped.code,
          stage: caught.stage,
          message: caught.message,
        },
      });

      return;
    }

    next(caught);
  }
});
