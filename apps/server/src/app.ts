import cors from 'cors';
import express from 'express';

import { env } from './config/env.js';

import { errorHandler } from './middleware/error.middleware.js';

import { notFoundHandler } from './middleware/not-found.middleware.js';

import { analyticsRouter } from './routes/analytics.routes.js';

import { eventsRouter } from './routes/events.routes.js';

export const app = express();

app.disable('x-powered-by');

app.use(
  cors({
    origin: env.CLIENT_ORIGIN,
  }),
);

app.use(
  express.json({
    limit: '1mb',
  }),
);

app.get('/health', (_request, response) => {
  response.status(200).json({
    status: 'ok',

    service: 'geopolitical-intelligence-api',

    timestamp: new Date().toISOString(),
  });
});

app.use('/api/v1/events', eventsRouter);

app.use('/api/v1/analytics', analyticsRouter);

/*
 * Always after real routes.
 */
app.use(notFoundHandler);

/*
 * Error middleware MUST be last.
 */
app.use(errorHandler);

export default app