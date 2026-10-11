import { describe, expect, it } from 'vitest';
import { api, createListing, createUser, signedInAgent } from './helpers.js';
import User from '../models/user.model.js';
import Report from '../models/report.model.js';

const adminAgent = async () => signedInAgent(await createUser({ username: 'moderator', role: 'admin' }));

describe('admin access', () => {
  it('is limited to admins', async () => {
    const user = await signedInAgent(await createUser());

    expect((await api().get('/api/admin/stats')).status).toBe(401);
    expect((await user.get('/api/admin/stats')).status).toBe(403);
    expect((await (await adminAgent()).get('/api/admin/stats')).status).toBe(200);
  });

  it('is revoked as soon as the role is removed', async () => {
    const admin = await createUser({ role: 'admin' });
    const agent = await signedInAgent(admin);
    await User.updateOne({ _id: admin._id }, { role: 'user' });

    expect((await agent.get('/api/admin/stats')).status).toBe(403);
  });
});

describe('GET /api/admin/stats', () => {
  it('summarizes the site', async () => {
    const owner = await createUser();
    await createUser({ suspended: true });
    const listing = await createListing(owner);
    await createListing(owner, { hidden: true });
    await createListing(owner, { createdAt: new Date('2020-01-01') });
    await Report.create({ listing: listing._id, reporter: owner._id, reason: 'scam' });
    const agent = await adminAgent();

    const res = await agent.get('/api/admin/stats');

    expect(res.body).toEqual({
      users: { total: 3, newThisWeek: 3, suspended: 1 },
      listings: { total: 3, newThisWeek: 2, hidden: 1 },
      reports: { open: 1 },
      reviews: { total: 0 },
      messages: { conversations: 0, total: 0 },
    });
  });
});

describe('reports queue', () => {
  const setup = async () => {
    const owner = await createUser();
    const reporter = await createUser({ username: 'reporter_one' });
    const other = await createUser({ username: 'reporter_two' });
    const listing = await createListing(owner, { name: 'Suspicious Listing Here' });
    const quiet = await createListing(owner, { name: 'Another Listing Here' });
    const first = await Report.create({ listing: listing._id, reporter: reporter._id, reason: 'scam', details: 'Gift cards' });
    await Report.create({ listing: listing._id, reporter: other._id, reason: 'inaccurate' });
    await Report.create({ listing: quiet._id, reporter: reporter._id, reason: 'other', status: 'dismissed' });
    return { first, agent: await adminAgent() };
  };

  it('lists open reports oldest first with the listing, reporter and report count', async () => {
    const { agent } = await setup();

    const res = await agent.get('/api/admin/reports');

    expect(res.body).toHaveLength(2);
    expect(res.body[0]).toMatchObject({
      reason: 'scam',
      details: 'Gift cards',
      reporter: { username: 'reporter_one' },
      listing: { name: 'Suspicious Listing Here', hidden: false },
      openReportsForListing: 2,
    });
    expect(res.body[0].reporter).not.toHaveProperty('email');
  });

  it('filters by status', async () => {
    const { agent } = await setup();

    expect((await agent.get('/api/admin/reports?status=dismissed')).body).toHaveLength(1);
    expect((await agent.get('/api/admin/reports?status=all')).body).toHaveLength(3);
    expect((await agent.get('/api/admin/reports?status=bogus')).body).toHaveLength(2);
  });

  it('resolves or dismisses a report', async () => {
    const { first, agent } = await setup();

    const res = await agent.patch(`/api/admin/reports/${first._id}`).send({ status: 'dismissed' });

    expect(res.status).toBe(200);
    expect((await Report.findById(first._id)).status).toBe('dismissed');
    expect((await agent.get('/api/admin/reports')).body).toHaveLength(1);
  });

  it('validates the status', async () => {
    const { first, agent } = await setup();
    expect((await agent.patch(`/api/admin/reports/${first._id}`).send({ status: 'deleted' })).status).toBe(400);
  });

  it('returns 404 for a missing report', async () => {
    const agent = await adminAgent();
    const res = await agent.patch('/api/admin/reports/0123456789abcdef01234567').send({ status: 'resolved' });
    expect(res.status).toBe(404);
  });
});
