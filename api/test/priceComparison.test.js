import { describe, expect, it } from 'vitest';
import { api, createListing, createUser } from './helpers.js';
import { distanceKm } from '../utils/priceComparison.js';

const MISSION = { lat: 37.7599, lng: -122.4148 };
const NOE_VALLEY = { lat: 37.7502, lng: -122.4337 }; // about 2 km away
const OAKLAND = { lat: 37.8044, lng: -122.2712 }; // about 13 km away

const compare = async (listing) => (await api().get(`/api/listing/${listing._id}/price-comparison`)).body.comparison;

describe('distanceKm', () => {
  it('measures great-circle distance', () => {
    expect(distanceKm(MISSION, NOE_VALLEY)).toBeCloseTo(2.0, 0);
    expect(distanceKm(MISSION, OAKLAND)).toBeGreaterThan(10);
    expect(distanceKm(MISSION, MISSION)).toBe(0);
  });
});

describe('GET /api/listing/:id/price-comparison', () => {
  it('compares with the median of similar nearby homes', async () => {
    const owner = await createUser();
    const listing = await createListing(owner, { bedrooms: 2, regularPrice: 1800, location: MISSION });
    for (const price of [2000, 2200, 2400]) {
      await createListing(owner, { bedrooms: 2, regularPrice: price, location: NOE_VALLEY });
    }
    // Not comparable: different bedrooms, too far, for sale, or hidden.
    await createListing(owner, { bedrooms: 3, regularPrice: 9000, location: NOE_VALLEY });
    await createListing(owner, { bedrooms: 2, regularPrice: 100, location: OAKLAND });
    await createListing(owner, { bedrooms: 2, type: 'sale', regularPrice: 500000, location: NOE_VALLEY });
    await createListing(owner, { bedrooms: 2, regularPrice: 50, location: NOE_VALLEY, hidden: true });

    expect(await compare(listing)).toEqual({
      comparables: 3,
      medianPrice: 2200,
      percentDifference: -18,
      nearbyOnly: true,
    });
  });

  it('uses discounted prices for offers', async () => {
    const owner = await createUser();
    const listing = await createListing(owner, { regularPrice: 3000, offer: true, discountPrice: 2000 });
    for (let i = 0; i < 3; i++) await createListing(owner, { regularPrice: 2000 });

    expect((await compare(listing)).percentDifference).toBe(0);
  });

  it('needs at least 3 comparable homes', async () => {
    const owner = await createUser();
    const listing = await createListing(owner);
    await createListing(owner);
    await createListing(owner);

    expect(await compare(listing)).toBeNull();
  });

  it('returns 404 for hidden and missing listings', async () => {
    const owner = await createUser();
    const hidden = await createListing(owner, { hidden: true });

    expect((await api().get(`/api/listing/${hidden._id}/price-comparison`)).status).toBe(404);
    expect((await api().get('/api/listing/0123456789abcdef01234567/price-comparison')).status).toBe(404);
  });
});
