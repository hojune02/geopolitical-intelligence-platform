import { readFile } from 'node:fs/promises';

import { db, closeDatabase } from '../db/postgres.js';

const migrations = [
  {
    version: '001_init',
    file: new URL('../../sql/001_init.sql', import.meta.url),
  },
] as const;

async function ensureMigrationTable(): Promise<void> {
  await db.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
}

async function runMigrations(): Promise<void> {
  await ensureMigrationTable();

  for (const migration of migrations) {
    const existing = await db.query(
      `
        SELECT version
        FROM schema_migrations
        WHERE version = $1
      `,
      [migration.version],
    );

    if (existing.rows.length > 0) {
      console.log(`Skipping migration ${migration.version}: already applied`);

      continue;
    }

    const sql = await readFile(migration.file, 'utf8');

    const client = await db.connect();

    try {
      await client.query('BEGIN');

      await client.query(sql);

      await client.query(
        `
          INSERT INTO schema_migrations (version)
          VALUES ($1)
        `,
        [migration.version],
      );

      await client.query('COMMIT');

      console.log(`Applied migration ${migration.version}`);
    } catch (error: unknown) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}

try {
  await runMigrations();
} catch (error: unknown) {
  console.error('Migration failed:', error);
  process.exitCode = 1;
} finally {
  await closeDatabase();
}
