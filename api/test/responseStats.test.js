import { describe, expect, it } from 'vitest';
import { api, createListing, createUser } from './helpers.js';
import Conversation from '../models/conversation.model.js';
import Message from '../models/message.model.js';
import { describeResponseTime, median } from '../utils/responseStats.js';

const HOUR = 60 * 60 * 1000;

// A conversation where a buyer asks and, optionally, the owner replies
// `replyAfterHours` later.
const thread = async (owner, listing, replyAfterHours, { daysAgo = 1 } = {}) => {
  const buyer = await createUser();
  const askedAt = new Date(Date.now() - daysAgo * 24 * HOUR);
  const conversation = await Conversation.create({
    listing: listing._id,
    buyer: buyer._id,
    owner: owner._id,
    participants: [{ user: buyer._id }, { user: owner._id }],
    createdAt: askedAt,
  });
  await Message.create({ conversation: conversation._id, sender: buyer._id, body: 'Hi', createdAt: askedAt });
  if (replyAfterHours != null) {
    await Message.create({
      conversation: conversation._id,
      sender: owner._id,
      body: 'Hello!',
      createdAt: new Date(askedAt.getTime() + replyAfterHours * HOUR),
    });
  }
};

const stats = async (owner) => (await api().get(`/api/user/public/${owner._id}/response-stats`)).body.stats;

describe('response time helpers', () => {
  it('computes medians', () => {
    expect(median([5, 1, 3])).toBe(3);
    expect(median([4, 1, 3, 2])).toBe(2.5);
    expect(median([])).toBeNull();
  });

  it.each([
    [0.5 * HOUR, 'within an hour'],
    [2.2 * HOUR, 'within 3 hours'],
    [20 * HOUR, 'within 20 hours'],
    [24 * HOUR, 'within a day'],
    [50 * HOUR, 'within 3 days'],
  ])('describes %d ms as %s', (ms, text) => {
    expect(describeResponseTime(ms)).toBe(text);
  });
});

describe('GET /api/user/public/:id/response-stats', () => {
  it('reports the response rate and typical reply time', async () => {
    const owner = await createUser();
    const listing = await createListing(owner);
    await thread(owner, listing, 1);
    await thread(owner, listing, 3);
    await thread(owner, listing, 5);
    await thread(owner, listing, null);

    expect(await stats(owner)).toEqual({
      conversations: 4,
      responseRate: 75,
      medianResponseMs: 3 * HOUR,
      responseTime: 'within 3 hours',
    });
  });

  it('stays quiet until there are enough conversations', async () => {
    const owner = await createUser();
    const listing = await createListing(owner);
    await thread(owner, listing, 1);
    await thread(owner, listing, 1);

    expect(await stats(owner)).toBeNull();
  });

  it('ignores conversations older than 90 days', async () => {
    const owner = await createUser();
    const listing = await createListing(owner);
    for (let i = 0; i < 3; i++) await thread(owner, listing, 1, { daysAgo: 120 });

    expect(await stats(owner)).toBeNull();
  });

  it('counts unanswered conversations with a null reply time', async () => {
    const owner = await createUser();
    const listing = await createListing(owner);
    for (let i = 0; i < 3; i++) await thread(owner, listing, null);

    expect(await stats(owner)).toEqual({ conversations: 3, responseRate: 0, medianResponseMs: null, responseTime: null });
  });

  it('returns 404 for unknown users', async () => {
    expect((await api().get('/api/user/public/0123456789abcdef01234567/response-stats')).status).toBe(404);
  });
});
