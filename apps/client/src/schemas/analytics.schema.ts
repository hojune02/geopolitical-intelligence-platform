import { z } from 'zod';

export const trendBucketSchema = z.enum(['day', 'week']);

export type TrendBucket = z.infer<typeof trendBucketSchema>;

export const trendPointSchema = z.object({
  bucket: z.iso.date(),

  eventCount: z.number().int().nonnegative(),

  conflictEvents: z.number().int().nonnegative(),

  averageGoldstein: z.number().min(-10).max(10).nullable(),

  averageTone: z.number().min(-100).max(100).nullable(),
});

export type TrendPoint = z.infer<typeof trendPointSchema>;

export const trendResponseSchema = z.object({
  data: z.array(trendPointSchema),

  cache: z.object({
    hit: z.boolean(),
  }),
});

export type TrendResponse = z.infer<typeof trendResponseSchema>;
