const GDELT_BASE_URL =
  'https://data.gdeltproject.org/gdeltv2';

const FIFTEEN_MINUTES_MS =
  15 * 60 * 1_000;

export function parseExportTimestamp(
  exportUrl: string,
): Date {
  const match =
    /\/(\d{14})\.export\.CSV\.zip$/.exec(
      exportUrl,
    );

  if (match?.[1] === undefined) {
    throw new Error(
      `Invalid GDELT export URL: ${exportUrl}`,
    );
  }

  const stamp = match[1];

  const year = Number(
    stamp.slice(0, 4),
  );

  const month = Number(
    stamp.slice(4, 6),
  );

  const day = Number(
    stamp.slice(6, 8),
  );

  const hour = Number(
    stamp.slice(8, 10),
  );

  const minute = Number(
    stamp.slice(10, 12),
  );

  const second = Number(
    stamp.slice(12, 14),
  );

  return new Date(
    Date.UTC(
      year,
      month - 1,
      day,
      hour,
      minute,
      second,
    ),
  );
}

function formatTimestamp(
  date: Date,
): string {
  const pad = (
    value: number,
  ): string =>
    value
      .toString()
      .padStart(2, '0');

  return [
    date.getUTCFullYear(),

    pad(
      date.getUTCMonth() +
        1,
    ),

    pad(
      date.getUTCDate(),
    ),

    pad(
      date.getUTCHours(),
    ),

    pad(
      date.getUTCMinutes(),
    ),

    pad(
      date.getUTCSeconds(),
    ),
  ].join('');
}

export function createExportUrl(
  date: Date,
): string {
  return `${GDELT_BASE_URL}/${formatTimestamp(date)}.export.CSV.zip`;
}

export function createRecentExportUrls(
  latestUrl: string,
  lookbackHours: number,
): string[] {
  const latest =
    parseExportTimestamp(
      latestUrl,
    );

  const earliest =
    new Date(
      latest.getTime() -
        lookbackHours *
          60 *
          60 *
          1_000,
    );

  const urls: string[] =
    [];

  for (
    let timestamp =
      earliest.getTime();

    timestamp <=
    latest.getTime();

    timestamp +=
    FIFTEEN_MINUTES_MS
  ) {
    urls.push(
      createExportUrl(
        new Date(
          timestamp,
        ),
      ),
    );
  }

  return urls;
}

