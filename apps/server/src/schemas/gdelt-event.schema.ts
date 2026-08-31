import { z } from 'zod';

export const quadClassLabelSchema = z.enum([
  'verbal_cooperation',
  'material_cooperation',
  'verbal_conflict',
  'material_conflict',
]);

export const actorSchema = z.object({
  code: z.string().nullable(),
  name: z.string().nullable(),
  countryCode: z.string().nullable(),
});

export const eventLocationSchema = z.object({
  name: z.string().nullable(),
  countryCode: z.string().nullable(),

  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
});

export const gdeltEventSchema = z.object({
  id: z.string().regex(/^\d+$/),

  eventDate: z.iso.date(),
  addedAt: z.iso.datetime(),

  actors: z.object({
    source: actorSchema,
    target: actorSchema,
  }),

  action: z.object({
    code: z.string().min(1),
    baseCode: z.string().min(1),
    rootCode: z.string().min(1),

    quadClass: z.object({
      code: z.number().int().min(1).max(4),
      label: quadClassLabelSchema,
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

  location: eventLocationSchema.nullable(),

  sourceUrl: z.url().nullable(),
});

export type GdeltEvent = z.infer<typeof gdeltEventSchema>;
