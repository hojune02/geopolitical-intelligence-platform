import { Router, type Response } from 'express';

import { z } from 'zod';

import { parseOrThrow } from '../http/validation.js';

import { getCountryDossier, getRadar, getStories } from '../services/insights.service.js';

export const insightsRouter = Router();

/*
 * Insights change at most every 15 minutes (one GDELT export), so let
 * Vercel's CDN serve them and refresh in the background.
 */
function setEdgeCache(response: Response): void {
  response.setHeader(
    'Cache-Control',
    'public, max-age=60, s-maxage=300, stale-while-revalidate=900',
  );
}

const countryCodeSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z]{2}$/, 'Expected a two-letter GDELT (FIPS) country code');

const storiesQuerySchema = z.object({
  hours: z.coerce.number().int().min(1).max(168).default(24),
  limit: z.coerce.number().int().min(1).max(50).default(12),
  countryCode: countryCodeSchema.optional(),
});

insightsRouter.get('/radar', async (_request, response) => {
  const data = await getRadar();

  setEdgeCache(response);

  response.status(200).json({ data });
});

insightsRouter.get('/stories', async (request, response) => {
  const query = parseOrThrow(storiesQuerySchema, request.query);

  const data = await getStories(query);

  setEdgeCache(response);

  response.status(200).json(data);
});

insightsRouter.get('/countries/:countryCode', async (request, response) => {
  const countryCode = parseOrThrow(countryCodeSchema, request.params.countryCode);

  const data = await getCountryDossier(countryCode);

  if (data === null) {
    response.status(404).json({
      error: { code: 'NOT_FOUND', message: 'No recent events for this country' },
    });

    return;
  }

  setEdgeCache(response);

  response.status(200).json({ data });
});
