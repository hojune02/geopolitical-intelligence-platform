import { Router } from 'express';

import { parseOrThrow } from '../http/validation.js';

import { eventQuerySchema } from '../schemas/event-query.schema.js';

import { getEventPage } from '../services/events/event-query.service.js';

import { mapEventQuerySchema } from '../schemas/map-event.schema.js';

import { getMapEventPage } from '../services/events/event-query.service.js';

import { getEventById } from '../services/events/event-query.service.js';

export const eventsRouter = Router();

/* New events land every 15 minutes; a short CDN cache absorbs bursts. */
const SHORT_EDGE_CACHE = 'public, max-age=30, s-maxage=60, stale-while-revalidate=300';

eventsRouter.get('/', async (request, response) => {
  const query = parseOrThrow(eventQuerySchema, request.query);

  const result = await getEventPage(query);

  response.setHeader('Cache-Control', SHORT_EDGE_CACHE);

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

  response.setHeader('Cache-Control', SHORT_EDGE_CACHE);

  response.status(200).json({
    ...result.payload,

    cache: {
      hit: result.cacheHit,
    },
  });
});

eventsRouter.get('/:eventId', async (request, response, next) => {
  try {
    const eventId = request.params.eventId;

    const event = await getEventById(eventId);

    if (event === null) {
      response.status(404).json({
        error: {
          message: 'Event not found.',
        },
      });

      return;
    }

    /* A stored event only changes if GDELT re-exports it. */
    response.setHeader('Cache-Control', 'public, max-age=300, s-maxage=3600');

    response.json({
      data: event,
    });
  } catch (error) {
    next(error);
  }
});
