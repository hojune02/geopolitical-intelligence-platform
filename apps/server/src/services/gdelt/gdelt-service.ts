import { strFromU8, unzipSync } from 'fflate';
import { z } from 'zod';

import { env } from '../../config/env.js';
import { parseGdeltExport } from './gdelt-parser.js';

async function fetchText(url: string): Promise<string> {
  const response = await fetch(url, {
    signal: AbortSignal.timeout(15_000),
  });

  if (!response.ok) {
    throw new Error(`GDELT request failed with status ${String(response.status)}`);
  }

  return response.text();
}

function getExportUrl(manifest: string): string {
  const exportLine = manifest.split(/\r?\n/).find((line) => line.includes('.export.CSV.zip'));

  if (exportLine === undefined) {
    throw new Error('GDELT manifest does not contain an Event export');
  }

  const parts = exportLine.trim().split(/\s+/);

  const candidate = parts.at(-1);

  const result = z.url().safeParse(candidate);

  if (!result.success) {
    throw new Error('GDELT manifest contains an invalid Event export URL');
  }

  const url = new URL(result.data);

  if (url.hostname === 'data.gdeltproject.org') {
    url.protocol = 'https:';
  }

  return url.toString();
}

const DEFAULT_ARCHIVE_TIMEOUT_MS = 30_000;

export class GdeltExportNotFoundError extends Error {
  public constructor(url: string) {
    super(`GDELT export not published: ${url}`);

    this.name = 'GdeltExportNotFoundError';
  }
}

async function fetchArchive(url: string, timeoutMs: number): Promise<ArrayBuffer> {
  const response = await fetch(url, {
    signal: AbortSignal.timeout(timeoutMs),
  });

  /*
   * GDELT occasionally skips a 15-minute slot. That is not a
   * failure of this system, so callers can treat it separately.
   */
  if (response.status === 404) {
    throw new GdeltExportNotFoundError(url);
  }

  if (!response.ok) {
    throw new Error(`GDELT archive request failed with status ${String(response.status)}`);
  }

  return response.arrayBuffer();
}

function unzipExport(buffer: ArrayBuffer): string {
  const files = unzipSync(new Uint8Array(buffer));

  const firstFile = Object.values(files)[0];

  if (firstFile === undefined) {
    throw new Error('GDELT ZIP archive is empty');
  }

  return strFromU8(firstFile);
}

export async function fetchLatestGdeltExportUrl(): Promise<string> {
  const manifest = await fetchText(env.GDELT_LASTUPDATE_URL);

  return getExportUrl(manifest);
}

export async function fetchGdeltExport(
  exportUrl: string,
  timeoutMs: number = DEFAULT_ARCHIVE_TIMEOUT_MS,
) {
  const archive = await fetchArchive(exportUrl, timeoutMs);

  const contents = unzipExport(archive);

  const parsed = parseGdeltExport(contents);

  return {
    exportUrl,
    ...parsed,
  };
}

export async function fetchLatestGdeltEvents() {
  const exportUrl = await fetchLatestGdeltExportUrl();

  return fetchGdeltExport(exportUrl);
}
