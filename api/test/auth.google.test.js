import { beforeEach, describe, expect, it, vi } from 'vitest';
import { api, createUser } from './helpers.js';
import User from '../models/user.model.js';
import { verifyFirebaseIdToken } from '../utils/firebase.js';

vi.mock('../utils/firebase.js', () => ({ verifyFirebaseIdToken: vi.fn() }));

const googleToken = (claims = {}) => ({
  email: 'ada@gmail.com',
  email_verified: true,
  name: 'Ada Lovelace',
  picture: 'https://lh3.googleusercontent.com/ada.jpg',
  ...claims,
});

describe('POST /api/auth/google', () => {
  beforeEach(() => {
    vi.mocked(verifyFirebaseIdToken).mockReset();
  });

  it('creates an account from the verified token', async () => {
    vi.mocked(verifyFirebaseIdToken).mockResolvedValue(googleToken());

    const res = await api().post('/api/auth/google').send({ idToken: 'valid' });

    expect(res.status).toBe(200);
    expect(verifyFirebaseIdToken).toHaveBeenCalledWith('valid');
    expect(res.body).toMatchObject({ email: 'ada@gmail.com', avatar: googleToken().picture });
    expect(res.body.username).toMatch(/^adalovelace[a-z0-9]{4}$/);
    expect(res.body).not.toHaveProperty('password');
    expect(res.headers['set-cookie'][0]).toMatch(/^access_token=/);
  });

  it('signs in an existing account with the same email', async () => {
    const user = await createUser({ email: 'ada@gmail.com' });
    vi.mocked(verifyFirebaseIdToken).mockResolvedValue(googleToken());

    const res = await api().post('/api/auth/google').send({ idToken: 'valid' });

    expect(res.status).toBe(200);
    expect(res.body._id).toBe(user._id.toString());
    expect(await User.countDocuments()).toBe(1);
  });

  it('ignores identity fields in the request body', async () => {
    const victim = await createUser({ email: 'victim@example.com' });
    vi.mocked(verifyFirebaseIdToken).mockResolvedValue(googleToken());

    const res = await api()
      .post('/api/auth/google')
      .send({ idToken: 'valid', email: victim.email, name: 'Victim' });

    expect(res.body.email).toBe('ada@gmail.com');
    expect(res.body._id).not.toBe(victim._id.toString());
  });

  it('rejects a request with only an email (the old takeover)', async () => {
    const victim = await createUser({ email: 'victim@example.com' });

    const res = await api().post('/api/auth/google').send({ email: victim.email });

    expect(res.status).toBe(400);
    expect(res.headers['set-cookie']).toBeUndefined();
    expect(verifyFirebaseIdToken).not.toHaveBeenCalled();
  });

  it('rejects a token that fails verification', async () => {
    vi.mocked(verifyFirebaseIdToken).mockRejectedValue(new Error('bad signature'));

    const res = await api().post('/api/auth/google').send({ idToken: 'forged' });

    expect(res.status).toBe(401);
    expect(res.body.message).toBe('Invalid Google ID token!');
    expect(await User.countDocuments()).toBe(0);
  });

  it('rejects an unverified email', async () => {
    vi.mocked(verifyFirebaseIdToken).mockResolvedValue(googleToken({ email_verified: false }));

    const res = await api().post('/api/auth/google').send({ idToken: 'valid' });

    expect(res.status).toBe(401);
    expect(await User.countDocuments()).toBe(0);
  });

  it('falls back to the email name when the token has no name', async () => {
    vi.mocked(verifyFirebaseIdToken).mockResolvedValue(googleToken({ name: undefined }));

    const res = await api().post('/api/auth/google').send({ idToken: 'valid' });

    expect(res.status).toBe(200);
    expect(res.body.username).toMatch(/^ada[a-z0-9]{4}$/);
  });
});
