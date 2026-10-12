import { beforeEach, describe, expect, it, vi } from 'vitest';
import jwt from 'jsonwebtoken';
import { api, createUser, PASSWORD, signedInAgent } from './helpers.js';
import User from '../models/user.model.js';
import { sendMail } from '../utils/mailer.js';
import { generateCode } from '../utils/twoFactor.js';
import { maskEmail } from '../controllers/auth.controller.js';

vi.mock('../utils/mailer.js', () => ({ sendMail: vi.fn(), appUrl: () => 'https://app.test' }));

const lastCode = () => vi.mocked(sendMail).mock.calls.at(-1)[0].subject.match(/(\d{6})$/)[1];

const signin = (user) => api().post('/api/auth/signin').send({ email: user.email, password: PASSWORD });
const verify = (challengeToken, code) => api().post('/api/auth/verify-2fa').send({ challengeToken, code });

const authCookie = (res) => (res.headers['set-cookie'] || []).find((c) => c.startsWith('access_token=') && !c.startsWith('access_token=;'));

describe('two-step sign-in helpers', () => {
  it('generates 6-digit codes', () => {
    for (let i = 0; i < 50; i++) expect(generateCode()).toMatch(/^\d{6}$/);
  });

  it('masks emails', () => {
    expect(maskEmail('sarah@example.com')).toBe('s****@example.com');
    expect(maskEmail('al@example.com')).toBe('a*@example.com');
  });
});

describe('signing in with two-step sign-in', () => {
  beforeEach(() => {
    vi.mocked(sendMail).mockReset().mockResolvedValue();
  });

  it('signs in directly when it is off', async () => {
    const user = await createUser();
    const res = await signin(user);
    expect(res.body).not.toHaveProperty('twoFactorRequired');
    expect(authCookie(res)).toBeDefined();
  });

  it('asks for an emailed code instead of starting a session', async () => {
    const user = await createUser({ username: 'sarah', email: 'sarah@example.com', twoFactorEnabled: true });

    const res = await signin(user);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ twoFactorRequired: true, challengeToken: expect.any(String), email: 's****@example.com' });
    expect(authCookie(res)).toBeUndefined();
    expect(sendMail).toHaveBeenCalledWith(expect.objectContaining({ to: 'sarah@example.com', subject: expect.stringMatching(/^Your sign-in code: \d{6}$/) }));
  });

  it('starts the session with the right code, once', async () => {
    const user = await createUser({ twoFactorEnabled: true });
    const { challengeToken } = (await signin(user)).body;
    const code = lastCode();

    const res = await verify(challengeToken, code);

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ _id: user._id.toString() });
    expect(res.body).not.toHaveProperty('password');
    expect(res.body).not.toHaveProperty('twoFactorCodeHash');
    expect(authCookie(res)).toBeDefined();
    // The code can't be used again.
    expect((await verify(challengeToken, code)).status).toBe(400);
  });

  it('rejects wrong codes and locks after 5 attempts', async () => {
    const user = await createUser({ twoFactorEnabled: true });
    const { challengeToken } = (await signin(user)).body;
    const code = lastCode();
    const wrong = code === '000000' ? '111111' : '000000';

    for (let i = 0; i < 4; i++) expect((await verify(challengeToken, wrong)).status).toBe(401);
    expect((await verify(challengeToken, wrong)).status).toBe(429);
    // Even the right code is refused once locked.
    expect((await verify(challengeToken, code)).status).toBe(429);
  });

  it('rejects expired codes', async () => {
    const user = await createUser({ twoFactorEnabled: true });
    const { challengeToken } = (await signin(user)).body;
    await User.updateOne({ _id: user._id }, { twoFactorExpires: new Date(Date.now() - 1000) });

    const res = await verify(challengeToken, lastCode());

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/expired/);
  });

  it('rejects forged or ordinary session tokens as challenges', async () => {
    const user = await createUser({ twoFactorEnabled: true });
    await signin(user);
    const code = lastCode();
    const forged = jwt.sign({ id: user._id.toString(), purpose: 'two-factor' }, 'not-the-secret');
    const session = jwt.sign({ id: user._id.toString() }, process.env.JWT_SECRET);

    expect((await verify(forged, code)).status).toBe(401);
    expect((await verify(session, code)).status).toBe(401);
  });

  it('validates the code format', async () => {
    const res = await verify('token', '12ab');
    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Enter the 6-digit code from the email');
  });

  it('resends a fresh code that replaces the old one', async () => {
    const user = await createUser({ twoFactorEnabled: true });
    const first = (await signin(user)).body;
    const oldCode = lastCode();

    const resent = await api().post('/api/auth/resend-2fa').send({ challengeToken: first.challengeToken });
    const newCode = lastCode();

    expect(resent.status).toBe(200);
    expect(sendMail).toHaveBeenCalledTimes(2);
    if (oldCode !== newCode) expect((await verify(resent.body.challengeToken, oldCode)).status).toBe(401);
    expect((await verify(resent.body.challengeToken, newCode)).status).toBe(200);
  });

  it('does not let suspended users through the code step', async () => {
    const user = await createUser({ twoFactorEnabled: true });
    const { challengeToken } = (await signin(user)).body;
    await User.updateOne({ _id: user._id }, { suspended: true });

    expect((await verify(challengeToken, lastCode())).status).toBe(403);
  });
});

describe('turning two-step sign-in on and off', () => {
  it('requires the current password', async () => {
    const user = await createUser();
    const agent = await signedInAgent(user);

    expect((await agent.post('/api/user/two-factor').send({ enabled: true, password: 'wrong-password' })).status).toBe(401);
    const on = await agent.post('/api/user/two-factor').send({ enabled: true, password: PASSWORD });
    expect(on.body).toEqual({ twoFactorEnabled: true });
    expect((await signin(user)).body.twoFactorRequired).toBe(true);

    const off = await agent.post('/api/user/two-factor').send({ enabled: false, password: PASSWORD });
    expect(off.body).toEqual({ twoFactorEnabled: false });
  });

  it('needs a confirmed email to turn it on', async () => {
    const user = await createUser({ emailVerified: false });
    const agent = await signedInAgent(user);

    const res = await agent.post('/api/user/two-factor').send({ enabled: true, password: PASSWORD });

    expect(res.status).toBe(400);
  });

  it('requires sign-in', async () => {
    expect((await api().post('/api/user/two-factor').send({ enabled: true, password: 'x' })).status).toBe(401);
  });
});
