import { createClient } from 'redis';

import { env } from '../config/env.js';

export const redisClient = createClient({
  url: env.REDIS_URL,

  socket: {
    connectTimeout: 1_500,

    /*
     * Give up after a few attempts instead of retrying forever;
     * ensureRedis() will try again after a cool-down.
     */
    reconnectStrategy: (retries: number) =>
      retries > 3 ? new Error('Redis reconnect attempts exhausted') : 250 * (retries + 1),
  },
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

const REDIS_RETRY_COOLDOWN_MS = 60_000;

let connecting: Promise<boolean> | null = null;

let lastFailureAt = 0;

/*
 * On Vercel, index.ts (which used to call connectRedis) never runs:
 * the platform imports app.ts directly. Connect lazily on first use,
 * bounded by a short timeout, so the cache works in serverless and a
 * Redis outage costs at most one slow request per instance per minute.
 */
export async function ensureRedis(): Promise<boolean> {
  if (redisClient.isReady) {
    return true;
  }

  if (redisClient.isOpen || Date.now() - lastFailureAt < REDIS_RETRY_COOLDOWN_MS) {
    return false;
  }

  const attempt = (connecting ??= redisClient
    .connect()
    .then(() => true)
    .catch((error: unknown) => {
      lastFailureAt = Date.now();
      console.error('Redis connect failed; continuing without cache:', error);
      return false;
    })
    .finally(() => {
      connecting = null;
    }));

  const timeout = new Promise<boolean>((resolve) => {
    setTimeout(() => {
      resolve(false);
    }, 1_500);
  });

  return Promise.race([attempt, timeout]);
}

export async function cacheGet(key: string): Promise<string | null> {
  if (!(await ensureRedis())) {
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
  if (!(await ensureRedis())) {
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
  if (!(await ensureRedis())) {
    return;
  }

  try {
    await redisClient.incr(EVENT_CACHE_VERSION_KEY);
  } catch (error: unknown) {
    console.error('Redis cache version increment failed:', error);
  }
}
