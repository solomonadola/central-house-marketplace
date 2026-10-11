import { describe, expect, it } from 'vitest';
import { api, createListing, createUser, signedInAgent } from './helpers.js';
import Report from '../models/report.model.js';

const setup = async () => {
  const owner = await createUser();
  const listing = await createListing(owner);
  const reporter = await createUser();
  return { owner, listing, reporter, agent: await signedInAgent(reporter) };
};

const report = (agent, body) => agent.post('/api/reports').send(body);

describe('POST /api/reports', () => {
  it('records a report', async () => {
    const { listing, reporter, agent } = await setup();

    const res = await report(agent, {
      listingId: listing._id.toString(),
      reason: 'scam',
      details: '  Asked me to pay a deposit by gift card.  ',
    });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      reason: 'scam',
      details: 'Asked me to pay a deposit by gift card.',
      status: 'open',
      reporter: reporter._id.toString(),
    });
  });

  it('allows only one open report per user and listing', async () => {
    const { listing, agent } = await setup();
    const body = { listingId: listing._id.toString(), reason: 'inaccurate' };

    await report(agent, body).expect(201);
    const second = await report(agent, { ...body, reason: 'scam' });

    expect(second.status).toBe(409);
    expect(await Report.countDocuments()).toBe(1);
  });

  it('allows a new report once the previous one is closed', async () => {
    const { listing, agent } = await setup();
    const body = { listingId: listing._id.toString(), reason: 'inaccurate' };
    await report(agent, body);
    await Report.updateMany({}, { status: 'resolved' });

    expect((await report(agent, body)).status).toBe(201);
  });

  it('lets different users report the same listing', async () => {
    const { listing, agent } = await setup();
    const other = await signedInAgent(await createUser());
    const body = { listingId: listing._id.toString(), reason: 'unavailable' };

    await report(agent, body).expect(201);
    await report(other, body).expect(201);
  });

  it("does not let owners report their own listing", async () => {
    const { owner, listing } = await setup();
    const res = await report(await signedInAgent(owner), { listingId: listing._id.toString(), reason: 'other' });
    expect(res.status).toBe(400);
  });

  it.each([
    ['an unknown reason', { reason: 'boring' }, 'Please choose a reason'],
    ['a missing reason', { reason: undefined }, 'Please choose a reason'],
    ['long details', { reason: 'other', details: 'x'.repeat(1001) }, 'at most 1000 characters'],
  ])('rejects %s', async (_, override, message) => {
    const { listing, agent } = await setup();

    const res = await report(agent, { listingId: listing._id.toString(), ...override });

    expect(res.status).toBe(400);
    expect(res.body.message).toContain(message);
  });

  it('returns 404 for a missing listing', async () => {
    const { agent } = await setup();
    const res = await report(agent, { listingId: '0123456789abcdef01234567', reason: 'scam' });
    expect(res.status).toBe(404);
  });

  it('requires sign-in', async () => {
    expect((await api().post('/api/reports').send({})).status).toBe(401);
  });

  it("removes a deleted user's reports", async () => {
    const { listing, reporter, agent } = await setup();
    await report(agent, { listingId: listing._id.toString(), reason: 'scam' });

    await agent.delete(`/api/user/delete/${reporter._id}`).expect(200);

    expect(await Report.countDocuments()).toBe(0);
  });
});
