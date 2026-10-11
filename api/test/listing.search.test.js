import { beforeEach, describe, expect, it } from 'vitest';
import { api, createListing, createUser } from './helpers.js';

const search = async (query) => {
  const res = await api().get('/api/listing/get').query(query);
  expect(res.status).toBe(200);
  return res.body;
};

const names = (listings) => listings.map((l) => l.name).sort();

describe('GET /api/listing/get', () => {
  beforeEach(async () => {
    const user = await createUser();
    // Created oldest first so the default newest-first order is predictable.
    for (const [i, overrides] of [
      { name: 'Cheap Rental Studio', type: 'rent', regularPrice: 500 },
      { name: 'Furnished Rental Flat', type: 'rent', regularPrice: 1500, furnished: true, parking: false },
      { name: 'Family House For Sale', type: 'sale', regularPrice: 300000, offer: true, discountPrice: 280000 },
      { name: 'Luxury Villa For Sale', type: 'sale', regularPrice: 900000, parking: true },
    ].entries()) {
      await createListing(user, { ...overrides, createdAt: new Date(2026, 0, i + 1) });
    }
  });

  it('returns all listings newest first by default', async () => {
    const listings = await search({});

    expect(listings.map((l) => l.name)).toEqual([
      'Luxury Villa For Sale',
      'Family House For Sale',
      'Furnished Rental Flat',
      'Cheap Rental Studio',
    ]);
  });

  it('filters by type', async () => {
    expect(names(await search({ type: 'rent' }))).toEqual(['Cheap Rental Studio', 'Furnished Rental Flat']);
    expect(await search({ type: 'all' })).toHaveLength(4);
  });

  it('filters by offer, furnished and parking', async () => {
    expect(names(await search({ offer: 'true' }))).toEqual(['Family House For Sale']);
    expect(names(await search({ furnished: 'true' }))).toEqual(['Furnished Rental Flat']);
    expect(await search({ parking: 'true' })).toHaveLength(3);
    expect(await search({ offer: 'false' })).toHaveLength(4);
  });

  it('searches names case-insensitively', async () => {
    expect(names(await search({ searchTerm: 'for sale' }))).toEqual([
      'Family House For Sale',
      'Luxury Villa For Sale',
    ]);
  });

  it('sorts by price in either direction', async () => {
    const asc = await search({ sort: 'regularPrice', order: 'asc' });
    const desc = await search({ sort: 'regularPrice', order: 'desc' });

    expect(asc.map((l) => l.regularPrice)).toEqual([500, 1500, 300000, 900000]);
    expect(desc.map((l) => l.regularPrice)).toEqual([900000, 300000, 1500, 500]);
  });

  it('paginates with limit and startIndex', async () => {
    const page1 = await search({ limit: 2 });
    const page2 = await search({ limit: 2, startIndex: 2 });

    expect(page1).toHaveLength(2);
    expect(page2).toHaveLength(2);
    expect(names([...page1, ...page2])).toEqual(names(await search({})));
  });

  describe('price and room filters', () => {
    it('filters by price range', async () => {
      expect(names(await search({ minPrice: 1000, maxPrice: 400000 }))).toEqual([
        'Family House For Sale',
        'Furnished Rental Flat',
      ]);
      expect(names(await search({ maxPrice: 1000 }))).toEqual(['Cheap Rental Studio']);
      expect(names(await search({ minPrice: 500000 }))).toEqual(['Luxury Villa For Sale']);
    });

    it('uses the discount price for listings with an offer', async () => {
      // Regular 300,000, discounted to 280,000.
      expect(names(await search({ maxPrice: 290000, type: 'sale' }))).toEqual(['Family House For Sale']);
      expect(await search({ minPrice: 290000, maxPrice: 310000 })).toHaveLength(0);
    });

    it('filters by minimum bedrooms and bathrooms', async () => {
      const user = await createUser();
      await createListing(user, { name: 'Big Family Home Here', bedrooms: 5, bathrooms: 3 });

      expect(names(await search({ minBedrooms: 4 }))).toEqual(['Big Family Home Here']);
      expect(names(await search({ minBathrooms: 3 }))).toEqual(['Big Family Home Here']);
      expect(await search({ minBedrooms: 2 })).toHaveLength(5);
    });

    it('combines with other filters', async () => {
      expect(names(await search({ type: 'rent', minPrice: 1000 }))).toEqual(['Furnished Rental Flat']);
    });

    it.each([['abc'], ['-100'], [''], ['Infinity']])('ignores an invalid value (%s)', async (value) => {
      expect(await search({ minPrice: value, maxPrice: value, minBedrooms: value })).toHaveLength(4);
    });

    it('ignores operator objects', async () => {
      expect(await search({ 'minPrice[$gt]': '0', 'minBedrooms[$ne]': '1' })).toHaveLength(4);
    });
  });

  describe('untrusted input', () => {
    it('treats regex characters in the search term literally', async () => {
      const user = await createUser();
      await createListing(user, { name: 'Studio (Top Floor) + Roof' });

      expect(names(await search({ searchTerm: '(Top Floor) +' }))).toEqual(['Studio (Top Floor) + Roof']);
      expect(await search({ searchTerm: '.*' })).toHaveLength(0);
    });

    it('handles a catastrophic-backtracking pattern quickly', async () => {
      const start = Date.now();
      await search({ searchTerm: '(a+)+$' + 'a'.repeat(30) });
      expect(Date.now() - start).toBeLessThan(1000);
    });

    it('ignores query operators in filters', async () => {
      expect(await search({ 'type[$ne]': 'rent' })).toHaveLength(4);
      expect(await search({ 'offer[$ne]': 'true' })).toHaveLength(4);
      expect(await search({ 'searchTerm[$ne]': 'x' })).toHaveLength(4);
    });

    it('falls back to sorting by date for unknown sort fields', async () => {
      const listings = await search({ sort: 'userRef', order: 'asc' });
      expect(listings[0].name).toBe('Cheap Rental Studio');
      expect(listings[3].name).toBe('Luxury Villa For Sale');
    });

    it('caps the limit at 50', async () => {
      const user = await createUser();
      await Promise.all(Array.from({ length: 60 }, () => createListing(user)));

      expect(await search({ limit: 1000 })).toHaveLength(50);
    });

    it.each([['-5'], ['abc'], ['0']])('treats limit=%s as a valid value', async (limit) => {
      const listings = await search({ limit });
      expect(listings.length).toBeGreaterThanOrEqual(1);
    });

    it('treats a negative startIndex as 0', async () => {
      expect(await search({ startIndex: -3 })).toHaveLength(4);
    });
  });
});
