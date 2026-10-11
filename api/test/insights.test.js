import { describe, expect, it } from 'vitest';
import { api, createListing, createUser } from './helpers.js';

describe('GET /api/insights', () => {
  it('summarises visible listings', async () => {
    const owner = await createUser();
    await createListing(owner, { type: 'rent', propertyType: 'apartment', regularPrice: 1000, bedrooms: 2, bathrooms: 1 });
    await createListing(owner, { type: 'rent', propertyType: 'house', regularPrice: 2000, bedrooms: 4, bathrooms: 2, furnished: true });
    await createListing(owner, { type: 'sale', propertyType: 'house', regularPrice: 300000, bedrooms: 3, bathrooms: 2 });

    const res = await api().get('/api/insights');

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ total: 3, forRent: 2, forSale: 1 });
    expect(res.body.prices.rent).toMatchObject({ average: 1500, min: 1000, max: 2000 });
    expect(res.body.prices.sale).toMatchObject({ average: 300000 });
    const types = Object.fromEntries(res.body.byPropertyType.map((r) => [r.propertyType, r.count]));
    expect(types).toMatchObject({ house: 2, apartment: 1 });
  });

  it('uses the discounted price when there is an offer', async () => {
    const owner = await createUser();
    await createListing(owner, { type: 'rent', offer: true, regularPrice: 2000, discountPrice: 1500 });

    const res = await api().get('/api/insights');

    expect(res.body.prices.rent.average).toBe(1500);
  });

  it('excludes hidden and paused listings', async () => {
    const owner = await createUser();
    await createListing(owner, { name: 'Visible Insights Home' });
    await createListing(owner, { hidden: true });
    await createListing(owner, { active: false });

    const res = await api().get('/api/insights');

    expect(res.body.total).toBe(1);
  });

  it('counts listings created this week', async () => {
    const owner = await createUser();
    await createListing(owner);

    const res = await api().get('/api/insights');

    expect(res.body.newThisWeek).toBe(1);
  });

  it('handles an empty marketplace', async () => {
    const res = await api().get('/api/insights');

    expect(res.body).toMatchObject({ total: 0, forRent: 0, forSale: 0, byPropertyType: [] });
    expect(res.body.prices.rent).toBeUndefined();
  });
});
