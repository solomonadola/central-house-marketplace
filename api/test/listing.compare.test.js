import { describe, expect, it } from 'vitest';
import { api, createListing, createUser } from './helpers.js';

describe('GET /api/listing/compare', () => {
  it('returns the requested listings in order', async () => {
    const owner = await createUser();
    const a = await createListing(owner, { name: 'Listing Alpha Home' });
    const b = await createListing(owner, { name: 'Listing Beta Home' });

    const res = await api().get(`/api/listing/compare?ids=${b._id},${a._id}`);

    expect(res.status).toBe(200);
    expect(res.body.map((l) => l.name)).toEqual(['Listing Beta Home', 'Listing Alpha Home']);
  });

  it('skips hidden and unknown ids', async () => {
    const owner = await createUser();
    const visible = await createListing(owner, { name: 'Visible Listing Home' });
    const hidden = await createListing(owner, { hidden: true });

    const res = await api().get(
      `/api/listing/compare?ids=${visible._id},${hidden._id},0123456789abcdef01234567`
    );

    expect(res.body).toHaveLength(1);
    expect(res.body[0].name).toBe('Visible Listing Home');
  });

  it('ignores malformed ids and caps the list at four', async () => {
    const owner = await createUser();
    const listings = await Promise.all(
      Array.from({ length: 5 }, (_, i) => createListing(owner, { name: `Listing Number ${i} Home` }))
    );
    const ids = [...listings.map((l) => l._id), 'not-an-id'].join(',');

    const res = await api().get(`/api/listing/compare?ids=${ids}`);

    expect(res.body).toHaveLength(4);
  });

  it('returns an empty list with no ids', async () => {
    const res = await api().get('/api/listing/compare');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });
});

describe('GET /api/listing/by-ids', () => {
  it('returns up to twelve listings in order', async () => {
    const owner = await createUser();
    const listings = await Promise.all(
      Array.from({ length: 15 }, (_, i) => createListing(owner, { name: `Recent Listing ${i} Home` }))
    );
    const ids = listings.map((l) => l._id).join(',');

    const res = await api().get(`/api/listing/by-ids?ids=${ids}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(12);
    expect(res.body[0].name).toBe('Recent Listing 0 Home');
  });

  it('drops hidden and paused listings', async () => {
    const owner = await createUser();
    const active = await createListing(owner, { name: 'Active Recent Listing' });
    const paused = await createListing(owner, { active: false });
    const hidden = await createListing(owner, { hidden: true });

    const res = await api().get(`/api/listing/by-ids?ids=${active._id},${paused._id},${hidden._id}`);

    expect(res.body.map((l) => l.name)).toEqual(['Active Recent Listing']);
  });
});
