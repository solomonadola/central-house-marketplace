import { describe, expect, it } from 'vitest';
import { api, createListing, createUser, signedInAgent } from './helpers.js';
import AvailabilitySlot from '../models/availabilitySlot.model.js';
import Viewing from '../models/viewing.model.js';

const DAY = 24 * 60 * 60 * 1000;
const HOUR = 60 * 60 * 1000;
// A whole-hour start so slot and request times match exactly.
const at = (days, hour = 10) =>
  new Date(Math.ceil((Date.now() + days * DAY) / HOUR) * HOUR + hour * HOUR);

const setup = async () => {
  const owner = await createUser();
  const listing = await createListing(owner);
  return { owner, listing, ownerAgent: await signedInAgent(owner) };
};

const addSlots = (agent, listing, slots) =>
  agent.post(`/api/availability/${listing._id}`).send({ slots });

describe('POST /api/availability/:listingId', () => {
  it('requires the owner to be signed in', async () => {
    const { listing } = await setup();
    expect((await addSlots(api(), listing, [])).status).toBe(401);
  });

  it("won't let a non-owner open slots", async () => {
    const { listing } = await setup();
    const agent = await signedInAgent(await createUser());
    const res = await addSlots(agent, listing, [{ startsAt: at(2).toISOString(), endsAt: at(2, 1).toISOString() }]);
    expect(res.status).toBe(401);
  });

  it('creates open slots for the owner', async () => {
    const { listing, ownerAgent } = await setup();
    const start = at(2);

    const res = await addSlots(ownerAgent, listing, [
      { startsAt: start.toISOString(), endsAt: new Date(start.getTime() + HOUR).toISOString() },
    ]);

    expect(res.status).toBe(201);
    expect(res.body).toHaveLength(1);
    expect(res.body[0]).toMatchObject({ status: 'open' });
    expect(await AvailabilitySlot.countDocuments()).toBe(1);
  });

  it.each([
    ['a past slot', () => ({ startsAt: new Date(Date.now() - HOUR).toISOString(), endsAt: new Date(Date.now()).toISOString() }), 'future'],
    ['an end before the start', () => ({ startsAt: at(2).toISOString(), endsAt: at(2).toISOString() }), 'end after it starts'],
  ])('rejects %s', async (_, makeSlot, message) => {
    const { listing, ownerAgent } = await setup();
    const res = await addSlots(ownerAgent, listing, [makeSlot()]);
    expect(res.status).toBe(400);
    expect(res.body.message).toContain(message);
  });

  it('rejects a slot that overlaps an existing one', async () => {
    const { listing, ownerAgent } = await setup();
    const start = at(2);
    await addSlots(ownerAgent, listing, [
      { startsAt: start.toISOString(), endsAt: new Date(start.getTime() + 2 * HOUR).toISOString() },
    ]);

    const res = await addSlots(ownerAgent, listing, [
      { startsAt: new Date(start.getTime() + HOUR).toISOString(), endsAt: new Date(start.getTime() + 3 * HOUR).toISOString() },
    ]);

    expect(res.status).toBe(409);
    expect(res.body.message).toMatch(/overlaps/);
    expect(await AvailabilitySlot.countDocuments()).toBe(1);
  });

  it('rejects a slot that overlaps an existing viewing request', async () => {
    const { owner, listing, ownerAgent } = await setup();
    const buyerAgent = await signedInAgent(await createUser());
    const start = at(2);
    await buyerAgent
      .post('/api/viewings')
      .send({ listingId: listing._id.toString(), startsAt: start.toISOString() });

    const res = await addSlots(ownerAgent, listing, [
      { startsAt: new Date(start.getTime() + 30 * 60_000).toISOString(), endsAt: new Date(start.getTime() + HOUR).toISOString() },
    ]);

    expect(res.status).toBe(409);
  });

  it('validates the payload', async () => {
    const { listing, ownerAgent } = await setup();
    expect((await ownerAgent.post(`/api/availability/${listing._id}`).send({ slots: [] })).status).toBe(400);
    const bad = await addSlots(ownerAgent, listing, [{ startsAt: 'nonsense', endsAt: at(2).toISOString() }]);
    expect(bad.status).toBe(400);
  });

  it('returns 400 for a malformed listing id', async () => {
    const { ownerAgent } = await setup();
    expect((await addSlots(ownerAgent, { _id: 'abc' }, [])).status).toBe(400);
  });
});

describe('GET /api/availability/:listingId', () => {
  it('shows open future slots to guests', async () => {
    const { listing, ownerAgent } = await setup();
    const start = at(2);
    await addSlots(ownerAgent, listing, [
      { startsAt: start.toISOString(), endsAt: new Date(start.getTime() + HOUR).toISOString() },
    ]);

    const res = await api().get(`/api/availability/${listing._id}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
  });

  it('hides booked slots from guests but shows them to the owner', async () => {
    const { owner, listing, ownerAgent } = await setup();
    const start = at(2);
    const created = await addSlots(ownerAgent, listing, [
      { startsAt: start.toISOString(), endsAt: new Date(start.getTime() + HOUR).toISOString() },
    ]);
    await AvailabilitySlot.updateOne({ _id: created.body[0]._id }, { status: 'booked' });

    expect((await api().get(`/api/availability/${listing._id}`)).body).toHaveLength(0);
    expect((await ownerAgent.get(`/api/availability/${listing._id}`)).body).toHaveLength(1);
  });

  it('returns 404 for a missing listing', async () => {
    expect((await api().get('/api/availability/0123456789abcdef01234567')).status).toBe(404);
  });
});

describe('deleting slots', () => {
  it('lets the owner remove an open slot', async () => {
    const { listing, ownerAgent } = await setup();
    const start = at(2);
    const created = await addSlots(ownerAgent, listing, [
      { startsAt: start.toISOString(), endsAt: new Date(start.getTime() + HOUR).toISOString() },
    ]);

    const res = await ownerAgent.delete(`/api/availability/slot/${created.body[0]._id}`);

    expect(res.status).toBe(200);
    expect(await AvailabilitySlot.countDocuments()).toBe(0);
  });

  it('refuses to remove a booked slot', async () => {
    const { listing, ownerAgent } = await setup();
    const start = at(2);
    const created = await addSlots(ownerAgent, listing, [
      { startsAt: start.toISOString(), endsAt: new Date(start.getTime() + HOUR).toISOString() },
    ]);
    await AvailabilitySlot.updateOne({ _id: created.body[0]._id }, { status: 'booked' });

    expect((await ownerAgent.delete(`/api/availability/slot/${created.body[0]._id}`)).status).toBe(409);
  });

  it("won't let a non-owner remove a slot", async () => {
    const { listing, ownerAgent } = await setup();
    const start = at(2);
    const created = await addSlots(ownerAgent, listing, [
      { startsAt: start.toISOString(), endsAt: new Date(start.getTime() + HOUR).toISOString() },
    ]);
    const stranger = await signedInAgent(await createUser());

    expect((await stranger.delete(`/api/availability/slot/${created.body[0]._id}`)).status).toBe(401);
  });

  it('clears all open slots for a listing', async () => {
    const { listing, ownerAgent } = await setup();
    await addSlots(ownerAgent, listing, [
      { startsAt: at(2).toISOString(), endsAt: new Date(at(2).getTime() + HOUR).toISOString() },
      { startsAt: at(3).toISOString(), endsAt: new Date(at(3).getTime() + HOUR).toISOString() },
    ]);

    const res = await ownerAgent.delete(`/api/availability/${listing._id}`);

    expect(res.body.deleted).toBe(2);
  });
});

describe('viewing requests against availability', () => {
  const withSlot = async () => {
    const { owner, listing, ownerAgent } = await setup();
    const buyer = await createUser();
    const buyerAgent = await signedInAgent(buyer);
    const start = at(2);
    const created = await addSlots(ownerAgent, listing, [
      { startsAt: start.toISOString(), endsAt: new Date(start.getTime() + HOUR).toISOString() },
    ]);
    return { owner, buyer, listing, ownerAgent, buyerAgent, start, slotId: created.body[0]._id };
  };

  const request = (agent, listing, startsAt) =>
    agent.post('/api/viewings').send({ listingId: listing._id.toString(), startsAt: startsAt.toISOString() });

  it('only accepts requests that match an open slot', async () => {
    const { listing, buyerAgent, start } = await withSlot();

    expect((await request(buyerAgent, listing, new Date(start.getTime() + 20 * 60_000))).status).toBe(409);
    expect((await request(buyerAgent, listing, start)).status).toBe(201);
  });

  it('books the slot, then frees it when the owner declines', async () => {
    const { listing, buyerAgent, ownerAgent, start, slotId } = await withSlot();

    const created = await request(buyerAgent, listing, start);
    expect(created.status).toBe(201);
    expect((await AvailabilitySlot.findById(slotId)).status).toBe('booked');

    await ownerAgent.patch(`/api/viewings/${created.body._id}`).send({ action: 'decline' });

    const slot = await AvailabilitySlot.findById(slotId);
    expect(slot.status).toBe('open');
    expect(slot.viewing).toBeNull();
  });

  it('rejects a request that overlaps another viewing', async () => {
    const { listing, buyerAgent, start } = await withSlot();
    await request(buyerAgent, listing, start).expect(201);

    const otherAgent = await signedInAgent(await createUser());
    // Half an hour later, still inside the first 60-minute block (and not a slot).
    const res = await request(otherAgent, listing, new Date(start.getTime() + 30 * 60_000));

    expect(res.status).toBe(409);
    expect(await Viewing.countDocuments({ listing: listing._id })).toBe(1);
  });
});
