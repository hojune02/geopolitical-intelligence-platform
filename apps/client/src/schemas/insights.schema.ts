import { z } from 'zod';

const sparkPointSchema = z.object({
  total: z.number(),
  conflict: z.number(),
});

export const radarCountrySchema = z.object({
  countryCode: z.string(),
  status: z.enum(['escalating', 'cooling', 'steady', 'new']),
  conflictZ: z.number().nullable(),
  attentionZ: z.number().nullable(),
  recent: z.object({
    events: z.number(),
    conflictEvents: z.number(),
    materialConflictEvents: z.number(),
    conflictShare: z.number().nullable(),
    averageGoldstein: z.number().nullable(),
    averageTone: z.number().nullable(),
    mentions: z.number(),
  }),
  baseline: z.object({
    events: z.number(),
    conflictEvents: z.number(),
    conflictShare: z.number().nullable(),
    averageGoldstein: z.number().nullable(),
    expectedConflictEvents: z.number().nullable(),
  }),
  spark: z.array(sparkPointSchema).optional(),
});

const windowSchema = z.object({
  end: z.string().nullable(),
  start: z.string().nullable(),
  recentHours: z.number(),
  baselineHours: z.number(),
});

export const radarResponseSchema = z.object({
  data: z.object({
    window: windowSchema,
    totals: z.object({
      recentEvents: z.number(),
      baselineEvents: z.number(),
      countries: z.number(),
    }),
    escalating: z.array(radarCountrySchema),
    cooling: z.array(radarCountrySchema),
    mostCovered: z.array(radarCountrySchema),
    countries: z.array(radarCountrySchema),
  }),
});

export const storySchema = z.object({
  headline: z.string(),
  url: z.string(),
  domain: z.string(),
  eventId: z.string(),
  outlets: z.number(),
  mentions: z.number(),
  articles: z.number(),
  events: z.number(),
  conflictShare: z.number(),
  averageGoldstein: z.number(),
  minGoldstein: z.number(),
  averageTone: z.number(),
  countryCode: z.string().nullable(),
  place: z.string().nullable(),
  rootCode: z.string(),
  actors: z.array(z.string()),
  lastSeen: z.string(),
});

export const storiesResponseSchema = z.object({
  data: z.array(storySchema),
});

export const countryDossierResponseSchema = z.object({
  data: z.object({
    countryCode: z.string(),
    radar: radarCountrySchema.nullable(),
    window: windowSchema,
    daily: z.array(
      z.object({
        day: z.string(),
        verbalCooperation: z.number(),
        materialCooperation: z.number(),
        verbalConflict: z.number(),
        materialConflict: z.number(),
        averageGoldstein: z.number().nullable(),
        averageTone: z.number().nullable(),
      }),
    ),
    actions: z.array(z.object({ rootCode: z.string(), events: z.number(), mentions: z.number() })),
    counterparts: z.array(
      z.object({
        code: z.string(),
        events: z.number(),
        conflictShare: z.number(),
        averageGoldstein: z.number(),
      }),
    ),
    actors: z.array(z.object({ name: z.string(), events: z.number(), averageGoldstein: z.number() })),
    stories: z.array(storySchema),
  }),
});

export type RadarCountry = z.infer<typeof radarCountrySchema>;
export type RadarResponse = z.infer<typeof radarResponseSchema>;
export type Story = z.infer<typeof storySchema>;
export type StoriesResponse = z.infer<typeof storiesResponseSchema>;
export type CountryDossierResponse = z.infer<typeof countryDossierResponseSchema>;
export type CountryDossier = CountryDossierResponse['data'];
