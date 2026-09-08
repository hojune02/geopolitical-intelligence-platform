import { env } from '../config/env.js';
import {
  assertDatabaseConnection,
  closeDatabase,
} from '../db/postgres.js';
import {
  runRetentionSweep,
} from '../services/retention.service.js';

async function main(): Promise<void> {
  console.info(
    '[retention] starting one-shot retention sweep',
  );

  await assertDatabaseConnection();

  try {
    await runRetentionSweep(
      env.GDELT_EVENT_RETENTION_DAYS,
      env.GDELT_RETENTION_ENABLED,
    );

    console.info(
      '[retention] sweep completed',
    );
  } finally {
    await closeDatabase();
  }
}

void main().catch(
  (error: unknown) => {
    console.error(
      '[retention] fatal error',
      error,
    );

    process.exitCode = 1;
  },
);