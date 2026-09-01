import type { PoolClient, QueryResultRow } from 'pg';

import { db } from '../db/postgres.js';

import type { GdeltEvent } from '../schemas/gdelt-event.schema.js';

import type { GdeltParseResult } from '../services/gdelt/gdelt-parser.js';

type SqlValue = string | number | boolean | null;

interface BatchRow extends QueryResultRow {
  export_url: string;
}

const UPSERT_EVENT_SQL = `
  INSERT INTO gdelt_events (
    id,

    event_date,
    added_at,

    actor1_code,
    actor1_name,
    actor1_country_code,

    actor2_code,
    actor2_name,
    actor2_country_code,

    event_code,
    event_base_code,
    event_root_code,

    quad_class,
    goldstein_scale,

    is_root_event,

    num_mentions,
    num_sources,
    num_articles,
    avg_tone,

    location_name,
    location_country_code,
    latitude,
    longitude,

    source_url
  )
  VALUES (
    $1,  $2,  $3,
    $4,  $5,  $6,
    $7,  $8,  $9,
    $10, $11, $12,
    $13, $14,
    $15,
    $16, $17, $18, $19,
    $20, $21, $22, $23,
    $24
  )
  ON CONFLICT (id)
  DO UPDATE SET
    event_date = EXCLUDED.event_date,
    added_at = EXCLUDED.added_at,

    actor1_code = EXCLUDED.actor1_code,
    actor1_name = EXCLUDED.actor1_name,
    actor1_country_code = EXCLUDED.actor1_country_code,

    actor2_code = EXCLUDED.actor2_code,
    actor2_name = EXCLUDED.actor2_name,
    actor2_country_code = EXCLUDED.actor2_country_code,

    event_code = EXCLUDED.event_code,
    event_base_code = EXCLUDED.event_base_code,
    event_root_code = EXCLUDED.event_root_code,

    quad_class = EXCLUDED.quad_class,
    goldstein_scale = EXCLUDED.goldstein_scale,

    is_root_event = EXCLUDED.is_root_event,

    num_mentions = EXCLUDED.num_mentions,
    num_sources = EXCLUDED.num_sources,
    num_articles = EXCLUDED.num_articles,
    avg_tone = EXCLUDED.avg_tone,

    location_name = EXCLUDED.location_name,
    location_country_code =
      EXCLUDED.location_country_code,

    latitude = EXCLUDED.latitude,
    longitude = EXCLUDED.longitude,

    source_url = EXCLUDED.source_url,

    updated_at = NOW()
`;

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

async function upsertEvent(client: PoolClient, event: GdeltEvent): Promise<void> {
  await client.query(UPSERT_EVENT_SQL, eventToSqlValues(event));
}

export async function isBatchIngested(exportUrl: string): Promise<boolean> {
  const result = await db.query(
    `
      SELECT export_url
      FROM ingestion_batches
      WHERE
        export_url = $1
        AND status = 'completed'
    `,
    [exportUrl],
  );

  return result.rows.length > 0;
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

    for (const event of parsed.events) {
      await upsertEvent(client, event);
    }

    await client.query(
      `
        UPDATE ingestion_batches
        SET
          status = 'completed',
          persisted_events = $2,
          ingested_at = NOW()
        WHERE export_url = $1
      `,
      [exportUrl, parsed.events.length],
    );

    await client.query('COMMIT');

    return {
      skipped: false,
      upsertedEvents: parsed.events.length,
    };
  } catch (error: unknown) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
