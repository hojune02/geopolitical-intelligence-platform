import { createClient } from 'redis';

import { env } from '../config/env.js';

export const redisClient = createClient({
  url: env.REDIS_URL,
});

redisClient.on('error', (error: Error) => {
  console.error('Redis client error:', error);
});

export async function connectRedis(): Promise<void> {
  if (!redisClient.isOpen) {
    await redisClient.connect();
  }
}

export async function closeRedis(): Promise<void> {
  if (redisClient.isReady) {
    await redisClient.quit();
    return;
  }

  if (redisClient.isOpen) {
    redisClient.destroy();
  }
}

export async function cacheGet(key: string): Promise<string | null> {
  if (!redisClient.isReady) {
    return null;
  }

  try {
    return await redisClient.get(key);
  } catch (error: unknown) {
    console.error('Redis GET failed:', error);
    return null;
  }
}

export async function cacheSet(key: string, value: string, ttlSeconds: number): Promise<void> {
  if (!redisClient.isReady) {
    return;
  }

  try {
    await redisClient.set(key, value, {
      EX: ttlSeconds,
    });
  } catch (error: unknown) {
    console.error('Redis SET failed:', error);
  }
}

export async function cacheDelete(key: string): Promise<void> {
  if (!redisClient.isReady) {
    return;
  }

  try {
    await redisClient.del(key);
  } catch (error: unknown) {
    console.error('Redis DEL failed:', error);
  }
}

const EVENT_CACHE_VERSION_KEY = 'cache:events:version';

export async function getEventCacheVersion(): Promise<string> {
  const version = await cacheGet(EVENT_CACHE_VERSION_KEY);

  return version ?? '0';
}

export async function bumpEventCacheVersion(): Promise<void> {
  if (!redisClient.isReady) {
    return;
  }

  try {
    await redisClient.incr(EVENT_CACHE_VERSION_KEY);
  } catch (error: unknown) {
    console.error('Redis cache version increment failed:', error);
  }
}
