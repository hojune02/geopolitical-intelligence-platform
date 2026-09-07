import { z } from 'zod';

const actorSchema = z.object({
  code: z.string().nullable(),
  name: z.string().nullable(),
  countryCode: z.string().nullable(),
});

const locationSchema = z.object({
  name: z.string().nullable(),
  countryCode: z.string().nullable(),

  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
});

export const eventSchema = z.object({
  id: z.string(),

  eventDate: z.iso.date(),

  addedAt: z.iso.datetime(),

  actors: z.object({
    source: actorSchema,
    target: actorSchema,
  }),

  action: z.object({
    code: z.string(),

    baseCode: z.string(),

    rootCode: z.string(),

    quadClass: z.object({
      code: z.number().int().min(1).max(4),

      label: z.enum([
        'verbal_cooperation',
        'material_cooperation',
        'verbal_conflict',
        'material_conflict',
      ]),
    }),

    goldsteinScale: z.number().min(-10).max(10),
  }),

  isRootEvent: z.boolean(),

  metrics: z.object({
    mentions: z.number().int().nonnegative(),

    sources: z.number().int().nonnegative(),

    articles: z.number().int().nonnegative(),

    averageTone: z.number().min(-100).max(100),
  }),

  location: locationSchema.nullable(),

  sourceUrl: z.url().nullable(),
});

export const eventPageResponseSchema = z.object({
  data: z.array(eventSchema),

  meta: z.object({
    page: z.number().int().positive(),

    limit: z.number().int().positive(),

    total: z.number().int().nonnegative(),

    totalPages: z.number().int().nonnegative(),
  }),

  cache: z.object({
    hit: z.boolean(),
  }),
});

export type Event = z.infer<typeof eventSchema>;

export type EventPageResponse = z.infer<typeof eventPageResponseSchema>;

export const eventDetailResponseSchema = z.object({
  data: eventSchema,
});

export type EventDetailResponse = z.infer<typeof eventDetailResponseSchema>;
