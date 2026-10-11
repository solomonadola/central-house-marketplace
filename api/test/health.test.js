import { describe, expect, it } from 'vitest';
import { api } from './helpers.js';

describe('GET /api/health', () => {
  it('reports the service is up', async () => {
    const res = await api().get('/api/health');

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(typeof res.body.uptime).toBe('number');
  });
});
