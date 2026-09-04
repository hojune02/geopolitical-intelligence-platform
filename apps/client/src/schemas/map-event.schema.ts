import { z } from 'zod';

export const mapEventPointSchema = z.object({
  id: z.string(),

  eventDate: z.iso.date(),

  latitude: z.number().min(-90).max(90),

  longitude: z.number().min(-180).max(180),

  goldsteinScale: z.number().min(-10).max(10),

  quadClass: z.number().int().min(1).max(4),

  actor1Name: z.string().nullable(),

  actor2Name: z.string().nullable(),

  locationName: z.string().nullable(),
});

export const mapEventResponseSchema = z.object({
  data: z.array(mapEventPointSchema),

  meta: z.object({
    count: z.number().int().nonnegative(),

    limit: z.number().int().positive(),

    truncated: z.boolean(),
  }),

  cache: z.object({
    hit: z.boolean(),
  }),
});

export type MapEventPoint = z.infer<typeof mapEventPointSchema>;

export type MapEventResponse = z.infer<typeof mapEventResponseSchema>;
