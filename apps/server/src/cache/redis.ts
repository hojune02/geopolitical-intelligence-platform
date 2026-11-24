import { createClient } from 'redis';

import { env } from '../config/env.js';

export const redisClient = createClient({
  url: env.REDIS_URL,

  /*
   * Fail commands immediately while disconnected instead of queueing
   * them until a reconnect that may never come (a rate-limited
   * Upstash instance kept requests waiting ~10s).
   */
  disableOfflineQueue: true,

  socket: {
    connectTimeout: 800,

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
    }, 800);
  });

  return Promise.race([attempt, timeout]);
}

const COMMAND_TIMEOUT_MS = 400;

/*
 * A cache must never be slower than the database it fronts: every
 * command gets a short deadline, and a failure starts the cool-down so
 * later requests skip Redis entirely for a minute.
 */
const TIMED_OUT = Symbol('timed-out');

async function withDeadline<T>(operation: Promise<T>, label: string): Promise<T | null> {
  let timer: ReturnType<typeof setTimeout> | undefined;

  const deadline = new Promise<typeof TIMED_OUT>((resolve) => {
    timer = setTimeout(() => {
      resolve(TIMED_OUT);
    }, COMMAND_TIMEOUT_MS);
  });

  try {
    const result = await Promise.race([operation, deadline]);

    if (result === TIMED_OUT) {
      markRedisUnavailable(`${label} timed out`);
      return null;
    }

    return result;
  } catch (error: unknown) {
    markRedisUnavailable(`${label} failed`, error);
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function markRedisUnavailable(reason: string, error?: unknown): void {
  if (Date.now() - lastFailureAt > REDIS_RETRY_COOLDOWN_MS) {
    console.error(`Redis ${reason}; bypassing cache for 60s`, error ?? '');
  }

  lastFailureAt = Date.now();
}

function redisUsable(): boolean {
  return Date.now() - lastFailureAt >= REDIS_RETRY_COOLDOWN_MS;
}

export async function cacheGet(key: string): Promise<string | null> {
  if (!redisUsable() || !(await ensureRedis())) {
    return null;
  }

  return withDeadline(redisClient.get(key), 'GET');
}

export async function cacheSet(key: string, value: string, ttlSeconds: number): Promise<void> {
  if (!redisUsable() || !(await ensureRedis())) {
    return;
  }

  await withDeadline(redisClient.set(key, value, { EX: ttlSeconds }), 'SET');
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
  if (!redisUsable() || !(await ensureRedis())) {
    return;
  }

  await withDeadline(redisClient.incr(EVENT_CACHE_VERSION_KEY), 'INCR');
}
