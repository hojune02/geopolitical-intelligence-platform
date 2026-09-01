import { z } from 'zod';

import { gdeltEventSchema } from './gdelt-event.schema.js';

const countryCodeSchema = z
  .string()
  .trim()
  .length(2)
  .transform((value) => value.toUpperCase());

const booleanQuerySchema = z.enum(['true', 'false']).transform((value) => value === 'true');

export const eventQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),

    limit: z.coerce.number().int().min(1).max(100).default(50),

    startDate: z.iso.date().optional(),

    endDate: z.iso.date().optional(),

    countryCode: countryCodeSchema.optional(),

    actor: z.string().trim().min(1).max(100).optional(),

    quadClass: z.coerce.number().int().min(1).max(4).optional(),

    minGoldstein: z.coerce.number().min(-10).max(10).optional(),

    maxGoldstein: z.coerce.number().min(-10).max(10).optional(),

    isRootEvent: booleanQuerySchema.optional(),

    north: z.coerce.number().min(-90).max(90).optional(),

    south: z.coerce.number().min(-90).max(90).optional(),

    east: z.coerce.number().min(-180).max(180).optional(),

    west: z.coerce.number().min(-180).max(180).optional(),
  })
  .superRefine((query, context) => {
    if (
      query.startDate !== undefined &&
      query.endDate !== undefined &&
      query.startDate > query.endDate
    ) {
      context.addIssue({
        code: 'custom',
        path: ['startDate'],
        message: 'startDate must be before or equal to endDate',
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

    const bounds = [query.north, query.south, query.east, query.west];

    const suppliedBounds = bounds.filter((value) => value !== undefined).length;

    if (suppliedBounds !== 0 && suppliedBounds !== 4) {
      context.addIssue({
        code: 'custom',
        path: ['north'],
        message: 'north, south, east and west must be provided together',
      });
    }

    if (query.north !== undefined && query.south !== undefined && query.south > query.north) {
      context.addIssue({
        code: 'custom',
        path: ['south'],
        message: 'south must be <= north',
      });
    }
  });

export type EventQuery = z.infer<typeof eventQuerySchema>;

export const eventPageSchema = z.object({
  data: z.array(gdeltEventSchema),

  meta: z.object({
    page: z.number().int().positive(),

    limit: z.number().int().positive(),

    total: z.number().int().nonnegative(),

    totalPages: z.number().int().nonnegative(),
  }),
});

export type EventPage = z.infer<typeof eventPageSchema>;

export const trendQuerySchema = z
  .object({
    startDate: z.iso.date().optional(),

    endDate: z.iso.date().optional(),

    countryCode: countryCodeSchema.optional(),

    quadClass: z.coerce.number().int().min(1).max(4).optional(),

    bucket: z.enum(['day', 'week']).default('day'),
  })
  .superRefine((query, context) => {
    if (
      query.startDate !== undefined &&
      query.endDate !== undefined &&
      query.startDate > query.endDate
    ) {
      context.addIssue({
        code: 'custom',
        path: ['startDate'],
        message: 'startDate must be before or equal to endDate',
      });
    }
  });

export type TrendQuery = z.infer<typeof trendQuerySchema>;

export const trendsPayloadSchema = z.object({
  data: z.array(
    z.object({
      bucket: z.iso.date(),

      eventCount: z.number().int().nonnegative(),

      conflictEvents: z.number().int().nonnegative(),

      averageGoldstein: z.number().nullable(),

      averageTone: z.number().nullable(),
    }),
  ),
});

export type TrendsPayload = z.infer<typeof trendsPayloadSchema>;
