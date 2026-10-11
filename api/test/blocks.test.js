import { describe, expect, it } from 'vitest';
import { createListing, createUser, signedInAgent } from './helpers.js';
import User from '../models/user.model.js';
import { isBlockedBetween } from '../utils/blocks.js';

const setup = async () => {
  const owner = await createUser({ username: 'owner_user' });
  const pest = await createUser({ username: 'pest_user' });
  const listing = await createListing(owner);
  return { owner, pest, listing, ownerAgent: await signedInAgent(owner), pestAgent: await signedInAgent(pest) };
};

const message = (agent, listing) =>
  agent.post('/api/messages/conversations').send({ listingId: listing._id.toString(), body: 'Hello again' });

describe('blocking', () => {
  it('blocks and unblocks a user, listing them for the blocker only', async () => {
    const { pest, ownerAgent, pestAgent } = await setup();

    const res = await ownerAgent.put(`/api/user/blocks/${pest._id}`);
    expect(res.body).toEqual({ blocked: true, count: 1 });
    // Blocking twice is harmless.
    expect((await ownerAgent.put(`/api/user/blocks/${pest._id}`)).body.count).toBe(1);

    const list = await ownerAgent.get('/api/user/blocks');
    expect(list.body).toEqual([expect.objectContaining({ username: 'pest_user' })]);
    expect(list.body[0]).not.toHaveProperty('email');
    expect((await ownerAgent.get(`/api/user/blocks/${pest._id}`)).body).toEqual({ blocked: true });
    expect((await pestAgent.get('/api/user/blocks')).body).toEqual([]);

    expect((await ownerAgent.delete(`/api/user/blocks/${pest._id}`)).body).toEqual({ blocked: false, count: 0 });
  });

  it('works in both directions', async () => {
    const { owner, pest, ownerAgent } = await setup();
    await ownerAgent.put(`/api/user/blocks/${pest._id}`);

    expect(await isBlockedBetween(owner._id, pest._id)).toBe(true);
    expect(await isBlockedBetween(pest._id, owner._id)).toBe(true);
    expect(await isBlockedBetween(owner._id, (await createUser())._id)).toBe(false);
  });

  it('stops new conversations and replies either way', async () => {
    const { pest, listing, ownerAgent, pestAgent } = await setup();
    const started = await message(pestAgent, listing);
    expect(started.status).toBe(201);
    const pestListing = await createListing(pest);

    await ownerAgent.put(`/api/user/blocks/${pest._id}`);

    const again = await message(pestAgent, listing);
    expect(again.status).toBe(403);
    expect(again.body.code).toBe('BLOCKED');
    expect((await pestAgent.post(`/api/messages/conversations/${started.body.conversationId}/messages`).send({ body: 'Hi?' })).status).toBe(403);
    expect((await ownerAgent.post(`/api/messages/conversations/${started.body.conversationId}/messages`).send({ body: 'Bye' })).status).toBe(403);
    expect((await message(ownerAgent, pestListing)).status).toBe(403);
  });

  it('stops viewing requests and questions on the blocker’s listings', async () => {
    const { pest, listing, ownerAgent, pestAgent } = await setup();
    await ownerAgent.put(`/api/user/blocks/${pest._id}`);

    const viewing = await pestAgent.post('/api/viewings').send({
      listingId: listing._id.toString(),
      startsAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
    });
    const question = await pestAgent.post(`/api/questions/listing/${listing._id}`).send({ question: 'Still available?' });

    expect(viewing.status).toBe(403);
    expect(question.status).toBe(403);
  });

  it('allows contact again after unblocking', async () => {
    const { pest, listing, ownerAgent, pestAgent } = await setup();
    await ownerAgent.put(`/api/user/blocks/${pest._id}`);
    await ownerAgent.delete(`/api/user/blocks/${pest._id}`);

    expect((await message(pestAgent, listing)).status).toBe(201);
  });

  it("doesn't block yourself, admins or unknown users", async () => {
    const { owner, ownerAgent } = await setup();
    const admin = await createUser({ role: 'admin' });

    expect((await ownerAgent.put(`/api/user/blocks/${owner._id}`)).status).toBe(400);
    expect((await ownerAgent.put(`/api/user/blocks/${admin._id}`)).status).toBe(400);
    expect((await ownerAgent.put('/api/user/blocks/0123456789abcdef01234567')).status).toBe(404);
    expect((await ownerAgent.put('/api/user/blocks/abc')).status).toBe(400);
  });

  it('keeps the block list out of profile responses', async () => {
    const { owner, pest, ownerAgent } = await setup();
    await ownerAgent.put(`/api/user/blocks/${pest._id}`);

    const res = await ownerAgent.post(`/api/user/update/${owner._id}`).send({ username: 'renamed_owner' });

    expect(res.body).not.toHaveProperty('blockedUsers');
  });

  it('removes a deleted account from block lists', async () => {
    const { owner, pest, ownerAgent, pestAgent } = await setup();
    await ownerAgent.put(`/api/user/blocks/${pest._id}`);

    await pestAgent.delete(`/api/user/delete/${pest._id}`).expect(200);

    expect((await User.findById(owner._id).select('+blockedUsers')).blockedUsers).toEqual([]);
  });
});
