import { z } from 'zod';
import { gdeltEventSchema, type GdeltEvent } from '../../schemas/gdelt-event.schema.js';
import { GDELT_COLUMNS, GDELT_EXPECTED_COLUMN_COUNT } from './gdelt-columns.js';

function nullableString(value: string | undefined): string | null {
  if (value === undefined) {
    return null;
  }

  const trimmed = value.trim();

  return trimmed.length === 0 ? null : trimmed;
}

function requiredString(value: string | undefined, fieldName: string): string {
  const result = nullableString(value);

  if (result === null) {
    throw new Error(`Missing required GDELT field: ${fieldName}`);
  }

  return result;
}

function requiredNumber(value: string | undefined, fieldName: string): number {
  const raw = requiredString(value, fieldName);
  const parsed = Number(raw);

  if (!Number.isFinite(parsed)) {
    throw new Error(`Invalid numeric GDELT field: ${fieldName}`);
  }

  return parsed;
}

function requiredInteger(value: string | undefined, fieldName: string): number {
  const parsed = requiredNumber(value, fieldName);

  if (!Number.isInteger(parsed)) {
    throw new Error(`Invalid integer GDELT field: ${fieldName}`);
  }

  return parsed;
}

function parseGdeltDate(value: string | undefined): string {
  const raw = requiredString(value, 'SQLDATE');

  if (!/^\d{8}$/.test(raw)) {
    throw new Error('Invalid GDELT SQLDATE');
  }

  const year = raw.slice(0, 4);
  const month = raw.slice(4, 6);
  const day = raw.slice(6, 8);

  return `${year}-${month}-${day}`;
}

function parseGdeltTimestamp(value: string | undefined): string {
  const raw = requiredString(value, 'DATEADDED');

  if (!/^\d{14}$/.test(raw)) {
    throw new Error('Invalid GDELT DATEADDED');
  }

  const year = raw.slice(0, 4);
  const month = raw.slice(4, 6);
  const day = raw.slice(6, 8);

  const hour = raw.slice(8, 10);
  const minute = raw.slice(10, 12);
  const second = raw.slice(12, 14);

  const timestamp = `${year}-${month}-${day}` + `T${hour}:${minute}:${second}Z`;

  if (Number.isNaN(Date.parse(timestamp))) {
    throw new Error('Invalid GDELT timestamp');
  }

  return timestamp;
}

function getQuadClassLabel(
  quadClass: number,
): 'verbal_cooperation' | 'material_cooperation' | 'verbal_conflict' | 'material_conflict' {
  switch (quadClass) {
    case 1:
      return 'verbal_cooperation';

    case 2:
      return 'material_cooperation';

    case 3:
      return 'verbal_conflict';

    case 4:
      return 'material_conflict';

    default:
      throw new Error(`Unknown GDELT QuadClass: ${String(quadClass)}`);
  }
}

function parseSourceUrl(value: string | undefined): string | null {
  const raw = nullableString(value);

  if (raw === null) {
    return null;
  }

  const result = z.url().safeParse(raw);

  return result.success ? result.data : null;
}

function parseLocation(fields: string[]) {
  const latRaw = nullableString(fields[GDELT_COLUMNS.actionGeoLat]);

  const longRaw = nullableString(fields[GDELT_COLUMNS.actionGeoLong]);

  if (latRaw === null || longRaw === null) {
    return null;
  }

  const latitude = Number(latRaw);
  const longitude = Number(longRaw);

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return null;
  }

  return {
    name: nullableString(fields[GDELT_COLUMNS.actionGeoFullName]),

    countryCode: nullableString(fields[GDELT_COLUMNS.actionGeoCountryCode]),

    latitude,
    longitude,
  };
}

function normalizeRow(fields: string[]): GdeltEvent {
  const quadClass = requiredInteger(fields[GDELT_COLUMNS.quadClass], 'QuadClass');

  const candidate = {
    id: requiredString(fields[GDELT_COLUMNS.globalEventId], 'GlobalEventID'),

    eventDate: parseGdeltDate(fields[GDELT_COLUMNS.sqlDate]),

    addedAt: parseGdeltTimestamp(fields[GDELT_COLUMNS.dateAdded]),

    actors: {
      source: {
        code: nullableString(fields[GDELT_COLUMNS.actor1Code]),

        name: nullableString(fields[GDELT_COLUMNS.actor1Name]),

        countryCode: nullableString(fields[GDELT_COLUMNS.actor1CountryCode]),
      },

      target: {
        code: nullableString(fields[GDELT_COLUMNS.actor2Code]),

        name: nullableString(fields[GDELT_COLUMNS.actor2Name]),

        countryCode: nullableString(fields[GDELT_COLUMNS.actor2CountryCode]),
      },
    },

    action: {
      code: requiredString(fields[GDELT_COLUMNS.eventCode], 'EventCode'),

      baseCode: requiredString(fields[GDELT_COLUMNS.eventBaseCode], 'EventBaseCode'),

      rootCode: requiredString(fields[GDELT_COLUMNS.eventRootCode], 'EventRootCode'),

      quadClass: {
        code: quadClass,
        label: getQuadClassLabel(quadClass),
      },

      goldsteinScale: requiredNumber(fields[GDELT_COLUMNS.goldsteinScale], 'GoldsteinScale'),
    },

    isRootEvent: requiredInteger(fields[GDELT_COLUMNS.isRootEvent], 'IsRootEvent') === 1,

    metrics: {
      mentions: requiredInteger(fields[GDELT_COLUMNS.numMentions], 'NumMentions'),

      sources: requiredInteger(fields[GDELT_COLUMNS.numSources], 'NumSources'),

      articles: requiredInteger(fields[GDELT_COLUMNS.numArticles], 'NumArticles'),

      averageTone: requiredNumber(fields[GDELT_COLUMNS.avgTone], 'AvgTone'),
    },

    location: parseLocation(fields),

    sourceUrl: parseSourceUrl(fields[GDELT_COLUMNS.sourceUrl]),
  };

  return gdeltEventSchema.parse(candidate);
}

export interface GdeltParseResult {
  events: GdeltEvent[];
  totalRows: number;
  rejectedRows: number;
}

export function parseGdeltExport(contents: string): GdeltParseResult {
  const lines = contents.split(/\r?\n/).filter((line) => line.trim().length > 0);

  const events: GdeltEvent[] = [];

  let rejectedRows = 0;

  for (const line of lines) {
    const fields = line.split('\t');

    if (fields.length < GDELT_EXPECTED_COLUMN_COUNT) {
      rejectedRows += 1;
      continue;
    }

    try {
      events.push(normalizeRow(fields));
    } catch {
      rejectedRows += 1;
    }
  }

  return {
    events,
    totalRows: lines.length,
    rejectedRows,
  };
}
