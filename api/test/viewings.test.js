import { describe, expect, it } from 'vitest';
import { api, createListing, createUser, signedInAgent } from './helpers.js';
import Viewing from '../models/viewing.model.js';
import Message from '../models/message.model.js';
import { formatViewingTime } from '../controllers/viewing.controller.js';

const DAY = 24 * 60 * 60 * 1000;
const inDays = (days) => new Date(Date.now() + days * DAY);

// A fixed upcoming time, and how messages should describe it.
const SLOT = new Date(Math.ceil((Date.now() + 5 * DAY) / 3_600_000) * 3_600_000);
const SLOT_TEXT = formatViewingTime(SLOT, 'America/Los_Angeles');

const setup = async () => {
  const owner = await createUser({ username: 'owner_user' });
  const buyer = await createUser({ username: 'buyer_user' });
  const listing = await createListing(owner);
  return {
    owner,
    buyer,
    listing,
    ownerAgent: await signedInAgent(owner),
    buyerAgent: await signedInAgent(buyer),
  };
};

const request = (agent, listing, overrides = {}) =>
  agent.post('/api/viewings').send({
    listingId: listing._id.toString(),
    startsAt: inDays(3).toISOString(),
    timeZone: 'America/Los_Angeles',
    ...overrides,
  });

const respond = (agent, viewingId, action, note) =>
  agent.patch(`/api/viewings/${viewingId}`).send({ action, ...(note && { note }) });

const messageBodies = async () => (await Message.find().sort({ createdAt: 1, _id: 1 })).map((m) => m.body);

describe('formatViewingTime', () => {
  it('writes the time in the given time zone', () => {
    const date = new Date('2026-10-17T17:00:00Z');
    expect(formatViewingTime(date, 'America/Los_Angeles')).toBe('Sat, Oct 17 at 10:00 AM');
    expect(formatViewingTime(date, 'Africa/Addis_Ababa')).toBe('Sat, Oct 17 at 8:00 PM');
  });
});

describe('POST /api/viewings', () => {
  it('requests a viewing and posts it to the conversation', async () => {
    const { owner, buyer, listing, buyerAgent } = await setup();
    const res = await request(buyerAgent, listing, { startsAt: SLOT.toISOString(), note: 'After work please' });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      status: 'pending',
      note: 'After work please',
      timeZone: 'America/Los_Angeles',
      requester: { username: 'buyer_user' },
      owner: { username: 'owner_user' },
      listing: { name: listing.name },
    });
    expect(res.body.requester).not.toHaveProperty('email');
    expect(await messageBodies()).toEqual([`Viewing requested for ${SLOT_TEXT}.\n\n"After work please"`]);

    const ownerInbox = await (await signedInAgent(owner)).get('/api/messages/conversations');
    expect(ownerInbox.body[0]).toMatchObject({ otherUser: { _id: buyer._id.toString() }, unreadCount: 1 });
  });

  it('allows only one upcoming request per listing', async () => {
    const { listing, buyerAgent } = await setup();

    await request(buyerAgent, listing).expect(201);
    const second = await request(buyerAgent, listing, { startsAt: inDays(5).toISOString() });

    expect(second.status).toBe(409);
  });

  it('allows a new request after the previous one was declined', async () => {
    const { listing, buyerAgent, ownerAgent } = await setup();
    const first = await request(buyerAgent, listing);
    await respond(ownerAgent, first.body._id, 'decline').expect(200);

    expect((await request(buyerAgent, listing, { startsAt: inDays(4).toISOString() })).status).toBe(201);
  });

  it.each([
    ['a time in the past', { startsAt: new Date(Date.now() - 60_000).toISOString() }, 'in the future'],
    ['a time too far ahead', { startsAt: inDays(120).toISOString() }, 'up to 90 days ahead'],
    ['an invalid date', { startsAt: 'next tuesday' }, 'valid date and time'],
    ['an unknown time zone', { timeZone: 'Mars/Olympus_Mons' }, 'Invalid time zone'],
    ['a long note', { note: 'x'.repeat(501) }, 'at most 500 characters'],
  ])('rejects %s', async (_, override, message) => {
    const { listing, buyerAgent } = await setup();

    const res = await request(buyerAgent, listing, override);

    expect(res.status).toBe(400);
    expect(res.body.message).toContain(message);
  });

  it("does not let owners book their own listing", async () => {
    const { listing, ownerAgent } = await setup();
    expect((await request(ownerAgent, listing)).status).toBe(400);
  });

  it('returns 404 for hidden or missing listings', async () => {
    const { owner, buyerAgent } = await setup();
    const hidden = await createListing(owner, { hidden: true });

    expect((await request(buyerAgent, hidden)).status).toBe(404);
    expect((await request(buyerAgent, { _id: '0123456789abcdef01234567' })).status).toBe(404);
  });

  it('requires sign-in', async () => {
    expect((await api().post('/api/viewings').send({})).status).toBe(401);
  });
});

describe('PATCH /api/viewings/:id', () => {
  const requested = async () => {
    const ctx = await setup();
    const res = await request(ctx.buyerAgent, ctx.listing, { startsAt: SLOT.toISOString() });
    return { ...ctx, viewingId: res.body._id };
  };

  it('lets the owner accept with a note', async () => {
    const { ownerAgent, viewingId } = await requested();

    const res = await respond(ownerAgent, viewingId, 'accept', 'Ring the top bell');

    expect(res.body).toMatchObject({ status: 'accepted', responseNote: 'Ring the top bell' });
    expect((await messageBodies()).at(-1)).toBe(`Viewing on ${SLOT_TEXT} accepted.\n\n"Ring the top bell"`);
  });

  it('lets the owner decline', async () => {
    const { ownerAgent, viewingId } = await requested();

    const res = await respond(ownerAgent, viewingId, 'decline');

    expect(res.body.status).toBe('declined');
    expect((await messageBodies()).at(-1)).toBe(`Viewing on ${SLOT_TEXT} declined.`);
  });

  it('does not let the requester accept their own request', async () => {
    const { buyerAgent, viewingId } = await requested();
    expect((await respond(buyerAgent, viewingId, 'accept')).status).toBe(403);
  });

  it('lets either side cancel, and says who cancelled', async () => {
    const { buyerAgent, ownerAgent, viewingId } = await requested();
    await respond(ownerAgent, viewingId, 'accept');

    const res = await respond(buyerAgent, viewingId, 'cancel', 'Found another place');

    expect(res.body.status).toBe('cancelled');
    expect((await messageBodies()).at(-1)).toBe(
      `Viewing on ${SLOT_TEXT} cancelled by buyer_user.\n\n"Found another place"`
    );
  });

  it('only changes pending or accepted viewings', async () => {
    const { buyerAgent, ownerAgent, viewingId } = await requested();
    await respond(ownerAgent, viewingId, 'decline');

    expect((await respond(ownerAgent, viewingId, 'accept')).status).toBe(409);
    expect((await respond(buyerAgent, viewingId, 'cancel')).status).toBe(409);
  });

  it('does not accept a time that has passed', async () => {
    const { ownerAgent, viewingId } = await requested();
    await Viewing.updateOne({ _id: viewingId }, { startsAt: new Date(Date.now() - DAY) });

    const res = await respond(ownerAgent, viewingId, 'accept');

    expect(res.status).toBe(409);
    expect(res.body.message).toMatch(/already passed/);
  });

  it('hides viewings from other users', async () => {
    const { viewingId } = await requested();
    const stranger = await signedInAgent(await createUser());
    expect((await respond(stranger, viewingId, 'cancel')).status).toBe(404);
  });

  it('validates the action', async () => {
    const { ownerAgent, viewingId } = await requested();
    expect((await respond(ownerAgent, viewingId, 'reschedule')).status).toBe(400);
  });
});

describe('GET /api/viewings', () => {
  it("lists the user's requests, or those on their listings", async () => {
    const { owner, listing, buyerAgent, ownerAgent } = await setup();
    const otherListing = await createListing(owner, { name: 'Second Listing Here' });
    await request(buyerAgent, listing, { startsAt: inDays(2).toISOString() });
    await request(buyerAgent, otherListing, { startsAt: inDays(6).toISOString() });

    const mine = await buyerAgent.get('/api/viewings');
    const onMyListings = await ownerAgent.get('/api/viewings?as=owner');

    expect(mine.body.map((v) => v.listing.name)).toEqual(['Second Listing Here', listing.name]);
    expect(onMyListings.body).toHaveLength(2);
    expect((await ownerAgent.get('/api/viewings')).body).toEqual([]);
  });
});

describe('deleting data', () => {
  it('removes viewings with the listing or either account', async () => {
    const { owner, buyer, listing, buyerAgent, ownerAgent } = await setup();
    const other = await createListing(owner);
    await request(buyerAgent, listing);
    await request(buyerAgent, other);

    await ownerAgent.delete(`/api/listing/delete/${listing._id}`).expect(200);
    expect(await Viewing.countDocuments()).toBe(1);

    await buyerAgent.delete(`/api/user/delete/${buyer._id}`).expect(200);
    expect(await Viewing.countDocuments()).toBe(0);
  });
});
