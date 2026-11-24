import type { QueryResultRow } from 'pg';

import { db } from '../db/postgres.js';

/*
 * All windows are anchored on the newest ingested event rather than
 * NOW(), so the insights stay meaningful if ingestion pauses.
 */
const ANCHOR_SQL = `(SELECT max(added_at) FROM gdelt_events)`;

export interface RadarRow extends QueryResultRow {
  cc: string;
  r_total: string;
  r_conflict: string;
  r_material: string;
  b_total: string;
  b_conflict: string;
  r_goldstein: number | null;
  b_goldstein: number | null;
  r_tone: number | null;
  r_mentions: string | null;
}

export interface RadarWindow extends QueryResultRow {
  t_end: Date | null;
  t_start: Date | null;
  recent_hours: number | null;
  baseline_hours: number | null;
}

/*
 * The recent window is the last 24h, or a quarter of the available
 * history when less than four days are stored (e.g. right after a
 * reset), so the radar works from the first day of data.
 */
const WINDOW_SQL = `
  WITH bounds AS (
    SELECT
      max(added_at) AS t_end,
      GREATEST(min(added_at), max(added_at) - INTERVAL '14 days') AS t_start
    FROM gdelt_events
  )
  SELECT
    t_end,
    t_start,
    LEAST(INTERVAL '24 hours', (t_end - t_start) / 4) AS recent_len
  FROM bounds
`;

export async function findRadarWindow(): Promise<RadarWindow> {
  const result = await db.query<RadarWindow>(`
    WITH w AS (${WINDOW_SQL})
    SELECT
      t_end,
      t_start,
      EXTRACT(EPOCH FROM recent_len) / 3600 AS recent_hours,
      EXTRACT(EPOCH FROM (t_end - recent_len - t_start)) / 3600 AS baseline_hours
    FROM w
  `);

  return (
    result.rows[0] ?? { t_end: null, t_start: null, recent_hours: null, baseline_hours: null }
  );
}

export async function findRadarRows(): Promise<RadarRow[]> {
  const result = await db.query<RadarRow>(`
    WITH w AS (${WINDOW_SQL}),
    scoped AS (
      SELECT
        e.location_country_code AS cc,
        e.added_at > w.t_end - w.recent_len AS recent,
        e.quad_class,
        e.goldstein_scale,
        e.avg_tone,
        e.num_mentions
      FROM gdelt_events AS e
      CROSS JOIN w
      WHERE
        e.added_at >= w.t_start
        AND e.location_country_code IS NOT NULL
        AND NOT e.listing_source
    )
    SELECT
      cc,
      count(*) FILTER (WHERE recent) AS r_total,
      count(*) FILTER (WHERE recent AND quad_class >= 3) AS r_conflict,
      count(*) FILTER (WHERE recent AND quad_class = 4) AS r_material,
      count(*) FILTER (WHERE NOT recent) AS b_total,
      count(*) FILTER (WHERE NOT recent AND quad_class >= 3) AS b_conflict,
      avg(goldstein_scale) FILTER (WHERE recent) AS r_goldstein,
      avg(goldstein_scale) FILTER (WHERE NOT recent) AS b_goldstein,
      avg(avg_tone) FILTER (WHERE recent) AS r_tone,
      sum(num_mentions) FILTER (WHERE recent) AS r_mentions
    FROM scoped
    GROUP BY cc
  `);

  return result.rows;
}

export interface SparkRow extends QueryResultRow {
  cc: string;
  bucket: number;
  total: string;
  conflict: string;
}

export async function findSparklines(codes: readonly string[], buckets: number): Promise<SparkRow[]> {
  if (codes.length === 0) {
    return [];
  }

  const result = await db.query<SparkRow>(
    `
      WITH w AS (${WINDOW_SQL})
      SELECT
        e.location_country_code AS cc,
        LEAST(
          $2::int,
          width_bucket(
            EXTRACT(EPOCH FROM e.added_at),
            EXTRACT(EPOCH FROM w.t_start),
            EXTRACT(EPOCH FROM w.t_end) + 1,
            $2::int
          )
        ) AS bucket,
        count(*) AS total,
        count(*) FILTER (WHERE e.quad_class >= 3) AS conflict
      FROM gdelt_events AS e
      CROSS JOIN w
      WHERE
        e.added_at >= w.t_start
        AND e.location_country_code = ANY($1::text[])
        AND NOT e.listing_source
      GROUP BY 1, 2
    `,
    [codes, buckets],
  );

  return result.rows;
}

export interface StoryRow extends QueryResultRow {
  source_url: string;
  event_id: string;
  mentions: string;
  articles: string;
  events: string;
  conflict_events: string;
  avg_goldstein: number;
  min_goldstein: number;
  avg_tone: number;
  cc: string | null;
  place: string | null;
  root_code: string;
  actor1: string | null;
  actor2: string | null;
  last_seen: Date;
}

export async function findStories(options: {
  hours: number;
  limit: number;
  countryCode?: string | undefined;
}): Promise<StoryRow[]> {
  const values: (string | number)[] = [options.hours, options.limit];

  let countryFilter = '';

  if (options.countryCode !== undefined) {
    values.push(options.countryCode);
    countryFilter = `AND location_country_code = $3`;
  }

  const result = await db.query<StoryRow>(
    `
      SELECT
        source_url,
        (array_agg(id ORDER BY num_mentions DESC))[1] AS event_id,
        sum(num_mentions) AS mentions,
        sum(num_articles) AS articles,
        count(*) AS events,
        count(*) FILTER (WHERE quad_class >= 3) AS conflict_events,
        avg(goldstein_scale) AS avg_goldstein,
        min(goldstein_scale) AS min_goldstein,
        avg(avg_tone) AS avg_tone,
        mode() WITHIN GROUP (ORDER BY location_country_code) AS cc,
        mode() WITHIN GROUP (ORDER BY location_name) AS place,
        mode() WITHIN GROUP (ORDER BY event_root_code) AS root_code,
        mode() WITHIN GROUP (ORDER BY actor1_name) AS actor1,
        mode() WITHIN GROUP (ORDER BY actor2_name) AS actor2,
        max(added_at) AS last_seen
      FROM gdelt_events
      WHERE
        added_at > ${ANCHOR_SQL} - ($1::int * INTERVAL '1 hour')
        AND source_url IS NOT NULL
        AND NOT listing_source
        ${countryFilter}
      GROUP BY source_url
      ORDER BY sum(num_mentions) DESC
      LIMIT $2
    `,
    values,
  );

  return result.rows;
}

export interface DailyRow extends QueryResultRow {
  day: string;
  verbal_cooperation: string;
  material_cooperation: string;
  verbal_conflict: string;
  material_conflict: string;
  avg_goldstein: number | null;
  avg_tone: number | null;
}

export async function findCountryDaily(countryCode: string): Promise<DailyRow[]> {
  const result = await db.query<DailyRow>(
    `
      SELECT
        to_char(date_trunc('day', added_at AT TIME ZONE 'UTC'), 'YYYY-MM-DD') AS day,
        count(*) FILTER (WHERE quad_class = 1) AS verbal_cooperation,
        count(*) FILTER (WHERE quad_class = 2) AS material_cooperation,
        count(*) FILTER (WHERE quad_class = 3) AS verbal_conflict,
        count(*) FILTER (WHERE quad_class = 4) AS material_conflict,
        avg(goldstein_scale) AS avg_goldstein,
        avg(avg_tone) AS avg_tone
      FROM gdelt_events
      WHERE
        location_country_code = $1
        AND added_at >= ${ANCHOR_SQL} - INTERVAL '14 days'
        AND NOT listing_source
      GROUP BY 1
      ORDER BY 1
    `,
    [countryCode],
  );

  return result.rows;
}

export interface ActionRow extends QueryResultRow {
  root_code: string;
  events: string;
  mentions: string;
}

export async function findCountryActions(countryCode: string): Promise<ActionRow[]> {
  const result = await db.query<ActionRow>(
    `
      SELECT
        event_root_code AS root_code,
        count(*) AS events,
        sum(num_mentions) AS mentions
      FROM gdelt_events
      WHERE
        location_country_code = $1
        AND added_at >= ${ANCHOR_SQL} - INTERVAL '14 days'
        AND NOT listing_source
      GROUP BY 1
      ORDER BY 2 DESC
    `,
    [countryCode],
  );

  return result.rows;
}

export interface CounterpartRow extends QueryResultRow {
  code: string;
  events: string;
  conflict_events: string;
  avg_goldstein: number;
}

/*
 * Actor country codes are CAMEO (mostly ISO-3166 alpha-3), unlike the
 * FIPS location codes; the client maps both to display names.
 */
export async function findCountryCounterparts(countryCode: string): Promise<CounterpartRow[]> {
  const result = await db.query<CounterpartRow>(
    `
      WITH scoped AS (
        SELECT actor1_country_code, actor2_country_code, quad_class, goldstein_scale
        FROM gdelt_events
        WHERE
          location_country_code = $1
          AND added_at >= ${ANCHOR_SQL} - INTERVAL '14 days'
          AND NOT listing_source
      ),
      actors AS (
        SELECT actor1_country_code AS code, quad_class, goldstein_scale FROM scoped
        UNION ALL
        SELECT actor2_country_code AS code, quad_class, goldstein_scale FROM scoped
      )
      SELECT
        code,
        count(*) AS events,
        count(*) FILTER (WHERE quad_class >= 3) AS conflict_events,
        avg(goldstein_scale) AS avg_goldstein
      FROM actors
      WHERE code IS NOT NULL
      GROUP BY code
      ORDER BY count(*) DESC
      LIMIT 12
    `,
    [countryCode],
  );

  return result.rows;
}

export interface ActorRow extends QueryResultRow {
  name: string;
  events: string;
  avg_goldstein: number;
}

export async function findCountryActors(countryCode: string): Promise<ActorRow[]> {
  const result = await db.query<ActorRow>(
    `
      WITH scoped AS (
        SELECT actor1_name, actor2_name, goldstein_scale
        FROM gdelt_events
        WHERE
          location_country_code = $1
          AND added_at >= ${ANCHOR_SQL} - INTERVAL '14 days'
          AND NOT listing_source
      ),
      actors AS (
        SELECT actor1_name AS name, goldstein_scale FROM scoped
        UNION ALL
        SELECT actor2_name AS name, goldstein_scale FROM scoped
      )
      SELECT name, count(*) AS events, avg(goldstein_scale) AS avg_goldstein
      FROM actors
      WHERE name IS NOT NULL
      GROUP BY name
      ORDER BY count(*) DESC
      LIMIT 10
    `,
    [countryCode],
  );

  return result.rows;
}
