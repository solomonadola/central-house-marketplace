import { describe, expect, it } from 'vitest';
import { api, createListing, createUser, signedInAgent } from './helpers.js';
import User from '../models/user.model.js';

const ids = (docs) => docs.map((d) => d.toString());

describe('favorites', () => {
  it('starts empty and is returned on sign-in', async () => {
    const user = await createUser();
    const res = await api().post('/api/auth/signin').send({ email: user.email, password: 'password123' });

    expect(res.body.favorites).toEqual([]);
  });

  it('saves and lists favorites', async () => {
    const user = await createUser();
    const owner = await createUser();
    const a = await createListing(owner, { name: 'First Saved Listing' });
    const b = await createListing(owner, { name: 'Second Saved Listing' });
    const agent = await signedInAgent(user);

    await agent.put(`/api/user/favorites/${a._id}`).expect(200);
    const res = await agent.put(`/api/user/favorites/${b._id}`).expect(200);

    expect(res.body.favorites).toEqual([a._id.toString(), b._id.toString()]);
    const list = await agent.get('/api/user/favorites').expect(200);
    expect(list.body.map((l) => l.name)).toEqual(['First Saved Listing', 'Second Saved Listing']);
  });

  it('does not duplicate a listing saved twice', async () => {
    const user = await createUser();
    const listing = await createListing(await createUser());
    const agent = await signedInAgent(user);

    await agent.put(`/api/user/favorites/${listing._id}`);
    const res = await agent.put(`/api/user/favorites/${listing._id}`);

    expect(res.body.favorites).toHaveLength(1);
  });

  it('removes a favorite', async () => {
    const user = await createUser();
    const listing = await createListing(await createUser());
    const agent = await signedInAgent(user);
    await agent.put(`/api/user/favorites/${listing._id}`);

    const res = await agent.delete(`/api/user/favorites/${listing._id}`).expect(200);

    expect(res.body.favorites).toEqual([]);
  });

  it('returns 404 when saving a listing that does not exist', async () => {
    const agent = await signedInAgent(await createUser());

    const res = await agent.put('/api/user/favorites/0123456789abcdef01234567');

    expect(res.status).toBe(404);
  });

  it('returns 400 for a malformed id', async () => {
    const agent = await signedInAgent(await createUser());
    expect((await agent.put('/api/user/favorites/abc')).status).toBe(400);
  });

  it('requires sign-in', async () => {
    expect((await api().get('/api/user/favorites')).status).toBe(401);
  });

  it('removes a deleted listing from everyone’s favorites', async () => {
    const owner = await createUser();
    const fan = await createUser();
    const listing = await createListing(owner);
    const keep = await createListing(owner);
    const fanAgent = await signedInAgent(fan);
    await fanAgent.put(`/api/user/favorites/${listing._id}`);
    await fanAgent.put(`/api/user/favorites/${keep._id}`);

    await (await signedInAgent(owner)).delete(`/api/listing/delete/${listing._id}`).expect(200);

    expect(ids((await User.findById(fan._id)).favorites)).toEqual([keep._id.toString()]);
  });

  it('removes a deleted account’s listings from everyone’s favorites', async () => {
    const owner = await createUser();
    const fan = await createUser();
    const listing = await createListing(owner);
    const other = await createListing(await createUser());
    const fanAgent = await signedInAgent(fan);
    await fanAgent.put(`/api/user/favorites/${listing._id}`);
    await fanAgent.put(`/api/user/favorites/${other._id}`);

    await (await signedInAgent(owner)).delete(`/api/user/delete/${owner._id}`).expect(200);

    expect(ids((await User.findById(fan._id)).favorites)).toEqual([other._id.toString()]);
  });

  it('skips favorites whose listing no longer exists', async () => {
    const user = await createUser();
    const listing = await createListing(await createUser());
    await User.updateOne(
      { _id: user._id },
      { favorites: [listing._id, '0123456789abcdef01234567'] }
    );
    const agent = await signedInAgent(user);

    const res = await agent.get('/api/user/favorites');

    expect(res.body).toHaveLength(1);
  });

  it("does not expose a user's favorites to others", async () => {
    const user = await createUser();
    const listing = await createListing(await createUser());
    await (await signedInAgent(user)).put(`/api/user/favorites/${listing._id}`);

    const res = await (await signedInAgent(await createUser())).get(`/api/user/${user._id}`);

    expect(res.body).not.toHaveProperty('favorites');
  });
});
