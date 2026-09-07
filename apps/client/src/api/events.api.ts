import { z } from 'zod';

import {
  eventDetailResponseSchema,
  eventPageResponseSchema,
  type EventDetailResponse,
  type EventPageResponse,
} from '../schemas/event-api.schema';

const rawApiBaseUrl: unknown = import.meta.env.VITE_API_BASE_URL;

const apiBaseUrl = z.url().parse(rawApiBaseUrl);

export interface EventQuery {
  page?: number;
  limit?: number;

  startDate?: string;
  endDate?: string;

  countryCode?: string;
  actor?: string;

  quadClass?: number;

  minGoldstein?: number;
  maxGoldstein?: number;

  isRootEvent?: boolean;

  north?: number;
  south?: number;
  east?: number;
  west?: number;
}

export class ApiError extends Error {
  public readonly status: number;

  public constructor(status: number, message: string) {
    super(message);

    this.name = 'ApiError';
    this.status = status;
  }
}

function appendQuery(
  searchParams: URLSearchParams,
  key: string,
  value: string | number | boolean | undefined,
): void {
  if (value === undefined) {
    return;
  }

  searchParams.set(key, String(value));
}

async function fetchAndParse<T>(url: URL, schema: z.ZodType<T>, signal?: AbortSignal): Promise<T> {
  const response = await fetch(url, {
    signal,
  });

  if (!response.ok) {
    throw new ApiError(
      response.status,
      `API request failed with status ${String(response.status)}`,
    );
  }

  const body: unknown = await response.json();

  return schema.parse(body);
}

export async function fetchEventPage(
  query: EventQuery,
  signal?: AbortSignal,
): Promise<EventPageResponse> {
  const url = new URL('/api/v1/events', apiBaseUrl);

  appendQuery(url.searchParams, 'page', query.page);

  appendQuery(url.searchParams, 'limit', query.limit);

  appendQuery(url.searchParams, 'startDate', query.startDate);

  appendQuery(url.searchParams, 'endDate', query.endDate);

  appendQuery(url.searchParams, 'countryCode', query.countryCode);

  appendQuery(url.searchParams, 'actor', query.actor);

  appendQuery(url.searchParams, 'quadClass', query.quadClass);

  appendQuery(url.searchParams, 'minGoldstein', query.minGoldstein);

  appendQuery(url.searchParams, 'maxGoldstein', query.maxGoldstein);

  appendQuery(url.searchParams, 'isRootEvent', query.isRootEvent);

  appendQuery(url.searchParams, 'north', query.north);

  appendQuery(url.searchParams, 'south', query.south);

  appendQuery(url.searchParams, 'east', query.east);

  appendQuery(url.searchParams, 'west', query.west);

  return fetchAndParse(url, eventPageResponseSchema, signal);
}

export async function fetchEventById(
  eventId: string,
  signal?: AbortSignal,
): Promise<EventDetailResponse> {
  const rawApiBaseUrl: unknown = import.meta.env.VITE_API_BASE_URL;

  if (typeof rawApiBaseUrl !== 'string') {
    throw new Error('VITE_API_BASE_URL is not configured.');
  }

  const url = new URL(`/api/v1/events/${encodeURIComponent(eventId)}`, rawApiBaseUrl);

  return fetchAndParse(url, eventDetailResponseSchema, signal);
}
