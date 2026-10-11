import { describe, expect, it } from 'vitest';
import { api, createUser, signedInAgent, validListing } from './helpers.js';
import ListingDraft from '../models/listingDraft.model.js';
import Listing from '../models/listing.model.js';
import PriceChange from '../models/priceChange.model.js';

const setup = async (overrides = {}) => {
  const user = await createUser(overrides);
  return { user, agent: await signedInAgent(user) };
};

const save = (agent, data) => agent.post('/api/listing-drafts').send({ data });

describe('listing drafts', () => {
  it('saves incomplete listings and lists them, newest first', async () => {
    const { agent } = await setup();

    const first = await save(agent, { name: 'Loft' });
    const second = await save(agent, { address: '1 Main St', bedrooms: '2' });

    expect(first.status).toBe(201);
    expect(second.body.data).toEqual({ address: '1 Main St', bedrooms: 2 });
    const list = await agent.get('/api/listing-drafts');
    expect(list.body.map((d) => d._id)).toEqual([second.body._id, first.body._id]);
  });

  it('updates and deletes a draft', async () => {
    const { agent } = await setup();
    const draft = (await save(agent, { name: 'Loft' })).body;

    const updated = await agent.put(`/api/listing-drafts/${draft._id}`).send({ data: { name: 'Bright Loft', parking: true } });
    expect(updated.body.data).toEqual({ name: 'Bright Loft', parking: true });
    expect((await agent.get(`/api/listing-drafts/${draft._id}`)).body.data.name).toBe('Bright Loft');

    await agent.delete(`/api/listing-drafts/${draft._id}`).expect(200);
    expect(await ListingDraft.countDocuments()).toBe(0);
  });

  it('checks types and limits but not completeness', async () => {
    const { agent } = await setup();

    expect((await save(agent, { name: 'x'.repeat(63) })).status).toBe(400);
    expect((await save(agent, { type: 'castle' })).status).toBe(400);
    expect((await save(agent, { imageUrls: ['javascript:alert(1)'] })).status).toBe(400);
    expect((await save(agent, {})).status).toBe(201);
  });

  it('ignores unknown fields', async () => {
    const { agent } = await setup();
    const res = await save(agent, { name: 'Loft', userRef: 'someone-else', views: 999 });
    expect(res.body.data).toEqual({ name: 'Loft' });
  });

  it('caps drafts per user', async () => {
    const { user, agent } = await setup();
    await ListingDraft.insertMany(Array.from({ length: 10 }, () => ({ owner: user._id, data: {} })));
    expect((await save(agent, { name: 'One more' })).status).toBe(400);
  });

  it("keeps drafts private", async () => {
    const { agent } = await setup();
    const draft = (await save(agent, { name: 'Loft' })).body;
    const other = (await setup()).agent;

    expect((await other.get('/api/listing-drafts')).body).toEqual([]);
    expect((await other.get(`/api/listing-drafts/${draft._id}`)).status).toBe(404);
    expect((await other.put(`/api/listing-drafts/${draft._id}`).send({ data: {} })).status).toBe(404);
    expect((await other.post(`/api/listing-drafts/${draft._id}/publish`)).status).toBe(404);
    expect((await api().get('/api/listing-drafts')).status).toBe(401);
  });
});

describe('publishing drafts', () => {
  it('publishes a complete draft as a listing and removes the draft', async () => {
    const { user, agent } = await setup();
    const draft = (await save(agent, validListing({ name: 'Draft Turned Listing' }))).body;

    const res = await agent.post(`/api/listing-drafts/${draft._id}/publish`);

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ name: 'Draft Turned Listing', userRef: user._id.toString() });
    expect(await ListingDraft.countDocuments()).toBe(0);
    // Published the same way as a normal listing, e.g. its first price is recorded.
    expect(await PriceChange.countDocuments({ listing: res.body._id })).toBe(1);
  });

  it('explains what is missing and keeps the draft', async () => {
    const { agent } = await setup();
    const draft = (await save(agent, { name: 'Almost Ready Listing' })).body;

    const res = await agent.post(`/api/listing-drafts/${draft._id}/publish`);

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/^This draft isn't ready to publish: /);
    expect(await ListingDraft.countDocuments()).toBe(1);
    expect(await Listing.countDocuments()).toBe(0);
  });

  it('needs a confirmed email to publish', async () => {
    const { agent } = await setup({ emailVerified: false });
    const draft = (await save(agent, validListing())).body;

    const res = await agent.post(`/api/listing-drafts/${draft._id}/publish`);

    expect(res.status).toBe(403);
    expect(res.body.code).toBe('EMAIL_NOT_VERIFIED');
  });

  it('removes drafts with the account and includes them in the export', async () => {
    const { user, agent } = await setup();
    await save(agent, { name: 'Loft' });

    expect(JSON.parse((await agent.get('/api/user/export')).text).listingDrafts).toHaveLength(1);
    await agent.delete(`/api/user/delete/${user._id}`).expect(200);
    expect(await ListingDraft.countDocuments()).toBe(0);
  });
});
