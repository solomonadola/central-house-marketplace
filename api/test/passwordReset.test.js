import { beforeEach, describe, expect, it, vi } from 'vitest';
import { api, createUser } from './helpers.js';
import User from '../models/user.model.js';
import { sendMail } from '../utils/mailer.js';

vi.mock('../utils/mailer.js', () => ({ sendMail: vi.fn(), appUrl: () => 'https://app.test' }));

const lastResetToken = () => {
  const { text } = vi.mocked(sendMail).mock.calls.at(-1)[0];
  return text.match(/reset-password\/([\w-]+)/)[1];
};

const signin = (email, password) => api().post('/api/auth/signin').send({ email, password });

describe('password reset', () => {
  // Braces matter: a function returned from beforeEach runs as a cleanup
  // hook, and the chained mock methods return the mock itself.
  beforeEach(() => {
    vi.mocked(sendMail).mockReset().mockResolvedValue();
  });

  it('emails a reset link and lets the user set a new password', async () => {
    const user = await createUser();

    const forgot = await api().post('/api/auth/forgot-password').send({ email: user.email });
    expect(forgot.status).toBe(200);
    expect(sendMail).toHaveBeenCalledWith(expect.objectContaining({ to: user.email, subject: 'Reset your password' }));
    expect(vi.mocked(sendMail).mock.calls[0][0].text).toContain('https://app.test/reset-password/');

    const reset = await api()
      .post('/api/auth/reset-password')
      .send({ token: lastResetToken(), password: 'my-new-password' });
    expect(reset.status).toBe(200);

    expect((await signin(user.email, 'my-new-password')).status).toBe(200);
    expect((await signin(user.email, 'password123')).status).toBe(401);
  });

  it('responds the same for unknown emails and sends nothing', async () => {
    const known = await createUser();
    const a = await api().post('/api/auth/forgot-password').send({ email: known.email });
    const b = await api().post('/api/auth/forgot-password').send({ email: 'nobody@example.com' });

    expect(b.status).toBe(a.status);
    expect(b.body).toEqual(a.body);
    expect(sendMail).toHaveBeenCalledTimes(1);
  });

  it('stores only a hash of the token', async () => {
    const user = await createUser();
    await api().post('/api/auth/forgot-password').send({ email: user.email });

    const stored = await User.findById(user._id).select('+passwordResetTokenHash');
    expect(stored.passwordResetTokenHash).toMatch(/^[0-9a-f]{64}$/);
    expect(stored.passwordResetTokenHash).not.toBe(lastResetToken());
  });

  it('never returns token fields in user responses', async () => {
    const user = await createUser();
    await api().post('/api/auth/forgot-password').send({ email: user.email });

    const res = await signin(user.email, 'password123');
    expect(res.body).not.toHaveProperty('passwordResetTokenHash');
    expect(res.body).not.toHaveProperty('passwordResetExpires');
  });

  it('only works once', async () => {
    const user = await createUser();
    await api().post('/api/auth/forgot-password').send({ email: user.email });
    const token = lastResetToken();

    await api().post('/api/auth/reset-password').send({ token, password: 'first-new-pass' }).expect(200);
    const again = await api().post('/api/auth/reset-password').send({ token, password: 'second-new-pass' });

    expect(again.status).toBe(400);
    expect((await signin(user.email, 'first-new-pass')).status).toBe(200);
  });

  it('rejects an expired token', async () => {
    const user = await createUser();
    await api().post('/api/auth/forgot-password').send({ email: user.email });
    await User.updateOne({ _id: user._id }, { passwordResetExpires: new Date(Date.now() - 1000) });

    const res = await api().post('/api/auth/reset-password').send({ token: lastResetToken(), password: 'brand-new-pass' });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/invalid or has expired/);
  });

  it('only accepts the latest link', async () => {
    const user = await createUser();
    await api().post('/api/auth/forgot-password').send({ email: user.email });
    const first = lastResetToken();
    await api().post('/api/auth/forgot-password').send({ email: user.email });

    expect((await api().post('/api/auth/reset-password').send({ token: first, password: 'brand-new-pass' })).status).toBe(400);
  });

  it('rejects a made-up token', async () => {
    const res = await api().post('/api/auth/reset-password').send({ token: 'made-up', password: 'brand-new-pass' });
    expect(res.status).toBe(400);
  });

  it('requires a valid new password', async () => {
    const user = await createUser();
    await api().post('/api/auth/forgot-password').send({ email: user.email });

    const res = await api().post('/api/auth/reset-password').send({ token: lastResetToken(), password: 'short' });

    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Password must be at least 8 characters');
  });

  it('still responds normally if the email fails to send', async () => {
    const user = await createUser();
    vi.mocked(sendMail).mockImplementation(() => {
      throw new Error('SMTP down');
    });
    const logError = vi.spyOn(console, 'error').mockImplementation(() => {});

    const res = await api().post('/api/auth/forgot-password').send({ email: user.email });

    expect(res.status).toBe(200);
    expect(logError).toHaveBeenCalledWith('Could not send password reset email:', 'SMTP down');
    logError.mockRestore();
  });
});
