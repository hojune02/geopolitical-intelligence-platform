import { appendQuery, fetchAndParse } from './http';

import {
  countryDossierResponseSchema,
  radarResponseSchema,
  storiesResponseSchema,
  type CountryDossierResponse,
  type RadarResponse,
  type StoriesResponse,
} from '../schemas/insights.schema';

function apiUrl(path: string): URL {
  const rawBaseUrl: unknown = import.meta.env.VITE_API_BASE_URL;

  if (typeof rawBaseUrl !== 'string') {
    throw new Error('VITE_API_BASE_URL is not configured');
  }

  return new URL(path, rawBaseUrl);
}

export function fetchRadar(signal?: AbortSignal): Promise<RadarResponse> {
  return fetchAndParse(apiUrl('/api/v1/insights/radar'), radarResponseSchema, signal);
}

export interface StoriesQuery {
  hours?: number;
  limit?: number;
  countryCode?: string;
}

export function fetchStories(query: StoriesQuery, signal?: AbortSignal): Promise<StoriesResponse> {
  const url = apiUrl('/api/v1/insights/stories');

  appendQuery(url.searchParams, 'hours', query.hours);
  appendQuery(url.searchParams, 'limit', query.limit);
  appendQuery(url.searchParams, 'countryCode', query.countryCode);

  return fetchAndParse(url, storiesResponseSchema, signal);
}

export function fetchCountryDossier(
  countryCode: string,
  signal?: AbortSignal,
): Promise<CountryDossierResponse> {
  return fetchAndParse(
    apiUrl(`/api/v1/insights/countries/${encodeURIComponent(countryCode)}`),
    countryDossierResponseSchema,
    signal,
  );
}
