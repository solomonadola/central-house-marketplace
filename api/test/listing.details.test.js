import { describe, expect, it } from 'vitest';
import { api, createListing, createUser, signedInAgent, validListing } from './helpers.js';

const create = (agent, overrides = {}) => agent.post('/api/listing/create').send(validListing(overrides));
const names = (listings) => listings.map((l) => l.name);

describe('listing details', () => {
  it('defaults to an apartment with no amenities', async () => {
    const agent = await signedInAgent(await createUser());

    const res = await create(agent);

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ propertyType: 'apartment', amenities: [] });
  });

  it('stores a property type and amenities', async () => {
    const agent = await signedInAgent(await createUser());

    const res = await create(agent, {
      propertyType: 'house',
      amenities: ['garden', 'fireplace', 'pets_allowed'],
    });

    expect(res.body).toMatchObject({ propertyType: 'house', amenities: ['garden', 'fireplace', 'pets_allowed'] });
  });

  it.each([
    ['an unknown property type', { propertyType: 'castle' }, 'property type'],
    ['an unknown amenity', { amenities: ['helipad'] }, 'Unknown amenity'],
    ['too many amenities', { amenities: Array(21).fill('wifi') }, 'Too many amenities'],
  ])('rejects %s', async (_, override, message) => {
    const agent = await signedInAgent(await createUser());
    const res = await create(agent, override);
    expect(res.status).toBe(400);
    expect(res.body.message).toContain(message);
  });

  it('can update the details', async () => {
    const user = await createUser();
    const listing = await createListing(user);
    const agent = await signedInAgent(user);

    const res = await agent
      .post(`/api/listing/update/${listing._id}`)
      .send({ propertyType: 'studio', amenities: ['wifi', 'elevator'] });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ propertyType: 'studio', amenities: ['wifi', 'elevator'] });
  });
});

describe('searching by details', () => {
  const seed = async () => {
    const owner = await createUser();
    await createListing(owner, { name: 'Cozy Apartment Home', propertyType: 'apartment', amenities: ['wifi'] });
    await createListing(owner, {
      name: 'Garden House Home',
      propertyType: 'house',
      amenities: ['garden', 'wifi', 'pets_allowed'],
    });
    await createListing(owner, { name: 'Tiny Studio Home', propertyType: 'studio', amenities: [] });
  };

  const search = async (query) => (await api().get(`/api/listing/get?${new URLSearchParams(query)}`)).body;

  it('filters by property type', async () => {
    await seed();
    expect(names(await search({ propertyType: 'house' }))).toEqual(['Garden House Home']);
  });

  it('requires all requested amenities', async () => {
    await seed();
    expect(names(await search({ amenities: 'garden,wifi' }))).toEqual(['Garden House Home']);
    expect(names(await search({ amenities: 'garden,wifi,pets_allowed' }))).toEqual(['Garden House Home']);
    expect(names(await search({ amenities: 'garden,wifi,pool' }))).toEqual([]);
  });

  it('ignores unknown filter values', async () => {
    await seed();
    expect(await search({ propertyType: 'castle' })).toHaveLength(3);
    expect(await search({ amenities: 'helipad' })).toHaveLength(3);
  });
});
