import { describe, expect, it } from 'vitest';
import { api } from './helpers.js';

describe('app', () => {
  it('returns JSON 404 for unknown API routes', async () => {
    const res = await api().get('/api/does-not-exist');
    expect(res.status).toBe(404);
    expect(res.body).toMatchObject({ success: false, statusCode: 404 });
  });
});
