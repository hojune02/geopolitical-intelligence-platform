import type { QueryResultRow } from 'pg';

import { db } from '../db/postgres.js';

import {
  eventPageSchema,
  trendsPayloadSchema,
  type EventPage,
  type EventQuery,
  type TrendQuery,
  type TrendsPayload,
} from '../schemas/event-query.schema.js';

import { gdeltEventSchema, type GdeltEvent } from '../schemas/gdelt-event.schema.js';

type SqlValue = string | number | boolean;

interface EventRow extends QueryResultRow {
  id: string;

  event_date: Date | string;

  added_at: Date | string;

  actor1_code: string | null;

  actor1_name: string | null;

  actor1_country_code: string | null;

  actor2_code: string | null;

  actor2_name: string | null;

  actor2_country_code: string | null;

  event_code: string;

  event_base_code: string;

  event_root_code: string;

  quad_class: number;

  goldstein_scale: number;

  is_root_event: boolean;

  num_mentions: number;

  num_sources: number;

  num_articles: number;

  avg_tone: number;

  location_name: string | null;

  location_country_code: string | null;

  latitude: number | null;

  longitude: number | null;

  source_url: string | null;
}

interface CountRow extends QueryResultRow {
  total: number;
}

interface TrendRow extends QueryResultRow {
  bucket: string;

  event_count: number;

  conflict_events: number;

  average_goldstein: number | null;

  average_tone: number | null;
}

function addValue(values: SqlValue[], value: SqlValue): string {
  values.push(value);

  return `$${String(values.length)}`;
}

function toIsoString(value: Date | string): string {
  if (value instanceof Date) {
    return value.toISOString();
  }

  return new Date(value).toISOString();
}

function toIsoDateString(value: Date | string): string {
  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }

  return value.slice(0, 10);
}

function mapEventRow(row: EventRow): GdeltEvent {
  const latitude = row.latitude;

  const longitude = row.longitude;

  const location =
    latitude === null || longitude === null
      ? null
      : {
          name: row.location_name,

          countryCode: row.location_country_code,

          latitude,
          longitude,
        };

  return gdeltEventSchema.parse({
    id: row.id,

    eventDate: toIsoDateString(row.event_date),
    addedAt: toIsoString(row.added_at),

    actors: {
      source: {
        code: row.actor1_code,

        name: row.actor1_name,

        countryCode: row.actor1_country_code,
      },

      target: {
        code: row.actor2_code,

        name: row.actor2_name,

        countryCode: row.actor2_country_code,
      },
    },

    action: {
      code: row.event_code,

      baseCode: row.event_base_code,

      rootCode: row.event_root_code,

      quadClass: {
        code: row.quad_class,

        label:
          row.quad_class === 1
            ? 'verbal_cooperation'
            : row.quad_class === 2
              ? 'material_cooperation'
              : row.quad_class === 3
                ? 'verbal_conflict'
                : 'material_conflict',
      },

      goldsteinScale: row.goldstein_scale,
    },

    isRootEvent: row.is_root_event,

    metrics: {
      mentions: row.num_mentions,

      sources: row.num_sources,

      articles: row.num_articles,

      averageTone: row.avg_tone,
    },

    location,

    sourceUrl: row.source_url,
  });
}

function buildEventWhere(query: EventQuery): {
  sql: string;
  values: SqlValue[];
} {
  const conditions: string[] = [];

  const values: SqlValue[] = [];

  if (query.startDate !== undefined) {
    const parameter = addValue(values, query.startDate);

    conditions.push(`event_date >= ${parameter}::date`);
  }

  if (query.endDate !== undefined) {
    const parameter = addValue(values, query.endDate);

    conditions.push(`event_date <= ${parameter}::date`);
  }

  if (query.countryCode !== undefined) {
    const parameter = addValue(values, query.countryCode);

    conditions.push(`location_country_code = ${parameter}`);
  }

  if (query.quadClass !== undefined) {
    const parameter = addValue(values, query.quadClass);

    conditions.push(`quad_class = ${parameter}`);
  }

  if (query.minGoldstein !== undefined) {
    const parameter = addValue(values, query.minGoldstein);

    conditions.push(`goldstein_scale >= ${parameter}`);
  }

  if (query.maxGoldstein !== undefined) {
    const parameter = addValue(values, query.maxGoldstein);

    conditions.push(`goldstein_scale <= ${parameter}`);
  }

  if (query.isRootEvent !== undefined) {
    const parameter = addValue(values, query.isRootEvent);

    conditions.push(`is_root_event = ${parameter}`);
  }

  if (query.actor !== undefined) {
    const pattern = `%${query.actor}%`;

    const parameter = addValue(values, pattern);

    conditions.push(`
      (
        actor1_name ILIKE ${parameter}
        OR actor2_name ILIKE ${parameter}
        OR actor1_code ILIKE ${parameter}
        OR actor2_code ILIKE ${parameter}
      )
    `);
  }

  if (
    query.north !== undefined &&
    query.south !== undefined &&
    query.east !== undefined &&
    query.west !== undefined
  ) {
    const south = addValue(values, query.south);

    const north = addValue(values, query.north);

    conditions.push(`latitude BETWEEN ${south} AND ${north}`);

    if (query.west <= query.east) {
      const west = addValue(values, query.west);

      const east = addValue(values, query.east);

      conditions.push(`longitude BETWEEN ${west} AND ${east}`);
    } else {
      /*
       * Map crosses the international
       * date line.
       *
       * Example:
       * west = 170
       * east = -170
       */
      const west = addValue(values, query.west);

      const east = addValue(values, query.east);

      conditions.push(
        `(
          longitude >= ${west}
          OR longitude <= ${east}
        )`,
      );
    }
  }

  if (conditions.length === 0) {
    return {
      sql: '',
      values,
    };
  }

  return {
    sql: `WHERE ${conditions.join(' AND ')}`,

    values,
  };
}

export async function findEvents(query: EventQuery): Promise<EventPage> {
  const { sql: whereSql, values } = buildEventWhere(query);

  const countResult = await db.query<CountRow>(
    `
        SELECT
          COUNT(*)::int AS total
        FROM gdelt_events
        ${whereSql}
      `,
    values,
  );

  const total = countResult.rows[0]?.total ?? 0;

  const offset = (query.page - 1) * query.limit;

  const pageValues: SqlValue[] = [...values];

  const limitParameter = addValue(pageValues, query.limit);

  const offsetParameter = addValue(pageValues, offset);

  const result = await db.query<EventRow>(
    `
        SELECT
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

        FROM gdelt_events

        ${whereSql}

        ORDER BY
          event_date DESC,
          added_at DESC,
          id DESC

        LIMIT ${limitParameter}

        OFFSET ${offsetParameter}
      `,
    pageValues,
  );

  const data = result.rows.map(mapEventRow);

  return eventPageSchema.parse({
    data,

    meta: {
      page: query.page,

      limit: query.limit,

      total,

      totalPages: Math.ceil(total / query.limit),
    },
  });
}

function buildTrendWhere(query: TrendQuery): {
  sql: string;
  values: SqlValue[];
} {
  const conditions: string[] = [];

  const values: SqlValue[] = [];

  if (query.startDate !== undefined) {
    const parameter = addValue(values, query.startDate);

    conditions.push(`event_date >= ${parameter}::date`);
  }

  if (query.endDate !== undefined) {
    const parameter = addValue(values, query.endDate);

    conditions.push(`event_date <= ${parameter}::date`);
  }

  if (query.countryCode !== undefined) {
    const parameter = addValue(values, query.countryCode);

    conditions.push(`location_country_code = ${parameter}`);
  }

  if (query.quadClass !== undefined) {
    const parameter = addValue(values, query.quadClass);

    conditions.push(`quad_class = ${parameter}`);
  }

  return {
    sql: conditions.length === 0 ? '' : `WHERE ${conditions.join(' AND ')}`,

    values,
  };
}

export async function findTrends(query: TrendQuery): Promise<TrendsPayload> {
  const { sql: whereSql, values } = buildTrendWhere(query);

  /*
   * `bucket` is safe to interpolate because
   * Zod restricted it to exactly:
   *
   * "day" | "week"
   */
  const result = await db.query<TrendRow>(
    `
        SELECT
          (
            date_trunc(
              '${query.bucket}',
              event_date::timestamp
            )::date
          )::text
            AS bucket,

          COUNT(*)::int
            AS event_count,

          SUM(
            CASE
              WHEN quad_class IN (3, 4)
                THEN 1
              ELSE 0
            END
          )::int
            AS conflict_events,

          AVG(
            goldstein_scale
          )::double precision
            AS average_goldstein,

          AVG(
            avg_tone
          )::double precision
            AS average_tone

        FROM gdelt_events

        ${whereSql}

        GROUP BY 1

        ORDER BY 1 ASC
      `,
    values,
  );

  return trendsPayloadSchema.parse({
    data: result.rows.map((row) => ({
      bucket: row.bucket,

      eventCount: row.event_count,

      conflictEvents: row.conflict_events,

      averageGoldstein: row.average_goldstein,

      averageTone: row.average_tone,
    })),
  });
}
