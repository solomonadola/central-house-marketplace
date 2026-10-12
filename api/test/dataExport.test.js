import { describe, expect, it } from 'vitest';
import { api, createListing, createUser, signedInAgent } from './helpers.js';
import User from '../models/user.model.js';

const SECRET_FIELDS = [
  'password',
  'tokenVersion',
  'emailVerifyTokenHash',
  'emailVerifyExpires',
  'passwordResetTokenHash',
  'passwordResetExpires',
  'suspendedReason',
];

describe('GET /api/user/export', () => {
  it("downloads the user's data as a JSON file", async () => {
    const me = await createUser({ username: 'sarah' });
    const owner = await createUser({ username: 'david' });
    await createListing(me, { name: 'My Sunny Garden Flat' });
    const theirListing = await createListing(owner, { name: 'Davids Downtown Loft' });
    const agent = await signedInAgent(me);
    const ownerAgent = await signedInAgent(owner);

    const started = await agent
      .post('/api/messages/conversations')
      .send({ listingId: theirListing._id.toString(), body: 'Is it still available?' });
    await ownerAgent
      .post(`/api/messages/conversations/${started.body.conversationId}/messages`)
      .send({ body: 'Yes it is!' });
    await agent.post(`/api/questions/listing/${theirListing._id}`).send({ question: 'Are pets allowed?' });
    await agent.put(`/api/user/favorites/${theirListing._id}`);
    await agent.put(`/api/user/blocks/${(await createUser({ username: 'pest' }))._id}`);

    const res = await agent.get('/api/user/export');

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/application\/json/);
    expect(res.headers['content-disposition']).toMatch(/^attachment; filename="central-house-data-\d{4}-\d{2}-\d{2}\.json"$/);

    const data = JSON.parse(res.text);
    expect(data.exportVersion).toBe(1);
    expect(data.profile).toMatchObject({ username: 'sarah', email: me.email });
    expect(data.listings.map((l) => l.name)).toEqual(['My Sunny Garden Flat']);
    expect(data.savedListingIds).toEqual([theirListing._id.toString()]);
    expect(data.blockedUsers).toEqual(['pest']);
    expect(data.questions.map((q) => q.question)).toEqual(['Are pets allowed?']);
    expect(data.conversations).toEqual([
      {
        _id: started.body.conversationId,
        listing: 'Davids Downtown Loft',
        with: 'david',
        messages: [
          expect.objectContaining({ from: 'you', body: 'Is it still available?' }),
          expect.objectContaining({ from: 'david', body: 'Yes it is!' }),
        ],
      },
    ]);
  });

  it('never includes secrets', async () => {
    const me = await createUser();
    await User.updateOne(
      { _id: me._id },
      { passwordResetTokenHash: 'abc', emailVerifyTokenHash: 'def', tokenVersion: 3, suspendedReason: 'x' }
    );
    // tokenVersion changed, so sign in again for a valid session.
    const agent = await signedInAgent(me);

    const data = JSON.parse((await agent.get('/api/user/export')).text);

    for (const field of SECRET_FIELDS) expect(data.profile).not.toHaveProperty(field);
    expect(JSON.stringify(data)).not.toContain(me.password);
  });

  it("only exports the signed-in user's data", async () => {
    const me = await createUser();
    const other = await createUser();
    await createListing(other, { name: 'Not My Listing At All' });

    const data = JSON.parse((await (await signedInAgent(me)).get('/api/user/export')).text);

    expect(data.listings).toEqual([]);
    expect(JSON.stringify(data)).not.toContain('Not My Listing At All');
  });

  it('requires sign-in', async () => {
    expect((await api().get('/api/user/export')).status).toBe(401);
  });
});
