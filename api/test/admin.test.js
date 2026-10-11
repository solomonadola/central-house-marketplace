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

describe('listing moderation', () => {
  it('hides a listing with a reason and resolves its open reports', async () => {
    const owner = await createUser({ username: 'listing_owner' });
    const listing = await createListing(owner, { name: 'Suspicious Listing Here' });
    const reporter = await createUser();
    await Report.create({ listing: listing._id, reporter: reporter._id, reason: 'scam' });
    const agent = await adminAgent();

    const res = await agent.post(`/api/admin/listings/${listing._id}/hide`).send({ reason: 'Fake photos' });

    expect(res.body).toMatchObject({ hidden: true, hiddenReason: 'Fake photos', hiddenBy: 'moderation' });
    expect(await Report.countDocuments({ status: 'open' })).toBe(0);
    expect((await api().get(`/api/listing/get/${listing._id}`)).status).toBe(404);

    const hidden = await agent.get('/api/admin/listings/hidden');
    expect(hidden.body).toHaveLength(1);
    expect(hidden.body[0]).toMatchObject({ name: 'Suspicious Listing Here', ownerUsername: 'listing_owner' });
  });

  it('requires a reason to hide', async () => {
    const listing = await createListing(await createUser());
    const res = await (await adminAgent()).post(`/api/admin/listings/${listing._id}/hide`).send({ reason: ' ' });
    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Please give a reason');
  });

  it('un-hides a listing', async () => {
    const listing = await createListing(await createUser(), { hidden: true, hiddenReason: 'x', hiddenBy: 'moderation' });
    const agent = await adminAgent();

    const res = await agent.post(`/api/admin/listings/${listing._id}/unhide`);

    expect(res.body).toMatchObject({ hidden: false, hiddenReason: '', hiddenBy: null });
    expect((await api().get(`/api/listing/get/${listing._id}`)).status).toBe(200);
  });

  it('returns 404 for a missing listing', async () => {
    const agent = await adminAgent();
    expect((await agent.post('/api/admin/listings/0123456789abcdef01234567/unhide')).status).toBe(404);
  });

  it('is not available to regular users', async () => {
    const listing = await createListing(await createUser());
    const user = await signedInAgent(await createUser());
    expect((await user.post(`/api/admin/listings/${listing._id}/hide`).send({ reason: 'x' })).status).toBe(403);
  });
});

describe('user moderation', () => {
  it('searches users by username or email with listing counts', async () => {
    const sarah = await createUser({ username: 'sarah_homes', email: 'sarah@example.com' });
    await createUser({ username: 'david', email: 'david@realty.example' });
    await createListing(sarah);
    await createListing(sarah);
    const agent = await adminAgent();

    const byName = await agent.get('/api/admin/users?search=SARAH');
    const byEmail = await agent.get('/api/admin/users?search=realty');

    expect(byName.body).toHaveLength(1);
    expect(byName.body[0]).toMatchObject({ username: 'sarah_homes', email: 'sarah@example.com', listingCount: 2 });
    expect(byName.body[0]).not.toHaveProperty('password');
    expect(byEmail.body.map((u) => u.username)).toEqual(['david']);
    expect((await agent.get('/api/admin/users?search=.*')).body).toHaveLength(0);
  });

  it('suspends a user, signing them out and hiding their listings', async () => {
    const user = await createUser();
    const userAgent = await signedInAgent(user);
    await createListing(user);
    const alreadyHidden = await createListing(user, { hidden: true, hiddenReason: 'Spam', hiddenBy: 'moderation' });
    const agent = await adminAgent();

    const res = await agent.post(`/api/admin/users/${user._id}/suspend`).send({ reason: 'Scamming buyers' });

    expect(res.body).toEqual({ suspended: true, listingsHidden: 1 });
    expect((await userAgent.get('/api/user/favorites')).body.code).toBe('ACCOUNT_SUSPENDED');
    expect((await api().get('/api/listing/get')).body).toHaveLength(0);

    const listed = await agent.get('/api/admin/users?suspended=true');
    expect(listed.body[0]).toMatchObject({ suspended: true, suspendedReason: 'Scamming buyers' });

    // Reinstating restores only what the suspension hid.
    const restored = await agent.post(`/api/admin/users/${user._id}/unsuspend`);
    expect(restored.body).toEqual({ suspended: false, listingsRestored: 1 });
    expect((await api().get('/api/listing/get')).body).toHaveLength(1);
    expect((await api().get(`/api/listing/get/${alreadyHidden._id}`)).status).toBe(404);
    // And they can sign in again (signedInAgent throws if sign-in fails).
    expect((await (await signedInAgent(user)).get('/api/user/favorites')).status).toBe(200);
  });

  it('does not suspend admins or yourself', async () => {
    const admin = await createUser({ role: 'admin' });
    const agent = await signedInAgent(admin);
    const otherAdmin = await createUser({ role: 'admin' });

    expect((await agent.post(`/api/admin/users/${admin._id}/suspend`).send({ reason: 'x' })).status).toBe(400);
    expect((await agent.post(`/api/admin/users/${otherAdmin._id}/suspend`).send({ reason: 'x' })).status).toBe(400);
  });

  it('requires a reason and an existing user', async () => {
    const user = await createUser();
    const agent = await adminAgent();

    expect((await agent.post(`/api/admin/users/${user._id}/suspend`).send({})).status).toBe(400);
    expect((await agent.post('/api/admin/users/0123456789abcdef01234567/suspend').send({ reason: 'x' })).status).toBe(404);
    expect((await agent.post('/api/admin/users/0123456789abcdef01234567/unsuspend')).status).toBe(404);
  });
});
