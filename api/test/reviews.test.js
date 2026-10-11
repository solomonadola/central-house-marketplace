import { describe, expect, it } from 'vitest';
import { api, createListing, createUser, signedInAgent } from './helpers.js';
import Listing from '../models/listing.model.js';
import Review from '../models/review.model.js';

// A buyer who has messaged the owner, and so may review the listing.
const setup = async () => {
  const owner = await createUser({ username: 'owner_user' });
  const listing = await createListing(owner);
  const ownerAgent = await signedInAgent(owner);
  const contactedBuyer = async (username) => {
    const user = await createUser({ username });
    const agent = await signedInAgent(user);
    await agent.post('/api/messages/conversations').send({ listingId: listing._id.toString(), body: 'Hi' });
    return { user, agent };
  };
  return { owner, listing, ownerAgent, contactedBuyer };
};

const review = (agent, listing, body) => agent.post(`/api/reviews/listing/${listing._id}`).send(body);

describe('POST /api/reviews/listing/:id', () => {
  it('lets someone who contacted the owner review the listing', async () => {
    const { listing, contactedBuyer } = await setup();
    const { agent } = await contactedBuyer('alice');

    const res = await review(agent, listing, { rating: 4, comment: '  Lovely place, quick replies.  ' });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ rating: 4, comment: 'Lovely place, quick replies.', author: { username: 'alice' } });
    expect(res.body.author).not.toHaveProperty('email');
    expect(await Listing.findById(listing._id)).toMatchObject({ ratingAverage: 4, ratingCount: 1 });
  });

  it("updates the user's existing review instead of adding another", async () => {
    const { listing, contactedBuyer } = await setup();
    const { agent } = await contactedBuyer('alice');

    await review(agent, listing, { rating: 2 });
    const res = await review(agent, listing, { rating: 5, comment: 'Changed my mind' });

    expect(res.status).toBe(200);
    expect(await Review.countDocuments()).toBe(1);
    expect(await Listing.findById(listing._id)).toMatchObject({ ratingAverage: 5, ratingCount: 1 });
  });

  it('averages ratings from several reviewers', async () => {
    const { listing, contactedBuyer } = await setup();
    for (const [name, rating] of [['alice', 5], ['bob', 4], ['carol', 4]]) {
      const { agent } = await contactedBuyer(name);
      await review(agent, listing, { rating });
    }

    expect(await Listing.findById(listing._id)).toMatchObject({ ratingAverage: 4.33, ratingCount: 3 });
  });

  it('requires contacting the owner first', async () => {
    const { listing } = await setup();
    const agent = await signedInAgent(await createUser());

    const res = await review(agent, listing, { rating: 1, comment: 'Never been there' });

    expect(res.status).toBe(403);
    expect(await Review.countDocuments()).toBe(0);
  });

  it('does not let owners review their own listing', async () => {
    const { listing, ownerAgent } = await setup();
    expect((await review(ownerAgent, listing, { rating: 5 })).status).toBe(400);
  });

  it.each([
    ['a missing rating', {}, 'Rating is required'],
    ['a rating of 0', { rating: 0 }, 'between 1 and 5'],
    ['a rating of 6', { rating: 6 }, 'between 1 and 5'],
    ['a fractional rating', { rating: 3.5 }, 'whole number'],
    ['a long comment', { rating: 3, comment: 'x'.repeat(1001) }, 'at most 1000 characters'],
  ])('rejects %s', async (_, body, message) => {
    const { listing, contactedBuyer } = await setup();
    const { agent } = await contactedBuyer('alice');

    const res = await review(agent, listing, body);

    expect(res.status).toBe(400);
    expect(res.body.message).toContain(message);
  });

  it('cannot set the rating fields on a listing directly', async () => {
    const { owner, listing, ownerAgent } = await setup();

    await ownerAgent.post(`/api/listing/update/${listing._id}`).send({ ratingAverage: 5, ratingCount: 999 });

    expect(await Listing.findById(listing._id)).toMatchObject({ ratingAverage: 0, ratingCount: 0 });
    expect(owner).toBeDefined();
  });
});

describe('GET /api/reviews/listing/:id', () => {
  it('returns reviews newest first with the summary', async () => {
    const { listing, contactedBuyer } = await setup();
    const alice = await contactedBuyer('alice');
    const bob = await contactedBuyer('bob');
    await review(alice.agent, listing, { rating: 5, comment: 'First' });
    await review(bob.agent, listing, { rating: 3, comment: 'Second' });

    const res = await api().get(`/api/reviews/listing/${listing._id}`);

    expect(res.body).toMatchObject({ average: 4, count: 2, viewer: null });
    expect(res.body.reviews.map((r) => r.comment)).toEqual(['Second', 'First']);
  });

  it('tells signed-in users whether they can review', async () => {
    const { listing, ownerAgent, contactedBuyer } = await setup();
    const { agent } = await contactedBuyer('alice');
    const stranger = await signedInAgent(await createUser());

    expect((await agent.get(`/api/reviews/listing/${listing._id}`)).body.viewer).toMatchObject({
      canReview: true,
      isOwner: false,
      ownReview: null,
    });
    expect((await stranger.get(`/api/reviews/listing/${listing._id}`)).body.viewer.canReview).toBe(false);
    expect((await ownerAgent.get(`/api/reviews/listing/${listing._id}`)).body.viewer).toMatchObject({
      canReview: false,
      isOwner: true,
    });
  });

  it("includes the viewer's own review", async () => {
    const { listing, contactedBuyer } = await setup();
    const { agent } = await contactedBuyer('alice');
    await review(agent, listing, { rating: 4, comment: 'Mine' });

    const res = await agent.get(`/api/reviews/listing/${listing._id}`);

    expect(res.body.viewer.ownReview).toMatchObject({ rating: 4, comment: 'Mine' });
  });

  it('works anonymously with an expired cookie', async () => {
    const { listing } = await setup();
    const res = await api().get(`/api/reviews/listing/${listing._id}`).set('Cookie', 'access_token=garbage');
    expect(res.status).toBe(200);
    expect(res.body.viewer).toBeNull();
  });

  it('returns 404 for a missing listing', async () => {
    expect((await api().get('/api/reviews/listing/0123456789abcdef01234567')).status).toBe(404);
  });
});

describe('DELETE /api/reviews/:id', () => {
  it('lets authors delete their review and updates the rating', async () => {
    const { listing, contactedBuyer } = await setup();
    const { agent } = await contactedBuyer('alice');
    const created = await review(agent, listing, { rating: 2 });

    await agent.delete(`/api/reviews/${created.body._id}`).expect(200);

    expect(await Listing.findById(listing._id)).toMatchObject({ ratingAverage: 0, ratingCount: 0 });
  });

  it("forbids deleting someone else's review", async () => {
    const { listing, ownerAgent, contactedBuyer } = await setup();
    const { agent } = await contactedBuyer('alice');
    const created = await review(agent, listing, { rating: 1 });

    expect((await ownerAgent.delete(`/api/reviews/${created.body._id}`)).status).toBe(401);
    expect(await Review.countDocuments()).toBe(1);
  });
});

describe('GET /api/reviews/owner/:id', () => {
  it("averages ratings across the owner's listings, weighted by review count", async () => {
    const owner = await createUser();
    await createListing(owner, { ratingAverage: 5, ratingCount: 1 });
    await createListing(owner, { ratingAverage: 3, ratingCount: 3 });
    await createListing(owner);

    const res = await api().get(`/api/reviews/owner/${owner._id}`);

    expect(res.body).toEqual({ average: 3.5, count: 4 });
  });

  it('returns zero for owners without reviews', async () => {
    const owner = await createUser();
    expect((await api().get(`/api/reviews/owner/${owner._id}`)).body).toEqual({ average: 0, count: 0 });
  });
});

describe('deleting data', () => {
  it("removes a deleted listing's reviews", async () => {
    const { listing, ownerAgent, contactedBuyer } = await setup();
    const { agent } = await contactedBuyer('alice');
    await review(agent, listing, { rating: 5 });

    await ownerAgent.delete(`/api/listing/delete/${listing._id}`).expect(200);

    expect(await Review.countDocuments()).toBe(0);
  });

  it("removes a deleted user's reviews and recalculates ratings", async () => {
    const { listing, contactedBuyer } = await setup();
    const alice = await contactedBuyer('alice');
    const bob = await contactedBuyer('bob');
    await review(alice.agent, listing, { rating: 1 });
    await review(bob.agent, listing, { rating: 5 });

    await alice.agent.delete(`/api/user/delete/${alice.user._id}`).expect(200);

    expect(await Listing.findById(listing._id)).toMatchObject({ ratingAverage: 5, ratingCount: 1 });
  });
});
