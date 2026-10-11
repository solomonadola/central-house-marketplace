import { describe, expect, it } from 'vitest';
import { api, createListing, createUser, signedInAgent } from './helpers.js';

describe('POST /api/messages/read-all', () => {
  it('marks every conversation read for the caller', async () => {
    const owner = await createUser();
    const buyer = await createUser();
    const listing = await createListing(owner);
    const ownerAgent = await signedInAgent(owner);
    const buyerAgent = await signedInAgent(buyer);

    await buyerAgent.post('/api/messages/conversations').send({ listingId: listing._id.toString(), body: 'Hi' });
    expect((await ownerAgent.get('/api/messages/unread-count')).body.count).toBe(1);

    const res = await ownerAgent.post('/api/messages/read-all');

    expect(res.status).toBe(200);
    expect(res.body.updated).toBe(1);
    expect((await ownerAgent.get('/api/messages/unread-count')).body.count).toBe(0);
    // The buyer's own unread state is untouched.
    expect((await buyerAgent.get('/api/messages/unread-count')).body.count).toBe(0);
  });

  it('requires sign-in', async () => {
    expect((await api().post('/api/messages/read-all')).status).toBe(401);
  });
});
