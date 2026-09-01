import { Pool } from 'pg';

import { env } from '../config/env.js';

export const db = new Pool({
  connectionString: env.DATABASE_URL,

  max: 10,

  connectionTimeoutMillis: 5_000,

  idleTimeoutMillis: 30_000,
});

db.on('error', (error: Error) => {
  console.error('Unexpected PostgreSQL pool error:', error);
});

export async function assertDatabaseConnection(): Promise<void> {
  await db.query('SELECT 1');
}

export async function closeDatabase(): Promise<void> {
  await db.end();
}
