import type { QueryResultRow } from 'pg';

import { db } from '../db/postgres.js';

import {
  mapEventPayloadSchema,
  type MapEventPayload,
  type MapEventQuery,
} from '../schemas/map-event.schema.js';

type SqlValue = string | number | boolean;

interface MapEventRow extends QueryResultRow {
  id: string;

  event_date: string;

  latitude: number;

  longitude: number;

  goldstein_scale: number;

  quad_class: number;

  actor1_name: string | null;

  actor2_name: string | null;

  location_name: string | null;
}

function addValue(values: SqlValue[], value: SqlValue): string {
  values.push(value);

  return `$${String(values.length)}`;
}

export async function findMapEvents(query: MapEventQuery): Promise<MapEventPayload> {
  const conditions: string[] = ['latitude IS NOT NULL', 'longitude IS NOT NULL'];

  const values: SqlValue[] = [];

  const south = addValue(values, query.south);

  const north = addValue(values, query.north);

  conditions.push(`latitude BETWEEN ${south} AND ${north}`);

  /*
   * Normal bounding box:
   *
   * west = -20
   * east = 50
   */
  if (query.west <= query.east) {
    const west = addValue(values, query.west);

    const east = addValue(values, query.east);

    conditions.push(`longitude BETWEEN ${west} AND ${east}`);
  } else {
    /*
     * Date-line crossing:
     *
     * west = 170
     * east = -170
     */
    const west = addValue(values, query.west);

    const east = addValue(values, query.east);

    conditions.push(`
        (
          longitude >= ${west}
          OR longitude <= ${east}
        )
      `);
  }

  if (query.startDate !== undefined) {
    const value = addValue(values, query.startDate);

    conditions.push(`event_date >= ${value}::date`);
  }

  if (query.endDate !== undefined) {
    const value = addValue(values, query.endDate);

    conditions.push(`event_date <= ${value}::date`);
  }

  if (query.minGoldstein !== undefined) {
    const value = addValue(values, query.minGoldstein);

    conditions.push(`goldstein_scale >= ${value}`);
  }

  if (query.maxGoldstein !== undefined) {
    const value = addValue(values, query.maxGoldstein);

    conditions.push(`goldstein_scale <= ${value}`);
  }

  if (query.isRootEvent !== undefined) {
    const value = addValue(values, query.isRootEvent);

    conditions.push(`is_root_event = ${value}`);
  }

  /*
   * Request one extra row.
   *
   * If limit=5000 and we
   * receive 5001 rows,
   * we know the result was
   * truncated without doing
   * a separate COUNT(*).
   */
  const fetchLimit = query.limit + 1;

  const limitParameter = addValue(values, fetchLimit);

  const result = await db.query<MapEventRow>(
    `
          SELECT
            id,
  
            event_date::text
              AS event_date,
  
            latitude,
            longitude,
  
            goldstein_scale,
            quad_class,
  
            actor1_name,
            actor2_name,
            location_name
  
          FROM gdelt_events
  
          WHERE
            ${conditions.join(' AND ')}
  
          ORDER BY
            added_at DESC,
            id DESC
  
          LIMIT ${limitParameter}
        `,
    values,
  );

  const truncated = result.rows.length > query.limit;

  const rows = truncated ? result.rows.slice(0, query.limit) : result.rows;

  return mapEventPayloadSchema.parse({
    data: rows.map((row) => ({
      id: row.id,

      eventDate: row.event_date,

      latitude: row.latitude,

      longitude: row.longitude,

      goldsteinScale: row.goldstein_scale,

      quadClass: row.quad_class,

      actor1Name: row.actor1_name,

      actor2Name: row.actor2_name,

      locationName: row.location_name,
    })),

    meta: {
      count: rows.length,

      limit: query.limit,

      truncated,
    },
  });
}
