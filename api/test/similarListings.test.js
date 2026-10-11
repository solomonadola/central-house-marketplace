import { describe, expect, it } from 'vitest';
import { api, createListing, createUser } from './helpers.js';

const names = (listings) => listings.map((l) => l.name);

describe('GET /api/listing/:id/similar', () => {
  it('returns same-type listings, preferring the same property type', async () => {
    const owner = await createUser();
    const source = await createListing(owner, { name: 'Source Apartment Home', type: 'rent', propertyType: 'apartment', regularPrice: 1000 });
    const house = await createListing(owner, { name: 'Nearby House Home', type: 'rent', propertyType: 'house', regularPrice: 1200 });
    const apartment = await createListing(owner, { name: 'Other Apartment Home', type: 'rent', propertyType: 'apartment', regularPrice: 5000 });
    await createListing(owner, { name: 'For Sale Home', type: 'sale', propertyType: 'apartment', regularPrice: 300000 });

    const res = await api().get(`/api/listing/${source._id}/similar`);

    expect(res.status).toBe(200);
    expect(names(res.body)).toEqual(['Other Apartment Home', 'Nearby House Home']);
  });

  it('never includes the listing itself and caps the result at four', async () => {
    const owner = await createUser();
    const source = await createListing(owner, { name: 'Source Listing Home', type: 'rent' });
    for (let i = 0; i < 6; i += 1) {
      await createListing(owner, { name: `Similar Listing ${i} Home`, type: 'rent', regularPrice: 1000 + i * 50 });
    }

    const res = await api().get(`/api/listing/${source._id}/similar`);

    expect(res.body).toHaveLength(4);
    expect(names(res.body)).not.toContain('Source Listing Home');
  });

  it('returns 404 for a missing listing', async () => {
    expect((await api().get('/api/listing/0123456789abcdef01234567/similar')).status).toBe(404);
  });
});
