import { closeRedis, connectRedis } from '../cache/redis.js';

import { closeDatabase } from '../db/postgres.js';

import { ingestLatestGdeltBatch } from '../services/gdelt/gdelt-ingestion.service.js';

async function main(): Promise<void> {
  await connectRedis();

  const result = await ingestLatestGdeltBatch();

  console.log(JSON.stringify(result, null, 2));
}

try {
  await main();
} catch (error: unknown) {
  console.error('GDELT ingestion failed:', error);

  process.exitCode = 1;
} finally {
  await closeRedis();
  await closeDatabase();
}
