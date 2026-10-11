import { describe, expect, it } from 'vitest';
import { api, createUser, signedInAgent, validListing } from './helpers.js';
import SavedSearch from '../models/savedSearch.model.js';
import Notification from '../models/notification.model.js';
import { effectivePrice, listingMatchesFilters } from '../utils/savedSearch.js';

const createVia = (agent, body) => agent.post('/api/saved-searches').send(body);

describe('listingMatchesFilters', () => {
  const listing = {
    name: 'Sunny Loft Apartment',
    type: 'rent',
    offer: true,
    regularPrice: 2000,
    discountPrice: 1500,
    bedrooms: 3,
    bathrooms: 2,
    parking: true,
    furnished: false,
    hidden: false,
  };

  it('uses the discounted price when there is an offer', () => {
    expect(effectivePrice(listing)).toBe(1500);
    expect(listingMatchesFilters(listing, { maxPrice: 1600 })).toBe(true);
    expect(listingMatchesFilters(listing, { maxPrice: 1400 })).toBe(false);
  });

  it('matches a keyword against the name, case-insensitively', () => {
    expect(listingMatchesFilters(listing, { searchTerm: 'loft' })).toBe(true);
    expect(listingMatchesFilters(listing, { searchTerm: 'villa' })).toBe(false);
  });

  it('respects type and required amenities', () => {
    expect(listingMatchesFilters(listing, { type: 'sale' })).toBe(false);
    expect(listingMatchesFilters(listing, { type: 'rent' })).toBe(true);
    expect(listingMatchesFilters(listing, { furnished: true })).toBe(false);
    expect(listingMatchesFilters(listing, { parking: true })).toBe(true);
  });

  it('respects minimum bedrooms and bathrooms', () => {
    expect(listingMatchesFilters(listing, { minBedrooms: 3 })).toBe(true);
    expect(listingMatchesFilters(listing, { minBedrooms: 4 })).toBe(false);
    expect(listingMatchesFilters(listing, { minBathrooms: 3 })).toBe(false);
  });

  it('never matches a hidden listing', () => {
    expect(listingMatchesFilters({ ...listing, hidden: true }, {})).toBe(false);
  });

  it('matches an empty filter set', () => {
    expect(listingMatchesFilters(listing, {})).toBe(true);
  });
});

describe('saved search CRUD', () => {
  it('requires sign-in', async () => {
    expect((await api().get('/api/saved-searches')).status).toBe(401);
    expect((await createVia(api(), {})).status).toBe(401);
  });

  it('creates a saved search from the search filters', async () => {
    const agent = await signedInAgent(await createUser());

    const res = await createVia(agent, {
      name: 'Cheap rentals',
      searchTerm: 'loft',
      type: 'rent',
      parking: true,
      maxPrice: 1500,
      minBedrooms: 2,
    });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      name: 'Cheap rentals',
      alertsEnabled: true,
      filters: { searchTerm: 'loft', type: 'rent', parking: true, maxPrice: 1500, minBedrooms: 2 },
    });
  });

  it.each([
    ['an unknown type', { type: 'banana' }, "Invalid enum value"],
    ['a negative price', { minPrice: -1 }, 'cannot be negative'],
    ['a max below the min', { minPrice: 2000, maxPrice: 1000 }, 'Minimum price must be at most'],
    ['a long name', { name: 'x'.repeat(61) }, 'at most 60 characters'],
  ])('rejects %s', async (_, override, message) => {
    const agent = await signedInAgent(await createUser());
    const res = await createVia(agent, override);
    expect(res.status).toBe(400);
    expect(res.body.message).toContain(message);
  });

  it('lists only the caller searches, newest first', async () => {
    const user = await createUser();
    const other = await createUser();
    const agent = await signedInAgent(user);
    await createVia(agent, { name: 'Mine one' });
    await createVia(agent, { name: 'Mine two' });
    await SavedSearch.create({ user: other._id, name: 'Theirs', filters: {} });

    const res = await agent.get('/api/saved-searches');

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
    expect(res.body.map((s) => s.name)).toContain('Mine one');
    expect(res.body.map((s) => s.name)).not.toContain('Theirs');
  });

  it('updates the name and pauses alerts', async () => {
    const agent = await signedInAgent(await createUser());
    const created = await createVia(agent, { name: 'Old name' });

    const res = await agent
      .patch(`/api/saved-searches/${created.body._id}`)
      .send({ name: 'New name', alertsEnabled: false });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ name: 'New name', alertsEnabled: false });
  });

  it("cannot update someone else's search", async () => {
    const owner = await createUser();
    const other = await createUser();
    const saved = await SavedSearch.create({ user: owner._id, name: 'Owner', filters: {} });
    const agent = await signedInAgent(other);

    const res = await agent.patch(`/api/saved-searches/${saved._id}`).send({ name: 'Hijacked' });

    expect(res.status).toBe(404);
    expect((await SavedSearch.findById(saved._id)).name).toBe('Owner');
  });

  it('deletes a search', async () => {
    const agent = await signedInAgent(await createUser());
    const created = await createVia(agent, {});

    const res = await agent.delete(`/api/saved-searches/${created.body._id}`);

    expect(res.status).toBe(200);
    expect(await SavedSearch.findById(created.body._id)).toBeNull();
  });

  it('returns 400 for a malformed id', async () => {
    const agent = await signedInAgent(await createUser());
    expect((await agent.patch('/api/saved-searches/abc').send({ name: 'x' })).status).toBe(400);
  });
});

describe('saved search alerts', () => {
  it('notifies a user when a new listing matches their search', async () => {
    const searcher = await createUser();
    const searcherAgent = await signedInAgent(searcher);
    await createVia(searcherAgent, { type: 'sale', maxPrice: 500000, minBedrooms: 3 });

    const ownerAgent = await signedInAgent(await createUser());
    await ownerAgent.post('/api/listing/create').send(validListing({ type: 'sale', regularPrice: 400000, bedrooms: 3 }));

    const note = await Notification.findOne({ recipient: searcher._id, type: 'saved_search_match' });
    expect(note).not.toBeNull();
    expect(note.link).toMatch(/^\/listing\//);
  });

  it('does not notify when nothing matches', async () => {
    const searcher = await createUser();
    await createVia(await signedInAgent(searcher), { type: 'sale' });

    const ownerAgent = await signedInAgent(await createUser());
    await ownerAgent.post('/api/listing/create').send(validListing({ type: 'rent' }));

    expect(await Notification.countDocuments({ recipient: searcher._id })).toBe(0);
  });

  it('respects a paused search', async () => {
    const searcher = await createUser();
    await SavedSearch.create({ user: searcher._id, alertsEnabled: false, filters: { type: 'rent' } });

    const ownerAgent = await signedInAgent(await createUser());
    await ownerAgent.post('/api/listing/create').send(validListing({ type: 'rent' }));

    expect(await Notification.countDocuments({ recipient: searcher._id })).toBe(0);
  });

  it("does not alert the owner about their own listing", async () => {
    const owner = await createUser();
    const ownerAgent = await signedInAgent(owner);
    await createVia(ownerAgent, { type: 'rent' });

    await ownerAgent.post('/api/listing/create').send(validListing({ type: 'rent' }));

    expect(await Notification.countDocuments({ recipient: owner._id, type: 'saved_search_match' })).toBe(0);
  });

  it('matches on property type and amenities too', async () => {
    const searcher = await createUser();
    await createVia(await signedInAgent(searcher), {
      propertyType: 'house',
      amenities: ['garden'],
    });

    const ownerAgent = await signedInAgent(await createUser());
    await ownerAgent
      .post('/api/listing/create')
      .send(validListing({ propertyType: 'house', amenities: ['garden', 'wifi'] }));

    expect(await Notification.countDocuments({ recipient: searcher._id, type: 'saved_search_match' })).toBe(1);
  });
});
