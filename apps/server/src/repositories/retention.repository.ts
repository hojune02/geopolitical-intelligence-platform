import {
    db,
} from '../db/postgres.js';

const DELETE_BATCH_SIZE =
  10_000;

export async function countExpiredEvents(
  retentionDays: number,
): Promise<number> {
  const result =
    await db.query<{
      count: string;
    }>(
      `
        SELECT COUNT(*)::text AS count
        FROM gdelt_events
        WHERE added_at <
          NOW() -
          ($1::int * INTERVAL '1 day')
      `,
      [
        retentionDays,
      ],
    );

  return Number(
    result.rows[0]?.count ??
      0,
  );
}

export async function deleteExpiredEvents(
  retentionDays: number,
): Promise<number> {
  let totalDeleted =
    0;

  while (true) {
    const result =
      await db.query(
        `
          WITH doomed AS (
            SELECT id
            FROM gdelt_events
            WHERE added_at <
              NOW() -
              ($1::int * INTERVAL '1 day')
            ORDER BY added_at
            LIMIT $2
          )
          DELETE FROM gdelt_events AS events
          USING doomed
          WHERE events.id =
            doomed.id
          RETURNING events.id
        `,
        [
          retentionDays,
          DELETE_BATCH_SIZE,
        ],
      );

    const deleted =
      result.rowCount ??
      0;

    totalDeleted +=
      deleted;

    if (
      deleted <
      DELETE_BATCH_SIZE
    ) {
      break;
    }
  }

  return totalDeleted;
}