import { describe, expect, it } from 'vitest';
import { api, createListing, createUser, signedInAgent } from './helpers.js';
import ContentFlag from '../models/contentFlag.model.js';
import Review from '../models/review.model.js';
import ListingQuestion from '../models/listingQuestion.model.js';
import Listing from '../models/listing.model.js';
import Notification from '../models/notification.model.js';
import AuditLog from '../models/auditLog.model.js';
import { updateListingRating } from '../utils/ratings.js';

// A listing with a 1-star review and an answered question on it, plus an
// admin and a user who will flag things.
const setup = async () => {
  const owner = await createUser({ username: 'owner_ola' });
  const author = await createUser({ username: 'rude_reviewer' });
  const flagger = await createUser({ username: 'careful_reader' });
  const admin = await createUser({ username: 'mod_admin', role: 'admin' });
  const listing = await createListing(owner, { name: 'Quiet Cottage' });
  const review = await Review.create({ listing: listing._id, author: author._id, rating: 1, comment: 'Buy cheap pills at spam.example' });
  await Review.create({ listing: listing._id, author: flagger._id, rating: 5, comment: 'Lovely place.' });
  await updateListingRating(listing._id);
  const question = await ListingQuestion.create({
    listing: listing._id,
    asker: author._id,
    question: 'Call me on 555-0100 for a better deal?',
    answer: { body: 'No thanks.', answeredAt: new Date() },
  });
  return {
    owner,
    author,
    flagger,
    admin,
    listing,
    review,
    question,
    flaggerAgent: await signedInAgent(flagger),
    authorAgent: await signedInAgent(author),
    adminAgent: await signedInAgent(admin),
  };
};

const flag = (agent, targetType, target, overrides = {}) =>
  agent.post('/api/content-flags').send({ targetType, targetId: target._id.toString(), reason: 'spam', ...overrides });

describe('flagging content', () => {
  it('records a flag and alerts admins on the first one', async () => {
    const { admin, flaggerAgent, review } = await setup();

    const res = await flag(flaggerAgent, 'review', review, { details: 'Advertising' });

    expect(res.status).toBe(201);
    expect(await ContentFlag.findOne({ target: review._id })).toMatchObject({ reason: 'spam', details: 'Advertising', status: 'open' });
    expect(await Notification.findOne({ recipient: admin._id })).toMatchObject({
      title: 'A review was flagged',
      body: 'Buy cheap pills at spam.example',
      link: '/admin?tab=content',
    });
  });

  it("doesn't alert admins again for more flags on the same content", async () => {
    const { admin, owner, flaggerAgent, review } = await setup();
    await flag(flaggerAgent, 'review', review);

    await flag(await signedInAgent(owner), 'review', review, { reason: 'offensive' });

    expect(await Notification.countDocuments({ recipient: admin._id })).toBe(1);
  });

  it('allows one open flag per person', async () => {
    const { flaggerAgent, question } = await setup();
    await flag(flaggerAgent, 'question', question);

    const res = await flag(flaggerAgent, 'question', question);

    expect(res.status).toBe(409);
    expect(res.body.message).toBe('You already flagged this question.');
  });

  it("won't let people flag their own content", async () => {
    const { authorAgent, review } = await setup();

    const res = await flag(authorAgent, 'review', review);

    expect(res.status).toBe(400);
    expect(res.body.message).toBe("You can't flag your own review.");
  });

  it.each([
    ['an unknown type', { targetType: 'listing' }, 'You can flag a review or a question'],
    ['an unknown reason', { reason: 'boring' }, 'Choose why you are flagging this'],
  ])('rejects %s', async (_, overrides, message) => {
    const { flaggerAgent, review } = await setup();

    const res = await flag(flaggerAgent, 'review', review, overrides);

    expect(res.status).toBe(400);
    expect(res.body.message).toBe(message);
  });

  it('needs a signed-in user and existing content', async () => {
    const { flaggerAgent, review } = await setup();

    expect((await api().post('/api/content-flags').send({})).status).toBe(401);
    await review.deleteOne();
    expect((await flag(flaggerAgent, 'review', review)).status).toBe(404);
  });
});

describe('moderation queue', () => {
  it('groups open flags by content, most flagged first', async () => {
    const { owner, flaggerAgent, adminAgent, review, question } = await setup();
    await flag(flaggerAgent, 'question', question, { reason: 'personal_info' });
    await flag(flaggerAgent, 'review', review);
    await flag(await signedInAgent(owner), 'review', review, { reason: 'offensive', details: 'Not about the home' });

    const res = await adminAgent.get('/api/admin/content/flagged');

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
    expect(res.body[0]).toMatchObject({
      targetType: 'review',
      targetId: review._id.toString(),
      text: 'Buy cheap pills at spam.example',
      rating: 1,
      author: { username: 'rude_reviewer' },
      listing: { name: 'Quiet Cottage' },
      flagCount: 2,
      reasons: { spam: 1, offensive: 1 },
      details: ['Not about the home'],
    });
    expect(res.body[1]).toMatchObject({ targetType: 'question', reasons: { personal_info: 1 } });
  });

  it('is only for admins', async () => {
    const { flaggerAgent } = await setup();

    expect((await flaggerAgent.get('/api/admin/content/flagged')).status).toBe(403);
  });
});

describe('removing content', () => {
  it('hides a removed review, drops it from the rating and tells the author', async () => {
    const { author, listing, flaggerAgent, adminAgent, review } = await setup();
    await flag(flaggerAgent, 'review', review);
    expect((await Listing.findById(listing._id)).ratingAverage).toBe(3);

    const res = await adminAgent.post(`/api/admin/content/review/${review._id}/remove`).send({ reason: 'Spam link' });

    expect(res.body).toEqual({ removed: true });
    expect((await Listing.findById(listing._id)).toObject()).toMatchObject({ ratingAverage: 5, ratingCount: 1 });
    const publicReviews = await api().get(`/api/reviews/listing/${listing._id}`);
    expect(publicReviews.body.reviews.map((r) => r.comment)).toEqual(['Lovely place.']);
    expect(await ContentFlag.findOne({ target: review._id })).toMatchObject({ status: 'actioned' });
    expect(await Notification.findOne({ recipient: author._id })).toMatchObject({
      type: 'content_removed',
      title: 'Your review on "Quiet Cottage" was removed',
      body: 'Reason: Spam link',
    });
    expect(await AuditLog.findOne({ action: 'remove_content' })).toMatchObject({
      targetType: 'review',
      targetLabel: 'Buy cheap pills at spam.example',
      reason: 'Spam link',
    });
    expect((await adminAgent.get('/api/admin/content/flagged')).body).toEqual([]);
  });

  it('still shows authors their own removed review', async () => {
    const { listing, authorAgent, adminAgent, review } = await setup();
    await adminAgent.post(`/api/admin/content/review/${review._id}/remove`).send({ reason: 'Spam link' });

    const res = await authorAgent.get(`/api/reviews/listing/${listing._id}`);

    expect(res.body.reviews).toHaveLength(1);
    expect(res.body.viewer.ownReview).toMatchObject({ removed: true, removedReason: 'Spam link' });
  });

  it('hides a removed question', async () => {
    const { listing, adminAgent, question } = await setup();

    await adminAgent.post(`/api/admin/content/question/${question._id}/remove`).send({ reason: 'Personal phone number' });

    const res = await api().get(`/api/questions/listing/${listing._id}`);
    expect(res.body.questions).toEqual([]);
  });

  it('requires a reason and an existing, visible target', async () => {
    const { adminAgent, review } = await setup();

    expect((await adminAgent.post(`/api/admin/content/review/${review._id}/remove`).send({})).status).toBe(400);
    expect((await adminAgent.post(`/api/admin/content/listing/${review._id}/remove`).send({ reason: 'x' })).status).toBe(404);
    await adminAgent.post(`/api/admin/content/review/${review._id}/remove`).send({ reason: 'Spam' });
    expect((await adminAgent.post(`/api/admin/content/review/${review._id}/remove`).send({ reason: 'Spam' })).status).toBe(409);
  });

  it('lists removed content and restores it', async () => {
    const { listing, adminAgent, review } = await setup();
    await adminAgent.post(`/api/admin/content/review/${review._id}/remove`).send({ reason: 'Spam link' });

    const removed = await adminAgent.get('/api/admin/content/removed');
    expect(removed.body).toEqual([
      expect.objectContaining({ targetType: 'review', removedReason: 'Spam link', listing: expect.objectContaining({ name: 'Quiet Cottage' }) }),
    ]);

    const res = await adminAgent.post(`/api/admin/content/review/${review._id}/restore`);

    expect(res.body).toEqual({ removed: false });
    expect((await Listing.findById(listing._id)).ratingAverage).toBe(3);
    expect(await AuditLog.findOne({ action: 'restore_content' })).toBeTruthy();
    expect((await adminAgent.post(`/api/admin/content/review/${review._id}/restore`)).status).toBe(409);
  });
});

describe('dismissing flags', () => {
  it('closes the flags and leaves the content up', async () => {
    const { listing, flaggerAgent, adminAgent, question } = await setup();
    await flag(flaggerAgent, 'question', question);

    const res = await adminAgent.post(`/api/admin/content/question/${question._id}/dismiss`);

    expect(res.body).toEqual({ dismissed: 1 });
    expect(await ContentFlag.findOne({ target: question._id })).toMatchObject({ status: 'dismissed' });
    expect((await api().get(`/api/questions/listing/${listing._id}`)).body.questions).toHaveLength(1);
    expect(await AuditLog.findOne({ action: 'dismiss_flags' })).toMatchObject({ meta: { flags: 1 } });
  });

  it('lets people flag it again after a dismissal', async () => {
    const { flaggerAgent, adminAgent, question } = await setup();
    await flag(flaggerAgent, 'question', question);
    await adminAgent.post(`/api/admin/content/question/${question._id}/dismiss`);

    expect((await flag(flaggerAgent, 'question', question)).status).toBe(201);
  });

  it('says when there is nothing to dismiss', async () => {
    const { adminAgent, question } = await setup();

    expect((await adminAgent.post(`/api/admin/content/question/${question._id}/dismiss`)).status).toBe(409);
  });
});
