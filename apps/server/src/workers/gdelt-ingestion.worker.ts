import { setTimeout as sleep } from 'node:timers/promises';

import { env } from '../config/env.js';

import { assertDatabaseConnection, closeDatabase } from '../db/postgres.js';

import { runGdeltIngestionCycle } from '../services/gdelt/gdelt-ingestion.service.js';

import { runRetentionSweep } from '../services/retention.service.js';

const controller = new AbortController();

function shutdown(): void {
  controller.abort();
}

process.on('SIGINT', shutdown);

process.on('SIGTERM', shutdown);

async function main(): Promise<void> {
  await assertDatabaseConnection();

  let lastRetentionDate: string | null = null;

  while (!controller.signal.aborted) {
    try {
      await runGdeltIngestionCycle(env.GDELT_WORKER_LOOKBACK_HOURS);
    } catch (caught: unknown) {
      console.error('[gdelt-worker] cycle failed', caught);
    }

    const today = new Date().toISOString().slice(0, 10);

    if (today !== lastRetentionDate) {
      try {
        await runRetentionSweep(
          env.GDELT_EVENT_RETENTION_DAYS,

          env.GDELT_RETENTION_ENABLED,
        );

        lastRetentionDate = today;
      } catch (caught: unknown) {
        console.error('[retention] sweep failed', caught);
      }
    }

    try {
      await sleep(
        env.GDELT_WORKER_POLL_SECONDS * 1_000,

        undefined,

        {
          signal: controller.signal,
        },
      );
    } catch {
      // AbortSignal stops sleep
      // during graceful shutdown.
    }
  }

  await closeDatabase();
}

void main();
