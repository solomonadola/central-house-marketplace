import { describe, expect, it } from 'vitest';
import { api, createListing, createUser, signedInAgent } from './helpers.js';
import AuditLog from '../models/auditLog.model.js';

const adminAgent = async () => {
  const admin = await createUser({ role: 'admin' });
  return { admin, agent: await signedInAgent(admin) };
};

describe('GET /api/admin/audit', () => {
  it('requires an admin', async () => {
    expect((await api().get('/api/admin/audit')).status).toBe(401);
    const userAgent = await signedInAgent(await createUser());
    expect((await userAgent.get('/api/admin/audit')).status).toBe(403);
  });

  it('starts empty', async () => {
    const { agent } = await adminAgent();
    const res = await agent.get('/api/admin/audit');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });
});

describe('admin actions are audited', () => {
  it('records hiding a listing, with the actor, target and reason', async () => {
    const { admin, agent } = await adminAgent();
    const owner = await createUser();
    const listing = await createListing(owner);

    await agent.post(`/api/admin/listings/${listing._id}/hide`).send({ reason: 'Scam ad' });

    const entry = await AuditLog.findOne({ action: 'hide_listing' });
    expect(entry).toMatchObject({
      targetType: 'listing',
      targetLabel: listing.name,
      reason: 'Scam ad',
    });
    expect(entry.actor.toString()).toBe(admin._id.toString());
    expect(entry.targetId.toString()).toBe(listing._id.toString());
  });

  it('records restoring a listing', async () => {
    const { agent } = await adminAgent();
    const listing = await createListing(await createUser(), { hidden: true, hiddenBy: 'moderation' });

    await agent.post(`/api/admin/listings/${listing._id}/unhide`);

    expect(await AuditLog.countDocuments({ action: 'unhide_listing' })).toBe(1);
  });

  it('records suspending and unsuspending a user', async () => {
    const { agent } = await adminAgent();
    const target = await createUser();

    await agent.post(`/api/admin/users/${target._id}/suspend`).send({ reason: 'Spam' });
    await agent.post(`/api/admin/users/${target._id}/unsuspend`);

    const suspend = await AuditLog.findOne({ action: 'suspend_user' });
    expect(suspend).toMatchObject({ targetType: 'user', targetLabel: target.username, reason: 'Spam' });
    expect(await AuditLog.countDocuments({ action: 'unsuspend_user' })).toBe(1);
  });

  it('records the report status changes', async () => {
    const { agent } = await adminAgent();
    const reporter = await createUser();
    const listing = await createListing(await createUser());
    const reportRes = await (await signedInAgent(reporter))
      .post('/api/reports')
      .send({ listingId: listing._id.toString(), reason: 'scam' });

    await agent.patch(`/api/admin/reports/${reportRes.body._id}`).send({ status: 'resolved' });

    const entry = await AuditLog.findOne({ targetType: 'report' });
    expect(entry.action).toBe('resolve_report');
    expect(entry.meta).toMatchObject({ status: 'resolved' });
  });

  it('filters by action and target type', async () => {
    const { agent } = await adminAgent();
    const target = await createUser();
    await agent.post(`/api/admin/users/${target._id}/suspend`).send({ reason: 'Spam' });
    const listing = await createListing(await createUser());
    await agent.post(`/api/admin/listings/${listing._id}/hide`).send({ reason: 'Bad' });

    const users = await agent.get('/api/admin/audit?targetType=user');
    expect(users.body).toHaveLength(1);
    expect(users.body[0].action).toBe('suspend_user');

    const hides = await agent.get('/api/admin/audit?action=hide_listing');
    expect(hides.body).toHaveLength(1);
  });

  it('summarises counts by action', async () => {
    const { agent } = await adminAgent();
    const target = await createUser();
    await agent.post(`/api/admin/users/${target._id}/suspend`).send({ reason: 'Spam' });
    await agent.post(`/api/admin/users/${target._id}/unsuspend`);

    const res = await agent.get('/api/admin/audit/summary');

    expect(res.body.total).toBe(2);
    expect(res.body.byAction).toMatchObject({ suspend_user: 1, unsuspend_user: 1 });
  });
});
