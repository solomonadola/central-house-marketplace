import { describe, expect, it, vi } from 'vitest';
import jwt from 'jsonwebtoken';
import { api, createUser, PASSWORD, signedInAgent, validListing } from './helpers.js';
import Listing from '../models/listing.model.js';
import User from '../models/user.model.js';

// Signup and email changes send verification emails; keep test output quiet.
vi.mock('../utils/mailer.js', () => ({ sendMail: vi.fn(), appUrl: () => 'https://app.test' }));

const getAuthCookie = (res) =>
  (res.headers['set-cookie'] || []).find((c) => c.startsWith('access_token='));

describe('POST /api/auth/signup', () => {
  const body = { username: 'newuser', email: 'new@example.com', password: 'longenough' };

  it('creates a user with a hashed password', async () => {
    const res = await api().post('/api/auth/signup').send(body);

    expect(res.status).toBe(201);
    const user = await User.findOne({ email: body.email });
    expect(user.username).toBe('newuser');
    expect(user.password).not.toBe(body.password);
  });

  it.each([
    ['missing password', { password: undefined }, 'password is required'],
    ['short password', { password: 'short' }, 'Password must be at least 8 characters'],
    ['invalid email', { email: 'not-an-email' }, 'Invalid email address'],
    ['short username', { username: 'ab' }, 'Username must be at least 3 characters'],
    ['username with spaces', { username: 'has space' }, 'Username can only contain'],
  ])('rejects %s', async (_, override, message) => {
    const res = await api().post('/api/auth/signup').send({ ...body, ...override });

    expect(res.status).toBe(400);
    expect(res.body.message).toContain(message);
    expect(await User.countDocuments()).toBe(0);
  });

  it('returns 409 for a taken username', async () => {
    await createUser({ username: 'newuser' });
    const res = await api().post('/api/auth/signup').send(body);

    expect(res.status).toBe(409);
    expect(res.body.message).toBe('Username is already taken!');
  });

  it('returns 409 for a taken email', async () => {
    await createUser({ email: body.email });
    const res = await api().post('/api/auth/signup').send(body);

    expect(res.status).toBe(409);
    expect(res.body.message).toBe('Email is already taken!');
  });

  it('ignores extra fields', async () => {
    await api().post('/api/auth/signup').send({ ...body, avatar: 'https://evil.example/x.png', isAdmin: true });

    const user = await User.findOne({ email: body.email }).lean();
    expect(user.avatar).not.toBe('https://evil.example/x.png');
    expect(user).not.toHaveProperty('isAdmin');
  });
});

describe('POST /api/auth/signin', () => {
  it('returns the user without the password and sets an auth cookie', async () => {
    const user = await createUser();
    const res = await api().post('/api/auth/signin').send({ email: user.email, password: PASSWORD });

    expect(res.status).toBe(200);
    expect(res.body.email).toBe(user.email);
    expect(res.body).not.toHaveProperty('password');
    expect(getAuthCookie(res)).toBeDefined();
  });

  it('sets an httpOnly, SameSite=Lax cookie with a 7-day token', async () => {
    const user = await createUser();
    const res = await api().post('/api/auth/signin').send({ email: user.email, password: PASSWORD });
    const cookie = getAuthCookie(res);

    expect(cookie).toMatch(/HttpOnly/);
    expect(cookie).toMatch(/SameSite=Lax/);
    expect(cookie).toMatch(/Max-Age=604800/);

    const token = cookie.split(';')[0].split('=')[1];
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    expect(payload.id).toBe(user._id.toString());
    expect(payload.exp - payload.iat).toBe(7 * 24 * 60 * 60);
  });

  it('rejects a wrong password', async () => {
    const user = await createUser();
    const res = await api().post('/api/auth/signin').send({ email: user.email, password: 'wrongpass' });

    expect(res.status).toBe(401);
    expect(getAuthCookie(res)).toBeUndefined();
  });

  it('returns 404 for an unknown email', async () => {
    const res = await api().post('/api/auth/signin').send({ email: 'nobody@example.com', password: PASSWORD });
    expect(res.status).toBe(404);
  });

  it('rejects query operators in place of an email', async () => {
    await createUser();
    const res = await api().post('/api/auth/signin').send({ email: { $ne: null }, password: PASSWORD });
    expect(res.status).toBe(400);
  });

  it('lets accounts with short legacy passwords sign in', async () => {
    const user = await createUser({ password: 'abc' });
    const res = await api().post('/api/auth/signin').send({ email: user.email, password: 'abc' });
    expect(res.status).toBe(200);
  });
});

describe('GET /api/auth/signout', () => {
  it('clears the auth cookie', async () => {
    const res = await api().get('/api/auth/signout');

    expect(res.status).toBe(200);
    expect(getAuthCookie(res)).toMatch(/Expires=Thu, 01 Jan 1970/);
  });
});

describe('protected routes', () => {
  it('reject requests without a token', async () => {
    const res = await api().post('/api/listing/create').send({});
    expect(res.status).toBe(401);
    expect(res.body.code).toBe('AUTH_REQUIRED');
  });

  it('reject an expired token', async () => {
    const user = await createUser();
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: -10 });
    const res = await api().post('/api/listing/create').set('Cookie', `access_token=${token}`).send({});
    expect(res.status).toBe(401);
    expect(res.body.code).toBe('AUTH_REQUIRED');
  });

  it('reject a token signed with another secret', async () => {
    const user = await createUser();
    const token = jwt.sign({ id: user._id }, 'not-the-secret');
    const res = await api().post('/api/listing/create').set('Cookie', `access_token=${token}`).send({});
    expect(res.status).toBe(401);
    expect(res.body.code).toBe('AUTH_REQUIRED');
  });

  it('do not flag ownership errors as an expired session', async () => {
    const owner = await createUser();
    const listing = await Listing.create({ ...validListing(), userRef: owner._id.toString() });
    const agent = await signedInAgent(await createUser());

    const res = await agent.delete(`/api/listing/delete/${listing._id}`);

    expect(res.status).toBe(401);
    expect(res.body).not.toHaveProperty('code');
  });
});
