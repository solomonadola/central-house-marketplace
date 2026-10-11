import { describe, expect, it } from 'vitest';
import { api, createListing, createUser, signedInAgent } from './helpers.js';
import Listing from '../models/listing.model.js';

describe('POST /api/listing/:id/duplicate', () => {
  it('clones a listing as an unpublished draft', async () => {
    const user = await createUser();
    const source = await createListing(user, {
      name: 'Original Cozy Home',
      amenities: ['wifi', 'garden'],
      propertyType: 'house',
      views: 42,
    });
    const agent = await signedInAgent(user);

    const res = await agent.post(`/api/listing/${source._id}/duplicate`);

    expect(res.status).toBe(201);
    expect(res.body.name).toBe('Original Cozy Home (copy)');
    expect(res.body).toMatchObject({
      active: false,
      propertyType: 'house',
      amenities: ['wifi', 'garden'],
      address: source.address,
    });
    // View counts and moderation state aren't copied.
    expect(res.body.views).toBe(0);
    expect(res.body.userRef).toBe(user._id.toString());
    expect(await Listing.countDocuments({ userRef: user._id })).toBe(2);
  });

  it('does not publish the copy', async () => {
    const user = await createUser();
    const source = await createListing(user, { name: 'Unpublished Copy Home' });
    const agent = await signedInAgent(user);

    await agent.post(`/api/listing/${source._id}/duplicate`);

    const body = (await api().get('/api/listing/get')).body;
    expect(body.map((l) => l.name)).not.toContain('Unpublished Copy Home (copy)');
  });

  it("won't let others duplicate your listing", async () => {
    const source = await createListing(await createUser());
    const agent = await signedInAgent(await createUser());

    expect((await agent.post(`/api/listing/${source._id}/duplicate`)).status).toBe(401);
  });

  it('returns 404 for a missing listing', async () => {
    const agent = await signedInAgent(await createUser());
    expect((await agent.post('/api/listing/0123456789abcdef01234567/duplicate')).status).toBe(404);
  });
});
