import { appendQuery, fetchAndParse } from './http';

import {
  trendResponseSchema,
  type TrendBucket,
  type TrendResponse,
} from '../schemas/analytics.schema';

export interface TrendQuery {
  bucket: TrendBucket;

  startDate?: string;

  endDate?: string;

  countryCode?: string;

  quadClass?: number;

  minGoldstein?: number;

  maxGoldstein?: number;

  isRootEvent?: boolean;
}

export async function fetchTrends(query: TrendQuery, signal?: AbortSignal): Promise<TrendResponse> {
  const rawBaseUrl: unknown = import.meta.env.VITE_API_BASE_URL;

  if (typeof rawBaseUrl !== 'string') {
    throw new Error('VITE_API_BASE_URL is not configured');
  }

  const url = new URL('/api/v1/analytics/trends', rawBaseUrl);

  appendQuery(url.searchParams, 'bucket', query.bucket);

  appendQuery(url.searchParams, 'startDate', query.startDate);

  appendQuery(url.searchParams, 'endDate', query.endDate);

  appendQuery(url.searchParams, 'countryCode', query.countryCode);

  appendQuery(url.searchParams, 'quadClass', query.quadClass);

  appendQuery(url.searchParams, 'minGoldstein', query.minGoldstein);

  appendQuery(url.searchParams, 'maxGoldstein', query.maxGoldstein);

  appendQuery(url.searchParams, 'isRootEvent', query.isRootEvent);

  return fetchAndParse(url, trendResponseSchema, signal);
}
