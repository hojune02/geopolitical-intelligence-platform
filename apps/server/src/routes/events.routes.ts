import { Router } from 'express';

import { parseOrThrow } from '../http/validation.js';

import { eventQuerySchema } from '../schemas/event-query.schema.js';

import { getEventPage } from '../services/events/event-query.service.js';

import { mapEventQuerySchema } from '../schemas/map-event.schema.js';

import { getMapEventPage } from '../services/events/event-query.service.js';

export const eventsRouter = Router();

eventsRouter.get('/', async (request, response) => {
  const query = parseOrThrow(eventQuerySchema, request.query);

  const result = await getEventPage(query);

  response.status(200).json({
    ...result.payload,

    cache: {
      hit: result.cacheHit,
    },
  });
});

eventsRouter.get('/map', async (request, response) => {
  const query = parseOrThrow(mapEventQuerySchema, request.query);

  const result = await getMapEventPage(query);

  response.status(200).json({
    ...result.payload,

    cache: {
      hit: result.cacheHit,
    },
  });
});
