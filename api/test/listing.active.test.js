import { describe, expect, it } from 'vitest';
import { api, createListing, createUser, signedInAgent } from './helpers.js';

const searchNames = async () => (await api().get('/api/listing/get')).body.map((l) => l.name);

describe('POST /api/listing/:id/active', () => {
  it('lets the owner pause and reactivate a listing', async () => {
    const owner = await createUser();
    const listing = await createListing(owner);
    const agent = await signedInAgent(owner);

    const paused = await agent.post(`/api/listing/${listing._id}/active`).send({ active: false });
    expect(paused.status).toBe(200);
    expect(paused.body.active).toBe(false);

    const resumed = await agent.post(`/api/listing/${listing._id}/active`).send({ active: true });
    expect(resumed.body.active).toBe(true);
  });

  it("won't let another user pause a listing", async () => {
    const listing = await createListing(await createUser());
    const agent = await signedInAgent(await createUser());

    const res = await agent.post(`/api/listing/${listing._id}/active`).send({ active: false });

    expect(res.status).toBe(401);
  });

  it('validates the body', async () => {
    const owner = await createUser();
    const listing = await createListing(owner);
    const agent = await signedInAgent(owner);

    expect((await agent.post(`/api/listing/${listing._id}/active`).send({ active: 'yes' })).status).toBe(400);
  });

  it('returns 404 for a missing listing', async () => {
    const agent = await signedInAgent(await createUser());
    expect((await agent.post('/api/listing/0123456789abcdef01234567/active').send({ active: false })).status).toBe(404);
  });
});

describe('paused listings are hidden from the public', () => {
  it('disappears from search', async () => {
    const owner = await createUser();
    const listing = await createListing(owner, { name: 'Paused Listing Home' });
    const agent = await signedInAgent(owner);

    await agent.post(`/api/listing/${listing._id}/active`).send({ active: false });

    expect(await searchNames()).not.toContain('Paused Listing Home');
    await agent.post(`/api/listing/${listing._id}/active`).send({ active: true });
    expect(await searchNames()).toContain('Paused Listing Home');
  });

  it('looks missing to visitors but is visible to its owner', async () => {
    const owner = await createUser();
    const listing = await createListing(owner);
    await (await signedInAgent(owner)).post(`/api/listing/${listing._id}/active`).send({ active: false });

    expect((await api().get(`/api/listing/get/${listing._id}`)).status).toBe(404);
    expect((await (await signedInAgent(owner)).get(`/api/listing/get/${listing._id}`)).status).toBe(200);
  });

  it('does not count views while paused', async () => {
    const owner = await createUser();
    const listing = await createListing(owner);
    await (await signedInAgent(owner)).post(`/api/listing/${listing._id}/active`).send({ active: false });

    expect((await api().post(`/api/listing/view/${listing._id}`)).status).toBe(404);
  });

  it('cannot be messaged, booked or applied to while paused', async () => {
    const owner = await createUser();
    const listing = await createListing(owner);
    await (await signedInAgent(owner)).post(`/api/listing/${listing._id}/active`).send({ active: false });
    const visitor = await signedInAgent(await createUser());

    const message = await visitor.post('/api/messages/conversations').send({ listingId: listing._id.toString(), body: 'Hi' });
    const viewing = await visitor.post('/api/viewings').send({ listingId: listing._id.toString(), startsAt: new Date(Date.now() + 86_400_000).toISOString() });
    const application = await visitor.post('/api/applications').send({ listingId: listing._id.toString(), fullName: 'Jane Applicant', email: 'jane@example.com' });

    expect(message.status).toBe(404);
    expect(viewing.status).toBe(404);
    expect(application.status).toBe(404);
  });
});
