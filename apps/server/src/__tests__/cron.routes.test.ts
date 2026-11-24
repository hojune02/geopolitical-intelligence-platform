import request from 'supertest';

import { beforeEach, describe, expect, it, vi } from 'vitest';

const { runCycle } = vi.hoisted(() => ({ runCycle: vi.fn() }));

vi.mock('../services/gdelt/gdelt-ingestion.service.js', async (importOriginal) => {
  const original =
    await importOriginal<typeof import('../services/gdelt/gdelt-ingestion.service.js')>();

  return {
    ...original,
    runGdeltIngestionCycle: runCycle,
  };
});

const { app } = await import('../app.js');

const { env } = await import('../config/env.js');

const { IngestionCycleError } = await import('../services/gdelt/gdelt-ingestion.service.js');

const authorization = `Bearer ${env.CRON_SECRET}`;

describe('GET /internal/cron/gdelt-ingest', () => {
  beforeEach(() => {
    runCycle.mockReset();
  });

  it('rejects requests without the cron secret', async () => {
    const response = await request(app).get('/internal/cron/gdelt-ingest');

    expect(response.status).toBe(401);
    expect(runCycle).not.toHaveBeenCalled();
  });

  it('returns the cycle summary on success', async () => {
    runCycle.mockResolvedValue({ ingested: 2, budgetExhausted: false });

    const response = await request(app)
      .get('/internal/cron/gdelt-ingest')
      .set('authorization', authorization);

    expect(response.status).toBe(200);
    expect(response.body.data.completed).toBe(true);
  });

  it.each([
    ['manifest', 502, 'GDELT_MANIFEST_UNAVAILABLE'],
    ['database', 503, 'DATABASE_UNAVAILABLE'],
    ['batches', 500, 'GDELT_BATCHES_FAILED'],
  ] as const)('maps a %s failure to %i', async (stage, status, code) => {
    runCycle.mockRejectedValue(new IngestionCycleError(stage, 'boom'));

    const response = await request(app)
      .get('/internal/cron/gdelt-ingest')
      .set('authorization', authorization);

    expect(response.status).toBe(status);
    expect(response.body.error).toMatchObject({ code, stage, message: 'boom' });
  });
});
