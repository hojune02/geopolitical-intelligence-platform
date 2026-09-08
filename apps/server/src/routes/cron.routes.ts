import { Router } from 'express';

import { env } from '../config/env.js';

import {
  runGdeltIngestionCycle,
} from '../services/gdelt/gdelt-ingestion.service.js';

export const cronRouter =
  Router();

cronRouter.get(
  '/gdelt-ingest',
  async (
    request,
    response,
    next,
  ) => {
    try {
      const authorization =
        request.header(
          'authorization',
        );

      if (
        authorization !==
        `Bearer ${env.CRON_SECRET}`
      ) {
        response.status(401).json({
          error: {
            code:
              'UNAUTHORIZED',
            message:
              'Unauthorized',
          },
        });

        return;
      }

        await runGdeltIngestionCycle(
          env.GDELT_WORKER_LOOKBACK_HOURS,
        );

      response.status(200).json({
        data: {
          completed: true,
        },
      });
    } catch (error) {
      next(error);
    }
  },
);