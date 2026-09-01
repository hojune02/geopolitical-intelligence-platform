import { app } from './app.js';

import { connectRedis } from './cache/redis.js';

import { env } from './config/env.js';

import { assertDatabaseConnection } from './db/postgres.js';

async function start(): Promise<void> {
  await assertDatabaseConnection();

  console.log('PostgreSQL connected');

  try {
    await connectRedis();

    console.log('Redis connected');
  } catch (error: unknown) {
    /*
     * Redis is a cache, not our
     * source of truth.
     */
    console.error('Redis unavailable; continuing without cache:', error);
  }

  app.listen(env.PORT, () => {
    console.log(`API listening on http://localhost:${String(env.PORT)}`);
  });
}

try {
  await start();
} catch (error: unknown) {
  console.error('Server startup failed:', error);

  process.exitCode = 1;
}
