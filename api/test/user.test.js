import { describe, expect, it, vi } from 'vitest';
import bcryptjs from 'bcryptjs';
import { api, createListing, createUser, PASSWORD, signedInAgent } from './helpers.js';
import User from '../models/user.model.js';
import Listing from '../models/listing.model.js';

// Signup and email changes send verification emails; keep test output quiet.
vi.mock('../utils/mailer.js', () => ({ sendMail: vi.fn(), appUrl: () => 'https://app.test' }));

describe('POST /api/user/update/:id', () => {
  it('updates the profile and never returns the password', async () => {
    const user = await createUser();
    const agent = await signedInAgent(user);

    const res = await agent
      .post(`/api/user/update/${user._id}`)
      .send({ username: 'renamed', avatar: 'https://example.com/me.png' });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ username: 'renamed', avatar: 'https://example.com/me.png' });
    expect(res.body).not.toHaveProperty('password');
  });

  it('hashes a new password', async () => {
    const user = await createUser();
    const agent = await signedInAgent(user);

    await agent.post(`/api/user/update/${user._id}`).send({ password: 'brandnewpass' });

    const stored = await User.findById(user._id);
    expect(stored.password).not.toBe('brandnewpass');
    expect(bcryptjs.compareSync('brandnewpass', stored.password)).toBe(true);
  });

  it('treats empty fields from the form as unchanged', async () => {
    const user = await createUser();
    const agent = await signedInAgent(user);

    const res = await agent
      .post(`/api/user/update/${user._id}`)
      .send({ username: '', email: '', password: '' });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ username: user.username, email: user.email });
    // The old password still works.
    await expect(signedInAgent(user, PASSWORD)).resolves.toBeDefined();
  });

  it('rejects a short new password', async () => {
    const user = await createUser();
    const agent = await signedInAgent(user);

    const res = await agent.post(`/api/user/update/${user._id}`).send({ password: 'short' });

    expect(res.status).toBe(400);
  });

  it('returns 409 when the email is taken', async () => {
    const user = await createUser();
    const other = await createUser();
    const agent = await signedInAgent(user);

    const res = await agent.post(`/api/user/update/${user._id}`).send({ email: other.email });

    expect(res.status).toBe(409);
    expect(res.body.message).toBe('Email is already taken!');
  });

  it("forbids updating another user's account", async () => {
    const victim = await createUser();
    const agent = await signedInAgent(await createUser());

    const res = await agent.post(`/api/user/update/${victim._id}`).send({ username: 'hacked' });

    expect(res.status).toBe(401);
    expect((await User.findById(victim._id)).username).toBe(victim.username);
  });
});

describe('DELETE /api/user/delete/:id', () => {
  it('deletes the account, its listings, and signs out', async () => {
    const user = await createUser();
    const other = await createUser();
    await createListing(user);
    await createListing(user);
    const otherListing = await createListing(other);
    const agent = await signedInAgent(user);

    const res = await agent.delete(`/api/user/delete/${user._id}`);

    expect(res.status).toBe(200);
    expect(res.headers['set-cookie'][0]).toMatch(/access_token=;/);
    expect(await User.findById(user._id)).toBeNull();
    expect(await Listing.countDocuments({ userRef: user._id.toString() })).toBe(0);
    expect(await Listing.findById(otherListing._id)).not.toBeNull();
  });

  it("forbids deleting another user's account", async () => {
    const victim = await createUser();
    const agent = await signedInAgent(await createUser());

    const res = await agent.delete(`/api/user/delete/${victim._id}`);

    expect(res.status).toBe(401);
    expect(await User.findById(victim._id)).not.toBeNull();
  });
});

describe('GET /api/user/listings/:id', () => {
  it("returns only the user's own listings", async () => {
    const user = await createUser();
    await createListing(user, { name: 'My First Listing Here' });
    await createListing(await createUser(), { name: 'Somebody Elses Listing' });
    const agent = await signedInAgent(user);

    const res = await agent.get(`/api/user/listings/${user._id}`);

    expect(res.status).toBe(200);
    expect(res.body.map((l) => l.name)).toEqual(['My First Listing Here']);
  });

  it("forbids listing another user's listings", async () => {
    const other = await createUser();
    const agent = await signedInAgent(await createUser());

    const res = await agent.get(`/api/user/listings/${other._id}`);

    expect(res.status).toBe(401);
  });
});

describe('GET /api/user/:id', () => {
  it("returns another user's public profile only", async () => {
    const user = await createUser();
    const agent = await signedInAgent(await createUser());

    const res = await agent.get(`/api/user/${user._id}`);

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ username: user.username, avatar: user.avatar });
    expect(res.body).not.toHaveProperty('password');
    expect(res.body).not.toHaveProperty('email');
  });

  it('includes the email when users look themselves up', async () => {
    const user = await createUser();
    const agent = await signedInAgent(user);

    const res = await agent.get(`/api/user/${user._id}`);

    expect(res.body.email).toBe(user.email);
  });

  it('requires sign-in', async () => {
    const user = await createUser();
    const res = await api().get(`/api/user/${user._id}`);
    expect(res.status).toBe(401);
  });

  it('returns 404 for an unknown user and 400 for a malformed id', async () => {
    const agent = await signedInAgent(await createUser());

    expect((await agent.get('/api/user/0123456789abcdef01234567')).status).toBe(404);
    expect((await agent.get('/api/user/abc')).status).toBe(400);
  });
});
