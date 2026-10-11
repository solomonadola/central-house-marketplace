import { beforeEach, describe, expect, it, vi } from 'vitest';
import { api, createUser, signedInAgent, validListing } from './helpers.js';
import User from '../models/user.model.js';
import { sendMail } from '../utils/mailer.js';
import { verifyFirebaseIdToken } from '../utils/firebase.js';

vi.mock('../utils/mailer.js', () => ({ sendMail: vi.fn(), appUrl: () => 'https://app.test' }));
vi.mock('../utils/firebase.js', () => ({ verifyFirebaseIdToken: vi.fn() }));

const lastVerifyToken = () => {
  const { text } = vi.mocked(sendMail).mock.calls.at(-1)[0];
  return text.match(/verify-email\/([\w-]+)/)[1];
};

const signup = (overrides = {}) =>
  api()
    .post('/api/auth/signup')
    .send({ username: 'newbie', email: 'newbie@example.com', password: 'longenough', ...overrides });

describe('email verification', () => {
  beforeEach(() => {
    vi.mocked(sendMail).mockReset().mockResolvedValue();
  });

  it('sends a confirmation link on signup and starts unverified', async () => {
    await signup().expect(201);

    expect(sendMail).toHaveBeenCalledWith(
      expect.objectContaining({ to: 'newbie@example.com', subject: 'Confirm your email address' })
    );
    expect(vi.mocked(sendMail).mock.calls[0][0].text).toContain('https://app.test/verify-email/');
    expect((await User.findOne({ email: 'newbie@example.com' })).emailVerified).toBe(false);
  });

  it('confirms the email with the link and returns the updated user', async () => {
    await signup();

    const res = await api().post('/api/auth/verify-email').send({ token: lastVerifyToken() });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ email: 'newbie@example.com', emailVerified: true });
    expect(res.body).not.toHaveProperty('password');
    expect(res.body).not.toHaveProperty('emailVerifyTokenHash');
  });

  it('rejects used, expired and made-up links', async () => {
    await signup();
    const token = lastVerifyToken();
    await api().post('/api/auth/verify-email').send({ token }).expect(200);

    expect((await api().post('/api/auth/verify-email').send({ token })).status).toBe(400);
    expect((await api().post('/api/auth/verify-email').send({ token: 'made-up' })).status).toBe(400);

    await signup({ username: 'second', email: 'second@example.com' });
    await User.updateOne({ email: 'second@example.com' }, { emailVerifyExpires: new Date(Date.now() - 1000) });
    expect((await api().post('/api/auth/verify-email').send({ token: lastVerifyToken() })).status).toBe(400);
  });

  it('blocks unverified users from posting listings', async () => {
    const user = await createUser({ emailVerified: false });
    const agent = await signedInAgent(user);

    const res = await agent.post('/api/listing/create').send(validListing());

    expect(res.status).toBe(403);
    expect(res.body.code).toBe('EMAIL_NOT_VERIFIED');
  });

  it('lets unverified users message owners', async () => {
    const owner = await createUser();
    const listing = await (await signedInAgent(owner)).post('/api/listing/create').send(validListing());
    const agent = await signedInAgent(await createUser({ emailVerified: false }));

    const res = await agent.post('/api/messages/conversations').send({ listingId: listing.body._id, body: 'Hi' });

    expect(res.status).toBe(201);
  });

  it('resends the link to unverified users', async () => {
    const user = await createUser({ emailVerified: false });
    const agent = await signedInAgent(user);

    const res = await agent.post('/api/auth/resend-verification');

    expect(res.status).toBe(200);
    expect(sendMail).toHaveBeenCalledWith(expect.objectContaining({ to: user.email }));
    await api().post('/api/auth/verify-email').send({ token: lastVerifyToken() }).expect(200);
  });

  it('does not resend to verified users', async () => {
    const agent = await signedInAgent(await createUser());

    expect((await agent.post('/api/auth/resend-verification')).status).toBe(400);
    expect(sendMail).not.toHaveBeenCalled();
  });

  it('requires confirming a changed email address', async () => {
    const user = await createUser();
    const agent = await signedInAgent(user);

    const res = await agent.post(`/api/user/update/${user._id}`).send({ email: 'new-address@example.com' });

    expect(res.body.emailVerified).toBe(false);
    expect(sendMail).toHaveBeenCalledWith(expect.objectContaining({ to: 'new-address@example.com' }));
    expect((await agent.post('/api/listing/create').send(validListing())).status).toBe(403);
  });

  it('keeps verification when other profile fields change', async () => {
    const user = await createUser();
    const agent = await signedInAgent(user);

    const res = await agent.post(`/api/user/update/${user._id}`).send({ username: 'renamed', email: user.email });

    expect(res.body.emailVerified).toBe(true);
    expect(sendMail).not.toHaveBeenCalled();
  });

  it('treats Google sign-in as verified', async () => {
    const existing = await createUser({ email: 'ada@gmail.com', emailVerified: false });
    vi.mocked(verifyFirebaseIdToken).mockResolvedValue({ email: 'ada@gmail.com', email_verified: true, name: 'Ada' });

    const res = await api().post('/api/auth/google').send({ idToken: 'valid' });

    expect(res.body).toMatchObject({ _id: existing._id.toString(), emailVerified: true });

    vi.mocked(verifyFirebaseIdToken).mockResolvedValue({ email: 'grace@gmail.com', email_verified: true, name: 'Grace' });
    const created = await api().post('/api/auth/google').send({ idToken: 'valid' });
    expect(created.body.emailVerified).toBe(true);
  });
});
