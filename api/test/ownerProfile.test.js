import { describe, expect, it } from 'vitest';
import { api, createListing, createUser } from './helpers.js';

describe('GET /api/user/public/:id', () => {
  it('returns a public profile without auth', async () => {
    const owner = await createUser({ username: 'owner_maria' });
    await createListing(owner, { name: 'First Public Listing', ratingAverage: 4, ratingCount: 2 });
    await createListing(owner, { name: 'Second Public Listing', ratingAverage: 5, ratingCount: 1 });

    const res = await api().get(`/api/user/public/${owner._id}`);

    expect(res.status).toBe(200);
    expect(res.body.user).toMatchObject({ username: 'owner_maria' });
    expect(res.body.user).not.toHaveProperty('email');
    expect(res.body.user).not.toHaveProperty('password');
    expect(res.body.listingCount).toBe(2);
    expect(res.body.rating).toEqual({ average: 4.33, count: 3 });
  });

  it('only includes active listings', async () => {
    const owner = await createUser();
    await createListing(owner, { name: 'Visible Owner Listing' });
    await createListing(owner, { hidden: true });

    const res = await api().get(`/api/user/public/${owner._id}`);

    expect(res.body.listingCount).toBe(1);
    expect(res.body.listings[0].name).toBe('Visible Owner Listing');
  });

  it('reports no ratings when nothing is reviewed', async () => {
    const owner = await createUser();
    await createListing(owner);

    const res = await api().get(`/api/user/public/${owner._id}`);

    expect(res.body.rating).toEqual({ average: 0, count: 0 });
  });

  it('returns 404 for an unknown user', async () => {
    expect((await api().get('/api/user/public/0123456789abcdef01234567')).status).toBe(404);
  });

  it('returns 400 for a malformed id', async () => {
    expect((await api().get('/api/user/public/abc')).status).toBe(400);
  });
});
