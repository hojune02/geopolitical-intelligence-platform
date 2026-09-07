import { z } from 'zod';

const booleanQuerySchema = z.enum(['true', 'false']).transform((value) => value === 'true');

export const mapEventQuerySchema = z
  .object({
    north: z.coerce.number().min(-90).max(90),

    south: z.coerce.number().min(-90).max(90),

    east: z.coerce.number().min(-180).max(180),

    west: z.coerce.number().min(-180).max(180),

    startDate: z.iso.date().optional(),

    endDate: z.iso.date().optional(),

    minGoldstein: z.coerce.number().min(-10).max(10).optional(),

    maxGoldstein: z.coerce.number().min(-10).max(10).optional(),

    isRootEvent: booleanQuerySchema.optional(),

    limit: z.coerce.number().int().min(1).max(10_000).default(5_000),
  })
  .superRefine((query, context) => {
    if (query.south > query.north) {
      context.addIssue({
        code: 'custom',
        path: ['south'],
        message: 'south must be <= north',
      });
    }

    if (
      query.startDate !== undefined &&
      query.endDate !== undefined &&
      query.startDate > query.endDate
    ) {
      context.addIssue({
        code: 'custom',
        path: ['startDate'],
        message: 'startDate must be <= endDate',
      });
    }

    if (
      query.minGoldstein !== undefined &&
      query.maxGoldstein !== undefined &&
      query.minGoldstein > query.maxGoldstein
    ) {
      context.addIssue({
        code: 'custom',
        path: ['minGoldstein'],
        message: 'minGoldstein must be <= maxGoldstein',
      });
    }
  });

export type MapEventQuery = z.infer<typeof mapEventQuerySchema>;

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

export type MapEventPoint = z.infer<typeof mapEventPointSchema>;

export const mapEventPayloadSchema = z.object({
  data: z.array(mapEventPointSchema),

  meta: z.object({
    count: z.number().int().nonnegative(),

    limit: z.number().int().positive(),

    truncated: z.boolean(),
  }),
});

export type MapEventPayload = z.infer<typeof mapEventPayloadSchema>;
