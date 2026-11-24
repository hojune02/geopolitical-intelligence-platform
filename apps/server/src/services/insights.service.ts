import { cacheGet, cacheSet, getEventCacheVersion } from '../cache/redis.js';

import {
  findCountryActions,
  findCountryActors,
  findCountryCounterparts,
  findCountryDaily,
  findRadarRows,
  findRadarWindow,
  findSparklines,
  findStories,
  type RadarRow,
  type StoryRow,
} from '../repositories/insights.repository.js';

const INSIGHTS_TTL_SECONDS = 300;

const SPARK_BUCKETS = 14;

async function cached<T>(name: string, compute: () => Promise<T>): Promise<T> {
  const version = await getEventCacheVersion();

  const key = `api:insights:${name}:v${version}`;

  const hit = await cacheGet(key);

  if (hit !== null) {
    try {
      return JSON.parse(hit) as T;
    } catch {
      // Fall through and recompute a corrupt entry.
    }
  }

  const value = await compute();

  await cacheSet(key, JSON.stringify(value), INSIGHTS_TTL_SECONDS);

  return value;
}

const round = (value: number | null | undefined, digits = 2): number | null =>
  value === null || value === undefined || Number.isNaN(value)
    ? null
    : Math.round(value * 10 ** digits) / 10 ** digits;

/* ----------------------------------------------------------------- radar */

export type RadarStatus = 'escalating' | 'cooling' | 'steady' | 'new';

export interface RadarCountry {
  countryCode: string;
  status: RadarStatus;
  /** Poisson z-score of recent conflict events vs. the baseline expectation. */
  conflictZ: number | null;
  attentionZ: number | null;
  recent: {
    events: number;
    conflictEvents: number;
    materialConflictEvents: number;
    conflictShare: number | null;
    averageGoldstein: number | null;
    averageTone: number | null;
    mentions: number;
  };
  baseline: {
    events: number;
    conflictEvents: number;
    conflictShare: number | null;
    averageGoldstein: number | null;
    expectedConflictEvents: number | null;
  };
  spark?: { total: number; conflict: number }[];
}

export interface RadarPayload {
  window: {
    end: string | null;
    start: string | null;
    recentHours: number;
    baselineHours: number;
  };
  totals: { recentEvents: number; baselineEvents: number; countries: number };
  escalating: RadarCountry[];
  cooling: RadarCountry[];
  mostCovered: RadarCountry[];
  countries: RadarCountry[];
}

function poissonZ(observed: number, expected: number | null): number | null {
  if (expected === null) {
    return null;
  }

  return (observed - expected) / Math.sqrt(expected + 1);
}

/* Ratio with a pseudo-count so tiny baselines cannot produce 50× spikes. */
function shrunkRatio(observed: number, expected: number): number {
  return (observed + 5) / (expected + 5);
}

function scoreRadar(rows: RadarRow[], baselineHours: number): RadarCountry[] {
  const recentAll = rows.reduce((sum, row) => sum + Number(row.r_total), 0);

  const baselineAll = rows.reduce((sum, row) => sum + Number(row.b_total), 0);

  /*
   * Expectation uses each country's share of baseline coverage scaled
   * to the recent window's global volume. This cancels out the news
   * cycle's day/night swings, which a per-hour rate would not.
   */
  const scale = baselineAll > 0 && baselineHours >= 1 ? recentAll / baselineAll : null;

  return rows.map((row) => {
    const rTotal = Number(row.r_total);
    const rConflict = Number(row.r_conflict);
    const bTotal = Number(row.b_total);
    const bConflict = Number(row.b_conflict);

    const expectedConflict = scale === null ? null : bConflict * scale;
    const expectedTotal = scale === null ? null : bTotal * scale;

    const conflictZ = poissonZ(rConflict, expectedConflict);

    let status: RadarStatus = 'steady';

    if (bTotal === 0 && rTotal > 0) {
      status = 'new';
    } else if (expectedConflict !== null) {
      const ratio = shrunkRatio(rConflict, expectedConflict);

      /*
       * Both tests must pass: the z-score says the change is unlikely
       * to be noise, the ratio says it is large relative to the
       * country's own level (z alone always favours big countries).
       */
      if (conflictZ !== null && conflictZ >= 3 && ratio >= 1.5 && rConflict >= 10) {
        status = 'escalating';
      } else if (conflictZ !== null && conflictZ <= -3 && ratio <= 0.67 && expectedConflict >= 10) {
        status = 'cooling';
      }
    }

    return {
      countryCode: row.cc,
      status,
      conflictZ: round(conflictZ),
      attentionZ: round(poissonZ(rTotal, expectedTotal)),
      recent: {
        events: rTotal,
        conflictEvents: rConflict,
        materialConflictEvents: Number(row.r_material),
        conflictShare: rTotal > 0 ? round(rConflict / rTotal, 3) : null,
        averageGoldstein: round(row.r_goldstein),
        averageTone: round(row.r_tone),
        mentions: Number(row.r_mentions ?? 0),
      },
      baseline: {
        events: bTotal,
        conflictEvents: bConflict,
        conflictShare: bTotal > 0 ? round(bConflict / bTotal, 3) : null,
        averageGoldstein: round(row.b_goldstein),
        expectedConflictEvents: round(expectedConflict, 1),
      },
    };
  });
}

function radarRatio(country: RadarCountry): number {
  return shrunkRatio(country.recent.conflictEvents, country.baseline.expectedConflictEvents ?? 0);
}

async function attachSparklines(countries: RadarCountry[]): Promise<void> {
  const codes = [...new Set(countries.map((country) => country.countryCode))];

  const rows = await findSparklines(codes, SPARK_BUCKETS);

  const byCode = new Map<string, { total: number; conflict: number }[]>();

  for (const code of codes) {
    byCode.set(
      code,
      Array.from({ length: SPARK_BUCKETS }, () => ({ total: 0, conflict: 0 })),
    );
  }

  for (const row of rows) {
    const series = byCode.get(row.cc);
    const slot = series?.[Number(row.bucket) - 1];

    if (slot !== undefined) {
      slot.total = Number(row.total);
      slot.conflict = Number(row.conflict);
    }
  }

  for (const country of countries) {
    country.spark = byCode.get(country.countryCode) ?? [];
  }
}

async function computeRadar(): Promise<RadarPayload> {
  const [window, rows] = await Promise.all([findRadarWindow(), findRadarRows()]);

  const recentHours = round(Number(window.recent_hours ?? 0), 1) ?? 0;
  const baselineHours = round(Number(window.baseline_hours ?? 0), 1) ?? 0;

  const scored = scoreRadar(rows, baselineHours).filter(
    (country) => country.recent.events >= 5 || country.baseline.events >= 20,
  );

  const escalating = scored
    .filter((country) => country.status === 'escalating')
    .sort((a, b) => radarRatio(b) - radarRatio(a))
    .slice(0, 8);

  const cooling = scored
    .filter((country) => country.status === 'cooling')
    .sort((a, b) => radarRatio(a) - radarRatio(b))
    .slice(0, 8);

  const mostCovered = [...scored]
    .sort((a, b) => b.recent.mentions - a.recent.mentions)
    .slice(0, 8);

  await attachSparklines([...escalating, ...cooling, ...mostCovered]);

  return {
    window: {
      end: window.t_end === null ? null : new Date(window.t_end).toISOString(),
      start: window.t_start === null ? null : new Date(window.t_start).toISOString(),
      recentHours,
      baselineHours,
    },
    totals: {
      recentEvents: scored.reduce((sum, country) => sum + country.recent.events, 0),
      baselineEvents: scored.reduce((sum, country) => sum + country.baseline.events, 0),
      countries: scored.length,
    },
    escalating,
    cooling,
    mostCovered,
    countries: scored
      .map(({ spark: _spark, ...rest }) => rest)
      .sort((a, b) => b.recent.events - a.recent.events),
  };
}

export function getRadar(): Promise<RadarPayload> {
  return cached('radar', computeRadar);
}

/* --------------------------------------------------------------- stories */

export interface Story {
  headline: string;
  url: string;
  domain: string;
  eventId: string;
  outlets: number;
  mentions: number;
  articles: number;
  events: number;
  conflictShare: number;
  averageGoldstein: number;
  minGoldstein: number;
  averageTone: number;
  countryCode: string | null;
  place: string | null;
  rootCode: string;
  actors: string[];
  lastSeen: string;
}

const STOP_SEGMENTS = new Set(['news', 'national', 'world', 'article', 'story', 'politics']);

/*
 * GDELT stores only the article URL. Most news URLs carry a readable
 * slug, so derive a headline from the most word-like path segment and
 * fall back to the outlet's domain.
 */
export function headlineFromUrl(rawUrl: string): { headline: string; domain: string } {
  let url: URL;

  try {
    url = new URL(rawUrl);
  } catch {
    return { headline: rawUrl, domain: rawUrl };
  }

  const domain = url.hostname.replace(/^www\./, '');

  const candidates = url.pathname
    .split('/')
    .map((segment) => {
      let text = segment;

      try {
        text = decodeURIComponent(segment);
      } catch {
        // keep raw segment
      }

      return text
        .replace(/\.(s?html?|php|aspx?|amp)$/i, '')
        .replace(/^\d+[._-]/, '')
        .replace(/[-_]\d{5,}$/, '')
        .replace(/[-_]?\d{4}[-_]\d{2}[-_]\d{2}$/, '')
        .replace(/[-_+]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    })
    .filter((text) => !STOP_SEGMENTS.has(text.toLowerCase()))
    .filter((text) => text.split(' ').length >= 3 && /[a-z]/i.test(text) && !/^[\d\s]+$/.test(text));

  const best = candidates.sort((a, b) => b.length - a.length)[0];

  if (best === undefined) {
    return { headline: domain, domain };
  }

  const words = best.split(' ').filter((word) => !/^[0-9a-f]{8,}$/i.test(word));

  const sentence = words.join(' ');

  return {
    headline: sentence.charAt(0).toUpperCase() + sentence.slice(1),
    domain,
  };
}

function normaliseHeadline(headline: string): string {
  return headline.toLowerCase().replace(/[^a-z0-9 ]/g, '').trim();
}

/*
 * Newspaper networks (e.g. Newsquest's UK local titles) republish one
 * wire article under the same numeric ID with different slugs.
 */
function syndicationKey(rawUrl: string): string | null {
  const match = /\/(\d{7,})[./-][a-z]/i.exec(rawUrl);
  return match?.[1] === undefined ? null : `id:${match[1]}`;
}

function toStory(row: StoryRow): Story & { key: string } {
  const { headline, domain } = headlineFromUrl(row.source_url);

  const events = Number(row.events);

  return {
    key:
      syndicationKey(row.source_url) ??
      (headline === domain ? row.source_url : normaliseHeadline(headline)),
    headline,
    url: row.source_url,
    domain,
    eventId: row.event_id,
    outlets: 1,
    mentions: Number(row.mentions),
    articles: Number(row.articles),
    events,
    conflictShare: events > 0 ? (round(Number(row.conflict_events) / events, 3) ?? 0) : 0,
    averageGoldstein: round(row.avg_goldstein) ?? 0,
    minGoldstein: round(row.min_goldstein) ?? 0,
    averageTone: round(row.avg_tone) ?? 0,
    countryCode: row.cc,
    place: row.place,
    rootCode: row.root_code,
    actors: [row.actor1, row.actor2].filter((actor): actor is string => actor !== null),
    lastSeen: new Date(row.last_seen).toISOString(),
  };
}

/*
 * Syndicated wire copy (e.g. one PA story on dozens of UK local
 * sites) shows up as many URLs; merge them under one headline.
 */
function mergeSyndicated(rows: StoryRow[], limit: number): Story[] {
  const merged = new Map<string, Story & { key: string }>();

  for (const row of rows) {
    const story = toStory(row);
    const existing = merged.get(story.key);

    if (existing === undefined) {
      merged.set(story.key, story);
      continue;
    }

    existing.outlets += 1;
    existing.mentions += story.mentions;
    existing.articles += story.articles;
    existing.events += story.events;

    if (story.lastSeen > existing.lastSeen) {
      existing.lastSeen = story.lastSeen;
    }
  }

  return [...merged.values()]
    .sort((a, b) => b.mentions - a.mentions)
    .slice(0, limit)
    .map(({ key: _key, ...story }) => story);
}

export interface StoriesQuery {
  hours: number;
  limit: number;
  countryCode?: string | undefined;
}

export function getStories(query: StoriesQuery): Promise<{ data: Story[] }> {
  return cached(`stories:${String(query.hours)}:${String(query.limit)}:${query.countryCode ?? '*'}`, async () => {
    const rows = await findStories({
      hours: query.hours,
      limit: Math.min(150, query.limit * 3),
      countryCode: query.countryCode,
    });

    return { data: mergeSyndicated(rows, query.limit) };
  });
}

/* --------------------------------------------------------------- country */

export interface CountryDossier {
  countryCode: string;
  radar: RadarCountry | null;
  window: RadarPayload['window'];
  daily: {
    day: string;
    verbalCooperation: number;
    materialCooperation: number;
    verbalConflict: number;
    materialConflict: number;
    averageGoldstein: number | null;
    averageTone: number | null;
  }[];
  actions: { rootCode: string; events: number; mentions: number }[];
  counterparts: {
    code: string;
    events: number;
    conflictShare: number;
    averageGoldstein: number;
  }[];
  actors: { name: string; events: number; averageGoldstein: number }[];
  stories: Story[];
}

export function getCountryDossier(countryCode: string): Promise<CountryDossier | null> {
  return cached(`country:${countryCode}`, async () => {
    const [radar, daily, actions, counterparts, actors, stories] = await Promise.all([
      getRadar(),
      findCountryDaily(countryCode),
      findCountryActions(countryCode),
      findCountryCounterparts(countryCode),
      findCountryActors(countryCode),
      getStories({ hours: 72, limit: 8, countryCode }),
    ]);

    if (daily.length === 0) {
      return null;
    }

    return {
      countryCode,
      radar: radar.countries.find((country) => country.countryCode === countryCode) ?? null,
      window: radar.window,
      daily: daily.map((row) => ({
        day: row.day,
        verbalCooperation: Number(row.verbal_cooperation),
        materialCooperation: Number(row.material_cooperation),
        verbalConflict: Number(row.verbal_conflict),
        materialConflict: Number(row.material_conflict),
        averageGoldstein: round(row.avg_goldstein),
        averageTone: round(row.avg_tone),
      })),
      actions: actions.map((row) => ({
        rootCode: row.root_code,
        events: Number(row.events),
        mentions: Number(row.mentions),
      })),
      counterparts: counterparts.map((row) => ({
        code: row.code,
        events: Number(row.events),
        conflictShare:
          Number(row.events) > 0
            ? (round(Number(row.conflict_events) / Number(row.events), 3) ?? 0)
            : 0,
        averageGoldstein: round(row.avg_goldstein) ?? 0,
      })),
      actors: actors.map((row) => ({
        name: row.name,
        events: Number(row.events),
        averageGoldstein: round(row.avg_goldstein) ?? 0,
      })),
      stories: stories.data,
    };
  });
}
