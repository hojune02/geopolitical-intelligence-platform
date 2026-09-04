import { appendQuery, fetchAndParse } from './http';

import { mapEventResponseSchema, type MapEventResponse } from '../schemas/map-event.schema';

export interface MapBounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

export interface MapEventQuery extends MapBounds {
  startDate?: string;

  endDate?: string;

  minGoldstein?: number;

  maxGoldstein?: number;

  isRootEvent?: boolean;

  limit?: number;
}

export async function fetchMapEvents(
  query: MapEventQuery,
  signal?: AbortSignal,
): Promise<MapEventResponse> {
  const baseUrl: unknown = import.meta.env.VITE_API_BASE_URL;

  if (typeof baseUrl !== 'string') {
    throw new Error('VITE_API_BASE_URL is not configured');
  }

  const url = new URL('/api/v1/events/map', baseUrl);

  appendQuery(url.searchParams, 'north', query.north);

  appendQuery(url.searchParams, 'south', query.south);

  appendQuery(url.searchParams, 'east', query.east);

  appendQuery(url.searchParams, 'west', query.west);

  appendQuery(url.searchParams, 'startDate', query.startDate);

  appendQuery(url.searchParams, 'endDate', query.endDate);

  appendQuery(url.searchParams, 'minGoldstein', query.minGoldstein);

  appendQuery(url.searchParams, 'maxGoldstein', query.maxGoldstein);

  appendQuery(url.searchParams, 'isRootEvent', query.isRootEvent);

  appendQuery(url.searchParams, 'limit', query.limit);

  return fetchAndParse(url, mapEventResponseSchema, signal);
}
