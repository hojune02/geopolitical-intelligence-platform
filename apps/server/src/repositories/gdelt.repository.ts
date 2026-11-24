import type { PoolClient, QueryResultRow } from 'pg';

import { db } from '../db/postgres.js';

import type { GdeltEvent } from '../schemas/gdelt-event.schema.js';

import type { GdeltParseResult } from '../services/gdelt/gdelt-parser.js';

type SqlValue = string | number | boolean | null;

interface BatchRow extends QueryResultRow {
  export_url: string;
}

/*
 * Column name and PostgreSQL array type, in insert order.
 * The order must match eventToSqlValues().
 */
const EVENT_COLUMNS = [
  ['id', 'text[]'],

  ['event_date', 'date[]'],
  ['added_at', 'timestamptz[]'],

  ['actor1_code', 'text[]'],
  ['actor1_name', 'text[]'],
  ['actor1_country_code', 'text[]'],

  ['actor2_code', 'text[]'],
  ['actor2_name', 'text[]'],
  ['actor2_country_code', 'text[]'],

  ['event_code', 'text[]'],
  ['event_base_code', 'text[]'],
  ['event_root_code', 'text[]'],

  ['quad_class', 'smallint[]'],
  ['goldstein_scale', 'float8[]'],

  ['is_root_event', 'boolean[]'],

  ['num_mentions', 'int[]'],
  ['num_sources', 'int[]'],
  ['num_articles', 'int[]'],
  ['avg_tone', 'float8[]'],

  ['location_name', 'text[]'],
  ['location_country_code', 'text[]'],
  ['latitude', 'float8[]'],
  ['longitude', 'float8[]'],

  ['source_url', 'text[]'],
] as const;

const COLUMN_NAMES = EVENT_COLUMNS.map(([name]) => name);

const UNNEST_ARGUMENTS = EVENT_COLUMNS.map(
  ([, arrayType], index) => `$${String(index + 1)}::${arrayType}`,
);

const UPDATE_ASSIGNMENTS = COLUMN_NAMES.filter((name) => name !== 'id')
  .map((name) => `${name} = EXCLUDED.${name}`)
  .concat('updated_at = NOW()');

/*
 * One statement per chunk instead of one round trip per event.
 * A GDELT export holds ~1-2k events, and per-row upserts against
 * a remote (serverless) database cost several seconds per batch,
 * which is what pushed the cron request past its time limits.
 */
const BULK_UPSERT_EVENTS_SQL = `
  INSERT INTO gdelt_events (
    ${COLUMN_NAMES.join(',\n    ')}
  )
  SELECT *
  FROM unnest(
    ${UNNEST_ARGUMENTS.join(',\n    ')}
  )
  ON CONFLICT (id)
  DO UPDATE SET
    ${UPDATE_ASSIGNMENTS.join(',\n    ')}
`;

const UPSERT_CHUNK_SIZE = 1_000;

function eventToSqlValues(event: GdeltEvent): SqlValue[] {
  return [
    event.id,

    event.eventDate,
    event.addedAt,

    event.actors.source.code,
    event.actors.source.name,
    event.actors.source.countryCode,

    event.actors.target.code,
    event.actors.target.name,
    event.actors.target.countryCode,

    event.action.code,
    event.action.baseCode,
    event.action.rootCode,

    event.action.quadClass.code,
    event.action.goldsteinScale,

    event.isRootEvent,

    event.metrics.mentions,
    event.metrics.sources,
    event.metrics.articles,
    event.metrics.averageTone,

    event.location?.name ?? null,
    event.location?.countryCode ?? null,
    event.location?.latitude ?? null,
    event.location?.longitude ?? null,

    event.sourceUrl,
  ];
}

/*
 * ON CONFLICT DO UPDATE cannot affect the same row twice in one
 * statement, so duplicate IDs inside an export are collapsed first.
 * The last occurrence wins, matching the old row-by-row behaviour.
 */
function dedupeEvents(events: readonly GdeltEvent[]): GdeltEvent[] {
  const byId = new Map<string, GdeltEvent>();

  for (const event of events) {
    byId.set(event.id, event);
  }

  return [...byId.values()];
}

async function upsertEvents(client: PoolClient, events: readonly GdeltEvent[]): Promise<number> {
  const unique = dedupeEvents(events);

  for (let offset = 0; offset < unique.length; offset += UPSERT_CHUNK_SIZE) {
    const chunk = unique.slice(offset, offset + UPSERT_CHUNK_SIZE);

    const columns: SqlValue[][] = EVENT_COLUMNS.map(() => []);

    for (const event of chunk) {
      eventToSqlValues(event).forEach((value, index) => {
        columns[index]?.push(value);
      });
    }

    await client.query(BULK_UPSERT_EVENTS_SQL, columns);
  }

  return unique.length;
}

export async function isBatchIngested(exportUrl: string): Promise<boolean> {
  const completed = await getCompletedBatchUrls([exportUrl]);

  return completed.has(exportUrl);
}

/*
 * Resolves the completion state of many candidate exports in a
 * single round trip (a 24h lookback checks ~97 URLs per run).
 */
export async function getCompletedBatchUrls(exportUrls: readonly string[]): Promise<Set<string>> {
  if (exportUrls.length === 0) {
    return new Set();
  }

  const result = await db.query<BatchRow>(
    `
      SELECT export_url
      FROM ingestion_batches
      WHERE
        export_url = ANY($1::text[])
        AND status = 'completed'
    `,
    [exportUrls],
  );

  return new Set(result.rows.map((row) => row.export_url));
}

export interface PersistBatchResult {
  skipped: boolean;
  upsertedEvents: number;
}

export async function persistGdeltBatch(
  exportUrl: string,
  parsed: GdeltParseResult,
): Promise<PersistBatchResult> {
  const client = await db.connect();

  try {
    await client.query('BEGIN');

    const claim = await client.query<BatchRow>(
      `
          INSERT INTO ingestion_batches (
            export_url,
            status,
            total_rows,
            accepted_rows,
            rejected_rows,
            persisted_events
          )
          VALUES (
            $1,
            'processing',
            $2,
            $3,
            $4,
            0
          )
          ON CONFLICT DO NOTHING
          RETURNING export_url
        `,
      [exportUrl, parsed.totalRows, parsed.events.length, parsed.rejectedRows],
    );

    if (claim.rows.length === 0) {
      await client.query('ROLLBACK');

      return {
        skipped: true,
        upsertedEvents: 0,
      };
    }

    const upserted = await upsertEvents(client, parsed.events);

    await client.query(
      `
        UPDATE ingestion_batches
        SET
          status = 'completed',
          persisted_events = $2,
          ingested_at = NOW()
        WHERE export_url = $1
      `,
      [exportUrl, upserted],
    );

    await client.query('COMMIT');

    return {
      skipped: false,
      upsertedEvents: upserted,
    };
  } catch (error: unknown) {
    await client.query('ROLLBACK').catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}
