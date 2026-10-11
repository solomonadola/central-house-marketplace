import { describe, expect, it, vi } from 'vitest';
import jwt from 'jsonwebtoken';
import { api, createUser, PASSWORD, signedInAgent } from './helpers.js';
import User from '../models/user.model.js';
import { sendMail } from '../utils/mailer.js';

vi.mock('../utils/mailer.js', () => ({ sendMail: vi.fn(), appUrl: () => 'https://app.test' }));

// Any authenticated endpoint will do for checking a session.
const checkSession = (agent) => agent.get('/api/user/favorites');

describe('sessions', () => {
  it('keeps working while nothing changes', async () => {
    const agent = await signedInAgent(await createUser());
    expect((await checkSession(agent)).status).toBe(200);
  });

  it('accepts tokens issued before token versions existed', async () => {
    const user = await createUser();
    const legacy = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });

    const res = await api().get('/api/user/favorites').set('Cookie', `access_token=${legacy}`);

    expect(res.status).toBe(200);
  });

  it('signs out every session after a password reset', async () => {
    const user = await createUser();
    const laptop = await signedInAgent(user);
    const phone = await signedInAgent(user);

    await api().post('/api/auth/forgot-password').send({ email: user.email });
    const token = vi.mocked(sendMail).mock.calls.at(-1)[0].text.match(/reset-password\/([\w-]+)/)[1];
    await api().post('/api/auth/reset-password').send({ token, password: 'brand-new-pass' }).expect(200);

    for (const agent of [laptop, phone]) {
      const res = await checkSession(agent);
      expect(res.status).toBe(401);
      expect(res.body.code).toBe('AUTH_REQUIRED');
    }
    expect((await checkSession(await signedInAgent(user, 'brand-new-pass'))).status).toBe(200);
  });

  it('keeps the current session but signs out others after a password change', async () => {
    const user = await createUser();
    const current = await signedInAgent(user);
    const other = await signedInAgent(user);

    await current.post(`/api/user/update/${user._id}`).send({ password: 'brand-new-pass' }).expect(200);

    expect((await checkSession(current)).status).toBe(200);
    expect((await checkSession(other)).status).toBe(401);
  });

  it('does not expose the token version', async () => {
    const user = await createUser();
    const agent = await signedInAgent(user);

    const res = await agent.post(`/api/user/update/${user._id}`).send({ password: 'brand-new-pass' });

    expect(res.body).not.toHaveProperty('tokenVersion');
  });

  it('rejects sessions of deleted accounts', async () => {
    const user = await createUser();
    const agent = await signedInAgent(user);
    await User.deleteOne({ _id: user._id });

    expect((await checkSession(agent)).status).toBe(401);
  });

  it('blocks suspended users immediately and clears their cookie', async () => {
    const user = await createUser();
    const agent = await signedInAgent(user);
    await User.updateOne({ _id: user._id }, { suspended: true });

    const res = await checkSession(agent);

    expect(res.status).toBe(403);
    expect(res.body.code).toBe('ACCOUNT_SUSPENDED');
    expect(res.headers['set-cookie'][0]).toMatch(/access_token=;/);
  });

  it('does not let suspended users sign in', async () => {
    const user = await createUser({ suspended: true });

    const res = await api().post('/api/auth/signin').send({ email: user.email, password: PASSWORD });

    expect(res.status).toBe(403);
    expect(res.body.code).toBe('ACCOUNT_SUSPENDED');
    expect(res.headers['set-cookie']).toBeUndefined();
  });
});
