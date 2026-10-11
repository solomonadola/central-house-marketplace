import { describe, expect, it } from 'vitest';
import { api, createListing, createUser, signedInAgent, validListing } from './helpers.js';
import Listing from '../models/listing.model.js';

describe('POST /api/listing/create', () => {
  it('creates a listing owned by the signed-in user', async () => {
    const user = await createUser();
    const agent = await signedInAgent(user);

    const res = await agent.post('/api/listing/create').send(validListing());

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ name: validListing().name, userRef: user._id.toString() });
  });

  it('ignores a userRef in the body', async () => {
    const user = await createUser();
    const other = await createUser();
    const agent = await signedInAgent(user);

    const res = await agent
      .post('/api/listing/create')
      .send(validListing({ userRef: other._id.toString() }));

    expect(res.body.userRef).toBe(user._id.toString());
  });

  it('coerces numeric strings from form inputs', async () => {
    const agent = await signedInAgent(await createUser());

    const res = await agent
      .post('/api/listing/create')
      .send(validListing({ regularPrice: '950', bedrooms: '3', bathrooms: '2' }));

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ regularPrice: 950, bedrooms: 3, bathrooms: 2 });
  });

  it.each([
    ['an unknown type', { type: 'banana' }, "Type must be 'rent' or 'sale'"],
    ['a negative price', { regularPrice: -5 }, 'Regular price cannot be negative'],
    ['a price below 50', { regularPrice: 10 }, 'Regular price must be at least 50'],
    ['too many bedrooms', { bedrooms: 11 }, 'Bedrooms must be between 1 and 10'],
    ['fractional bathrooms', { bathrooms: 1.5 }, 'Bathrooms must be a whole number'],
    ['a short name', { name: 'Tiny' }, 'Name must be at least 10 characters'],
    ['no images', { imageUrls: [] }, 'You must upload at least one image'],
    ['seven images', { imageUrls: Array(7).fill('https://example.com/a.jpg') }, 'at most 6 images'],
    ['a non-URL image', { imageUrls: ['javascript:alert(1)'] }, 'Image must be a URL'],
    ['a discount above the price', { offer: true, discountPrice: 2000 }, 'Discount price must be lower'],
    ['a missing address', { address: undefined }, 'address is required'],
  ])('rejects %s', async (_, override, message) => {
    const agent = await signedInAgent(await createUser());

    const res = await agent.post('/api/listing/create').send(validListing(override));

    expect(res.status).toBe(400);
    expect(res.body.message).toContain(message);
    expect(await Listing.countDocuments()).toBe(0);
  });

  it('allows any discount when there is no offer', async () => {
    const agent = await signedInAgent(await createUser());

    const res = await agent.post('/api/listing/create').send(validListing({ offer: false, discountPrice: 5000 }));

    expect(res.status).toBe(201);
  });
});

describe('POST /api/listing/update/:id', () => {
  it('lets the owner update a subset of fields', async () => {
    const user = await createUser();
    const listing = await createListing(user);
    const agent = await signedInAgent(user);

    const res = await agent.post(`/api/listing/update/${listing._id}`).send({ name: 'A Brand New Listing Name' });

    expect(res.status).toBe(200);
    expect(res.body.name).toBe('A Brand New Listing Name');
    expect(res.body.address).toBe(listing.address);
  });

  it('accepts the full listing the edit form sends back', async () => {
    const user = await createUser();
    const listing = await createListing(user);
    const agent = await signedInAgent(user);

    const res = await agent
      .post(`/api/listing/update/${listing._id}`)
      .send({ ...listing.toObject(), _id: listing._id.toString(), bedrooms: 4 });

    expect(res.status).toBe(200);
    expect(res.body.bedrooms).toBe(4);
  });

  it("forbids updating someone else's listing", async () => {
    const owner = await createUser();
    const listing = await createListing(owner);
    const agent = await signedInAgent(await createUser());

    const res = await agent.post(`/api/listing/update/${listing._id}`).send({ name: 'Hijacked Listing Name' });

    expect(res.status).toBe(401);
    expect((await Listing.findById(listing._id)).name).toBe(listing.name);
  });

  it('cannot transfer ownership', async () => {
    const owner = await createUser();
    const other = await createUser();
    const listing = await createListing(owner);
    const agent = await signedInAgent(owner);

    await agent.post(`/api/listing/update/${listing._id}`).send({ userRef: other._id.toString() });

    expect((await Listing.findById(listing._id)).userRef).toBe(owner._id.toString());
  });

  it('validates updated fields', async () => {
    const user = await createUser();
    const listing = await createListing(user);
    const agent = await signedInAgent(user);

    const res = await agent.post(`/api/listing/update/${listing._id}`).send({ bedrooms: 99 });

    expect(res.status).toBe(400);
  });

  it('returns 404 for a listing that does not exist', async () => {
    const agent = await signedInAgent(await createUser());

    const res = await agent.post('/api/listing/update/0123456789abcdef01234567').send({ bedrooms: 2 });

    expect(res.status).toBe(404);
  });
});

describe('DELETE /api/listing/delete/:id', () => {
  it('lets the owner delete their listing', async () => {
    const user = await createUser();
    const listing = await createListing(user);
    const agent = await signedInAgent(user);

    const res = await agent.delete(`/api/listing/delete/${listing._id}`);

    expect(res.status).toBe(200);
    expect(await Listing.findById(listing._id)).toBeNull();
  });

  it("forbids deleting someone else's listing", async () => {
    const listing = await createListing(await createUser());
    const agent = await signedInAgent(await createUser());

    const res = await agent.delete(`/api/listing/delete/${listing._id}`);

    expect(res.status).toBe(401);
    expect(await Listing.findById(listing._id)).not.toBeNull();
  });
});

describe('GET /api/listing/get/:id', () => {
  it('returns a listing without auth', async () => {
    const listing = await createListing(await createUser());

    const res = await api().get(`/api/listing/get/${listing._id}`);

    expect(res.status).toBe(200);
    expect(res.body.name).toBe(listing.name);
  });

  it('returns 404 for a listing that does not exist', async () => {
    const res = await api().get('/api/listing/get/0123456789abcdef01234567');
    expect(res.status).toBe(404);
  });
});

describe('malformed ids', () => {
  it.each([
    ['get', 'get', '/api/listing/get/abc'],
    ['update', 'post', '/api/listing/update/abc'],
    ['delete', 'delete', '/api/listing/delete/abc'],
  ])('return 400 on %s instead of crashing', async (_, method, url) => {
    const agent = await signedInAgent(await createUser());

    const res = await agent[method](url).send({});

    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Invalid id!');
  });
});

describe('POST /api/listing/view/:id', () => {
  it('counts a view without auth', async () => {
    const listing = await createListing(await createUser());

    await api().post(`/api/listing/view/${listing._id}`).expect(200);
    const res = await api().post(`/api/listing/view/${listing._id}`).expect(200);

    expect(res.body).toEqual({ views: 2 });
    expect((await Listing.findById(listing._id)).views).toBe(2);
  });

  it('starts new listings at zero views', async () => {
    const agent = await signedInAgent(await createUser());
    const res = await agent.post('/api/listing/create').send(validListing());
    expect(res.body.views).toBe(0);
  });

  it('does not let owners set the view count', async () => {
    const user = await createUser();
    const agent = await signedInAgent(user);

    const created = await agent.post('/api/listing/create').send(validListing({ views: 9999 }));
    const updated = await agent.post(`/api/listing/update/${created.body._id}`).send({ views: 9999 });

    expect(created.body.views).toBe(0);
    expect(updated.body.views).toBe(0);
  });

  it('returns 404 for a missing listing and 400 for a malformed id', async () => {
    expect((await api().post('/api/listing/view/0123456789abcdef01234567')).status).toBe(404);
    expect((await api().post('/api/listing/view/abc')).status).toBe(400);
  });
});
