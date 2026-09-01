import { createHash } from 'node:crypto';

import { cacheDelete, cacheGet, cacheSet, getEventCacheVersion } from '../../cache/redis.js';

import { env } from '../../config/env.js';

import { findEvents, findTrends } from '../../repositories/events.repository.js';

import {
  eventPageSchema,
  trendsPayloadSchema,
  type EventPage,
  type EventQuery,
  type TrendQuery,
  type TrendsPayload,
} from '../../schemas/event-query.schema.js';

function createCacheKey(namespace: string, version: string, query: unknown): string {
  const serialized = JSON.stringify(query);

  const digest = createHash('sha256').update(serialized).digest('hex');

  return `${namespace}:v${version}:${digest}`;
}

export interface CachedResult<T> {
  payload: T;
  cacheHit: boolean;
}

export async function getEventPage(query: EventQuery): Promise<CachedResult<EventPage>> {
  const version = await getEventCacheVersion();

  const key = createCacheKey('api:events', version, query);

  const cached = await cacheGet(key);

  if (cached !== null) {
    try {
      const parsed: unknown = JSON.parse(cached);

      const result = eventPageSchema.safeParse(parsed);

      if (result.success) {
        return {
          payload: result.data,

          cacheHit: true,
        };
      }

      await cacheDelete(key);
    } catch {
      await cacheDelete(key);
    }
  }

  const payload = await findEvents(query);

  await cacheSet(key, JSON.stringify(payload), env.API_CACHE_TTL_SECONDS);

  return {
    payload,
    cacheHit: false,
  };
}

export async function getTrends(query: TrendQuery): Promise<CachedResult<TrendsPayload>> {
  const version = await getEventCacheVersion();

  const key = createCacheKey('api:trends', version, query);

  const cached = await cacheGet(key);

  if (cached !== null) {
    try {
      const parsed: unknown = JSON.parse(cached);

      const result = trendsPayloadSchema.safeParse(parsed);

      if (result.success) {
        return {
          payload: result.data,

          cacheHit: true,
        };
      }

      await cacheDelete(key);
    } catch {
      await cacheDelete(key);
    }
  }

  const payload = await findTrends(query);

  await cacheSet(key, JSON.stringify(payload), env.API_CACHE_TTL_SECONDS);

  return {
    payload,
    cacheHit: false,
  };
}
