import { describe, expect, it } from 'vitest';

import { trendResponseSchema } from '../schemas/analytics.schema';

describe('trendResponseSchema', () => {
  it('accepts a valid analytics response', () => {
    const result = trendResponseSchema.safeParse({
      data: [
        {
          bucket: '2026-09-01',

          eventCount: 120,

          conflictEvents: 40,

          averageGoldstein: -1.5,

          averageTone: -4.2,
        },
      ],

      cache: {
        hit: true,
      },
    });

    expect(result.success).toBe(true);
  });

  it('rejects invalid event counts', () => {
    const result = trendResponseSchema.safeParse({
      data: [
        {
          bucket: '2026-09-01',

          eventCount: -5,

          conflictEvents: 2,

          averageGoldstein: 0,

          averageTone: 0,
        },
      ],

      cache: {
        hit: false,
      },
    });

    expect(result.success).toBe(false);
  });

  it('rejects Goldstein values outside its range', () => {
    const result = trendResponseSchema.safeParse({
      data: [
        {
          bucket: '2026-09-01',

          eventCount: 10,

          conflictEvents: 1,

          averageGoldstein: 20,

          averageTone: 0,
        },
      ],

      cache: {
        hit: false,
      },
    });

    expect(result.success).toBe(false);
  });
});
