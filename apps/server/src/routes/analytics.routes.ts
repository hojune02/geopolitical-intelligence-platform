import { Router } from 'express';

import { parseOrThrow } from '../http/validation.js';

import { trendQuerySchema } from '../schemas/event-query.schema.js';

import { getTrends } from '../services/events/event-query.service.js';

export const analyticsRouter = Router();

analyticsRouter.get('/trends', async (request, response) => {
  const query = parseOrThrow(trendQuerySchema, request.query);

  const result = await getTrends(query);

  response.status(200).json({
    ...result.payload,

    cache: {
      hit: result.cacheHit,
    },
  });
});
