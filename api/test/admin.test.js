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
