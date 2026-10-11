import { describe, expect, it, vi } from 'vitest';
import { api, createUser, PASSWORD } from './helpers.js';

// The limiter reads AUTH_RATE_LIMIT at import time; vi.hoisted runs before
// the imports above, and each test file gets its own module instances.
vi.hoisted(() => {
  process.env.AUTH_RATE_LIMIT = '3';
});

const signin = (email, password) => api().post('/api/auth/signin').send({ email, password });

// Tests share the limiter's per-IP counter, so order matters here.
describe('auth rate limiting', () => {
  it('does not count successful sign-ins', async () => {
    const user = await createUser();

    for (let i = 0; i < 5; i++) {
      expect((await signin(user.email, PASSWORD)).status).toBe(200);
    }
  });

  it('blocks an IP after too many failed attempts, even with the right password', async () => {
    const user = await createUser();

    for (let i = 0; i < 3; i++) {
      expect((await signin(user.email, 'wrongpass')).status).toBe(401);
    }

    const blocked = await signin(user.email, PASSWORD);
    expect(blocked.status).toBe(429);
    expect(blocked.body.message).toMatch(/Too many attempts/);
    expect(blocked.headers).toHaveProperty('ratelimit');
  });

  it('applies to signup too', async () => {
    const res = await api().post('/api/auth/signup').send({ username: 'abc', email: 'a@b.co', password: 'longenough' });
    expect(res.status).toBe(429);
  });
});
