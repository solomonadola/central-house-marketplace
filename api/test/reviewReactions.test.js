import { describe, expect, it } from 'vitest';
import { api, createListing, createUser, signedInAgent } from './helpers.js';
import Review from '../models/review.model.js';

const setup = async () => {
  const owner = await createUser();
  const buyer = await createUser();
  const listing = await createListing(owner);
  const ownerAgent = await signedInAgent(owner);
  const buyerAgent = await signedInAgent(buyer);

  await buyerAgent.post('/api/messages/conversations').send({ listingId: listing._id.toString(), body: 'Hi' });
  const review = await buyerAgent.post(`/api/reviews/listing/${listing._id}`).send({ rating: 5, comment: 'Great host' });

  return { owner, buyer, listing, ownerAgent, buyerAgent, reviewId: review.body._id };
};

describe('POST /api/reviews/:id/helpful', () => {
  it('requires sign-in', async () => {
    const { reviewId } = await setup();
    expect((await api().post(`/api/reviews/${reviewId}/helpful`)).status).toBe(401);
  });

  it('toggles a helpful vote', async () => {
    const { reviewId } = await setup();
    const voter = await signedInAgent(await createUser());

    const on = await voter.post(`/api/reviews/${reviewId}/helpful`);
    expect(on.body).toEqual({ helpfulCount: 1, voted: true });

    const off = await voter.post(`/api/reviews/${reviewId}/helpful`);
    expect(off.body).toEqual({ helpfulCount: 0, voted: false });
  });

  it('counts distinct voters only once each', async () => {
    const { reviewId } = await setup();
    const first = await signedInAgent(await createUser());
    const second = await signedInAgent(await createUser());

    await first.post(`/api/reviews/${reviewId}/helpful`);
    await second.post(`/api/reviews/${reviewId}/helpful`);
    await first.post(`/api/reviews/${reviewId}/helpful`);

    expect((await Review.findById(reviewId)).helpfulCount).toBe(1);
  });

  it("won't let authors mark their own review helpful", async () => {
    const { buyerAgent, reviewId } = await setup();

    const res = await buyerAgent.post(`/api/reviews/${reviewId}/helpful`);

    expect(res.status).toBe(400);
  });

  it('reports whether the viewer voted', async () => {
    const { listing, reviewId } = await setup();
    const voter = await signedInAgent(await createUser());
    await voter.post(`/api/reviews/${reviewId}/helpful`);

    const mine = await voter.get(`/api/reviews/listing/${listing._id}`);
    expect(mine.body.reviews[0]).toMatchObject({ helpfulCount: 1, votedHelpful: true });
  });
});

describe('PATCH /api/reviews/:id/reply', () => {
  it('lets the owner reply', async () => {
    const { ownerAgent, reviewId } = await setup();

    const res = await ownerAgent.patch(`/api/reviews/${reviewId}/reply`).send({ comment: 'Thanks for staying!' });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ ownerReply: 'Thanks for staying!' });
    expect(res.body.ownerRepliedAt).not.toBeNull();
  });

  it('shows the reply on the listing', async () => {
    const { ownerAgent, listing, reviewId } = await setup();
    await ownerAgent.patch(`/api/reviews/${reviewId}/reply`).send({ comment: 'Much appreciated' });

    const res = await api().get(`/api/reviews/listing/${listing._id}`);
    expect(res.body.reviews[0].ownerReply).toBe('Much appreciated');
  });

  it("won't let other users reply", async () => {
    const { reviewId } = await setup();
    const stranger = await signedInAgent(await createUser());

    expect((await stranger.patch(`/api/reviews/${reviewId}/reply`).send({ comment: 'Nope' })).status).toBe(403);
  });

  it('rejects an empty reply', async () => {
    const { ownerAgent, reviewId } = await setup();

    const res = await ownerAgent.patch(`/api/reviews/${reviewId}/reply`).send({ comment: '   ' });

    expect(res.status).toBe(400);
    expect(res.body.message).toContain('Reply cannot be empty');
  });

  it('requires sign-in', async () => {
    const { reviewId } = await setup();
    expect((await api().patch(`/api/reviews/${reviewId}/reply`).send({ comment: 'hi' })).status).toBe(401);
  });
});

describe('sorting reviews', () => {
  const seed = async () => {
    const owner = await createUser();
    const listing = await createListing(owner);
    const authors = await Promise.all([createUser(), createUser(), createUser()]);
    await Review.create([
      { listing: listing._id, author: authors[0]._id, rating: 2, helpfulCount: 5 },
      { listing: listing._id, author: authors[1]._id, rating: 5, helpfulCount: 1 },
      { listing: listing._id, author: authors[2]._id, rating: 4, helpfulCount: 9 },
    ]);
    return listing;
  };

  it('sorts by helpful votes', async () => {
    const listing = await seed();
    const res = await api().get(`/api/reviews/listing/${listing._id}?sort=helpful`);
    expect(res.body.reviews.map((r) => r.helpfulCount)).toEqual([9, 5, 1]);
  });

  it('sorts by rating high and low', async () => {
    const listing = await seed();
    const high = await api().get(`/api/reviews/listing/${listing._id}?sort=rating_high`);
    const low = await api().get(`/api/reviews/listing/${listing._id}?sort=rating_low`);
    expect(high.body.reviews.map((r) => r.rating)).toEqual([5, 4, 2]);
    expect(low.body.reviews.map((r) => r.rating)).toEqual([2, 4, 5]);
  });
});
