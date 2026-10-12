import { describe, expect, it } from 'vitest';
import { api, createListing, createUser, signedInAgent } from './helpers.js';
import OpenHouse from '../models/openHouse.model.js';
import Notification from '../models/notification.model.js';

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;
const inHours = (h) => new Date(Date.now() + h * HOUR);

const setup = async (listingOverrides = {}) => {
  const owner = await createUser({ username: 'owner_user' });
  const listing = await createListing(owner, { name: 'Sunny Garden Apartment', ...listingOverrides });
  return { owner, listing, ownerAgent: await signedInAgent(owner) };
};

const schedule = (agent, listing, overrides = {}) =>
  agent.post(`/api/open-houses/listing/${listing._id}`).send({
    startsAt: inHours(48).toISOString(),
    endsAt: inHours(50).toISOString(),
    note: 'Ring the top bell',
    ...overrides,
  });

const visitor = async (username) => {
  const user = await createUser({ username });
  return { user, agent: await signedInAgent(user) };
};

describe('scheduling open houses', () => {
  it('lets the owner schedule one', async () => {
    const { listing, ownerAgent } = await setup();

    const res = await schedule(ownerAgent, listing, { capacity: 10 });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ note: 'Ring the top bell', capacity: 10, rsvpCount: 0, isFull: false });
    expect(res.body.viewer).toEqual({ isOwner: true, rsvped: false });
    expect(res.body.attendees).toEqual([]);
  });

  it.each([
    ['a start in the past', { startsAt: inHours(-1).toISOString() }, 'must start in the future'],
    ['an end before the start', { endsAt: inHours(47).toISOString() }, 'end time must be after the start'],
    ['more than 8 hours', { endsAt: inHours(57).toISOString() }, 'at most 8 hours'],
    ['more than 90 days ahead', { startsAt: inHours(91 * 24).toISOString(), endsAt: inHours(91 * 24 + 1).toISOString() }, 'up to 90 days ahead'],
    ['a negative capacity', { capacity: -1 }, 'cannot be negative'],
  ])('rejects %s', async (_, overrides, message) => {
    const { listing, ownerAgent } = await setup();

    const res = await schedule(ownerAgent, listing, overrides);

    expect(res.status).toBe(400);
    expect(res.body.message).toContain(message);
  });

  it('rejects overlapping open houses for the same listing', async () => {
    const { listing, ownerAgent } = await setup();
    await schedule(ownerAgent, listing).expect(201);

    const res = await schedule(ownerAgent, listing, { startsAt: inHours(49).toISOString(), endsAt: inHours(51).toISOString() });

    expect(res.status).toBe(409);
  });

  it('only lets the owner schedule, and only on public listings', async () => {
    const { owner, listing } = await setup();
    const { agent } = await visitor('someone');
    const paused = await createListing(owner, { active: false });

    expect((await schedule(agent, listing)).status).toBe(403);
    expect((await schedule(await signedInAgent(owner), paused)).status).toBe(400);
  });

  it('caps upcoming open houses per listing', async () => {
    const { listing, ownerAgent } = await setup();
    for (let i = 0; i < 10; i++) {
      await schedule(ownerAgent, listing, { startsAt: inHours(24 + i * 10).toISOString(), endsAt: inHours(25 + i * 10).toISOString() }).expect(201);
    }

    const res = await schedule(ownerAgent, listing, { startsAt: inHours(200).toISOString(), endsAt: inHours(201).toISOString() });

    expect(res.status).toBe(400);
  });
});

describe('RSVPs', () => {
  const scheduled = async (overrides = {}) => {
    const ctx = await setup();
    const openHouse = (await schedule(ctx.ownerAgent, ctx.listing, overrides)).body;
    return { ...ctx, openHouse };
  };

  it('lets visitors RSVP once and shows only the owner who is coming', async () => {
    const { listing, ownerAgent, openHouse } = await scheduled();
    const { agent } = await visitor('maria');

    const first = await agent.post(`/api/open-houses/${openHouse._id}/rsvp`);
    const again = await agent.post(`/api/open-houses/${openHouse._id}/rsvp`);

    expect(first.body).toMatchObject({ rsvpCount: 1, viewer: { rsvped: true, isOwner: false } });
    expect(first.body).not.toHaveProperty('attendees');
    expect(again.body.rsvpCount).toBe(1);

    const ownerView = await ownerAgent.get(`/api/open-houses/listing/${listing._id}`);
    expect(ownerView.body[0].attendees.map((a) => a.username)).toEqual(['maria']);
    expect(ownerView.body[0].attendees[0]).not.toHaveProperty('email');
    const publicView = await api().get(`/api/open-houses/listing/${listing._id}`);
    expect(publicView.body[0]).toMatchObject({ rsvpCount: 1, viewer: null });
    expect(publicView.body[0]).not.toHaveProperty('attendees');
  });

  it('enforces capacity, even for simultaneous RSVPs', async () => {
    const { openHouse } = await scheduled({ capacity: 2 });
    const agents = await Promise.all(['a_user', 'b_user', 'c_user', 'd_user'].map(async (n) => (await visitor(n)).agent));

    const results = await Promise.all(agents.map((agent) => agent.post(`/api/open-houses/${openHouse._id}/rsvp`)));

    expect(results.map((r) => r.status).sort()).toEqual([200, 200, 409, 409]);
    expect((await OpenHouse.findById(openHouse._id)).rsvps).toHaveLength(2);
  });

  it('lets visitors cancel their RSVP', async () => {
    const { openHouse } = await scheduled();
    const { agent } = await visitor('maria');
    await agent.post(`/api/open-houses/${openHouse._id}/rsvp`);

    const res = await agent.delete(`/api/open-houses/${openHouse._id}/rsvp`);

    expect(res.body).toMatchObject({ rsvpCount: 0, viewer: { rsvped: false } });
  });

  it("doesn't let owners RSVP to their own open house", async () => {
    const { ownerAgent, openHouse } = await scheduled();
    expect((await ownerAgent.post(`/api/open-houses/${openHouse._id}/rsvp`)).status).toBe(400);
  });

  it('lists the visitor’s upcoming RSVPs with the listing', async () => {
    const { openHouse } = await scheduled();
    const { agent } = await visitor('maria');
    await agent.post(`/api/open-houses/${openHouse._id}/rsvp`);

    const res = await agent.get('/api/open-houses/mine');

    expect(res.body).toHaveLength(1);
    expect(res.body[0].listing.name).toBe('Sunny Garden Apartment');
  });
});

describe('cancelling and listing open houses', () => {
  it('lets the owner cancel, telling everyone who RSVPed', async () => {
    const { listing, ownerAgent } = await setup();
    const openHouse = (await schedule(ownerAgent, listing)).body;
    const maria = await visitor('maria');
    const david = await visitor('david');
    await maria.agent.post(`/api/open-houses/${openHouse._id}/rsvp`);
    await david.agent.post(`/api/open-houses/${openHouse._id}/rsvp`);

    const res = await ownerAgent.post(`/api/open-houses/${openHouse._id}/cancel`);

    expect(res.status).toBe(200);
    const notifications = await Notification.find({ type: 'open_house_cancelled' });
    expect(notifications.map((n) => n.recipient.toString()).sort()).toEqual(
      [maria.user._id.toString(), david.user._id.toString()].sort()
    );
    expect(notifications[0].body).toMatch(/^"Sunny Garden Apartment" on .+ UTC$/);
    expect((await api().get(`/api/open-houses/listing/${listing._id}`)).body).toEqual([]);
    expect((await maria.agent.post(`/api/open-houses/${openHouse._id}/rsvp`)).status).toBe(404);
    expect((await ownerAgent.post(`/api/open-houses/${openHouse._id}/cancel`)).status).toBe(409);
  });

  it('only lets the owner cancel', async () => {
    const { listing, ownerAgent } = await setup();
    const openHouse = (await schedule(ownerAgent, listing)).body;
    const { agent } = await visitor('maria');

    expect((await agent.post(`/api/open-houses/${openHouse._id}/cancel`)).status).toBe(403);
  });

  it('lists upcoming open houses across public listings, soonest first', async () => {
    const { owner, listing, ownerAgent } = await setup();
    const later = await createListing(owner, { name: 'Quiet Loft Downtown' });
    const paused = await createListing(owner, { name: 'Paused Listing Here' });
    await schedule(ownerAgent, later, { startsAt: inHours(72).toISOString(), endsAt: inHours(73).toISOString() });
    await schedule(ownerAgent, listing);
    await OpenHouse.create({ listing: paused._id, owner: owner._id, startsAt: inHours(30), endsAt: inHours(31) });
    await Promise.all([later, paused].map((l) => l.updateOne({ active: l === paused ? false : true })));
    // Past events drop off.
    await OpenHouse.create({ listing: listing._id, owner: owner._id, startsAt: new Date(Date.now() - DAY), endsAt: new Date(Date.now() - DAY + HOUR) });

    const res = await api().get('/api/open-houses/upcoming');

    expect(res.body.map((o) => o.listing.name)).toEqual(['Sunny Garden Apartment', 'Quiet Loft Downtown']);
  });

  it('removes open houses and RSVPs when listings or accounts are deleted', async () => {
    const { listing, ownerAgent } = await setup();
    const openHouse = (await schedule(ownerAgent, listing)).body;
    const maria = await visitor('maria');
    await maria.agent.post(`/api/open-houses/${openHouse._id}/rsvp`);

    await maria.agent.delete(`/api/user/delete/${maria.user._id}`).expect(200);
    expect((await OpenHouse.findById(openHouse._id)).rsvps).toHaveLength(0);

    await ownerAgent.delete(`/api/listing/delete/${listing._id}`).expect(200);
    expect(await OpenHouse.countDocuments()).toBe(0);
  });
});
