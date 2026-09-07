import request from 'supertest';

import { describe, expect, it } from 'vitest';

import { app } from '../app.js';

describe('Express application', () => {
  it('responds to health checks', async () => {
    const response = await request(app).get('/health');

    expect(response.status).toBe(200);

    expect(response.body).toBeTypeOf('object');
  });

  it('returns 404 for unknown routes', async () => {
    const response = await request(app).get('/definitely-not-a-route');

    expect(response.status).toBe(404);
  });
});
