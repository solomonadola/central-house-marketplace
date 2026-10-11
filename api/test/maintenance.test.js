import { describe, expect, it } from 'vitest';
import { createListing, createUser, signedInAgent } from './helpers.js';
import Application from '../models/application.model.js';
import MaintenanceRequest from '../models/maintenanceRequest.model.js';
import Notification from '../models/notification.model.js';

// A complete application in the given status.
const apply = (listing, applicant, owner, status) =>
  Application.create({
    listing: listing._id,
    applicant: applicant._id,
    owner: owner._id,
    fullName: applicant.username,
    email: applicant.email,
    status,
  });

// An owner, a rental, and a tenant whose application was approved.
const setup = async () => {
  const owner = await createUser({ username: 'owner_user' });
  const tenant = await createUser({ username: 'tenant_user' });
  const listing = await createListing(owner, { name: 'Sunny Garden Apartment', type: 'rent' });
  await apply(listing, tenant, owner, 'approved');
  return {
    owner,
    tenant,
    listing,
    ownerAgent: await signedInAgent(owner),
    tenantAgent: await signedInAgent(tenant),
  };
};

const report = (agent, listing, overrides = {}) =>
  agent.post('/api/maintenance').send({
    listingId: listing._id.toString(),
    title: 'Kitchen tap is leaking',
    description: 'Drips constantly, even when fully closed.',
    category: 'plumbing',
    ...overrides,
  });

const update = (agent, id, body) => agent.post(`/api/maintenance/${id}/updates`).send(body);

describe('reporting problems', () => {
  it('lets tenants report a problem and notifies the owner', async () => {
    const { owner, listing, tenantAgent } = await setup();

    const res = await report(tenantAgent, listing, { urgency: 'urgent' });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      title: 'Kitchen tap is leaking',
      category: 'plumbing',
      urgency: 'urgent',
      status: 'open',
      tenant: { username: 'tenant_user' },
      listing: { name: 'Sunny Garden Apartment' },
    });
    expect(await Notification.findOne({ recipient: owner._id })).toMatchObject({
      type: 'maintenance_request',
      title: 'Urgent: tenant_user reported a problem',
      body: 'Kitchen tap is leaking',
      link: `/maintenance/${res.body._id}`,
    });
  });

  it('only accepts reports from approved tenants of rentals', async () => {
    const { owner, listing } = await setup();
    const stranger = await createUser();
    const pending = await createUser();
    await apply(listing, pending, owner, 'submitted');
    const forSale = await createListing(owner, { type: 'sale' });
    await apply(forSale, stranger, owner, 'approved');

    expect((await report(await signedInAgent(stranger), listing)).status).toBe(403);
    expect((await report(await signedInAgent(pending), listing)).status).toBe(403);
    expect((await report(await signedInAgent(stranger), forSale)).status).toBe(403);
  });

  it.each([
    ['a short title', { title: 'Tap' }, 'at least 5 characters'],
    ['an unknown category', { category: 'ghosts' }, 'Please choose a category'],
    ['an unknown urgency', { urgency: 'whenever' }, "Urgency must be 'low', 'normal' or 'urgent'"],
  ])('rejects %s', async (_, overrides, message) => {
    const { listing, tenantAgent } = await setup();

    const res = await report(tenantAgent, listing, overrides);

    expect(res.status).toBe(400);
    expect(res.body.message).toContain(message);
  });

  it('lists the rentals a tenant can report problems for', async () => {
    const { listing, tenantAgent } = await setup();

    const res = await tenantAgent.get('/api/maintenance/eligible');

    expect(res.body).toEqual([expect.objectContaining({ _id: listing._id.toString(), name: 'Sunny Garden Apartment' })]);
  });
});

describe('working on a request', () => {
  const reported = async () => {
    const ctx = await setup();
    const request = (await report(ctx.tenantAgent, ctx.listing)).body;
    return { ...ctx, request };
  };

  it('moves through in progress, resolved and closed with notes', async () => {
    const { tenant, owner, ownerAgent, tenantAgent, request } = await reported();

    const started = await update(ownerAgent, request._id, { status: 'in_progress', body: 'Plumber booked for Monday.' });
    expect(started.body.request.status).toBe('in_progress');
    expect(started.body.viewer).toEqual({ role: 'owner', allowedStatuses: ['resolved'] });

    const resolved = await update(ownerAgent, request._id, { status: 'resolved' });
    expect(resolved.body.request.resolvedAt).toBeTruthy();

    const closed = await update(tenantAgent, request._id, { status: 'closed', body: 'All good, thanks!' });
    expect(closed.body.request.status).toBe('closed');
    expect(closed.body.request.updates.map((u) => [u.author.username, u.status ?? null, u.body])).toEqual([
      ['owner_user', 'in_progress', 'Plumber booked for Monday.'],
      ['owner_user', 'resolved', ''],
      ['tenant_user', 'closed', 'All good, thanks!'],
    ]);

    const tenantNotes = await Notification.find({ recipient: tenant._id, type: 'maintenance_update' }).sort({ createdAt: 1 });
    expect(tenantNotes.map((n) => n.title)).toEqual([
      '"Kitchen tap is leaking" is now in progress',
      '"Kitchen tap is leaking" is now resolved',
    ]);
    expect(await Notification.countDocuments({ recipient: owner._id, type: 'maintenance_update' })).toBe(1);
  });

  it('lets the tenant reopen a resolved request', async () => {
    const { ownerAgent, tenantAgent, request } = await reported();
    await update(ownerAgent, request._id, { status: 'resolved' });

    const res = await update(tenantAgent, request._id, { status: 'open', body: 'Still dripping.' });

    expect(res.body.request).toMatchObject({ status: 'open', resolvedAt: null });
  });

  it('enforces who can change the status to what', async () => {
    const { ownerAgent, tenantAgent, request } = await reported();

    expect((await update(tenantAgent, request._id, { status: 'resolved' })).status).toBe(400);
    expect((await update(ownerAgent, request._id, { status: 'closed' })).status).toBe(400);
    await update(tenantAgent, request._id, { status: 'closed' });
    expect((await update(ownerAgent, request._id, { body: 'Anything else?' })).status).toBe(409);
  });

  it('accepts comments without a status change, but not empty updates', async () => {
    const { tenant, tenantAgent, ownerAgent, request } = await reported();

    const res = await update(ownerAgent, request._id, { body: 'Can I come by at 5?' });
    expect(res.status).toBe(200);
    expect(await Notification.findOne({ recipient: tenant._id, type: 'maintenance_update' })).toMatchObject({
      title: 'owner_user replied about "Kitchen tap is leaking"',
    });
    expect((await update(tenantAgent, request._id, {})).status).toBe(400);
  });

  it('keeps requests private to the tenant and owner', async () => {
    const { request } = await reported();
    const stranger = await signedInAgent(await createUser());

    expect((await stranger.get(`/api/maintenance/${request._id}`)).status).toBe(404);
    expect((await update(stranger, request._id, { body: 'Hello' })).status).toBe(404);
  });
});

describe('listing and summarizing requests', () => {
  it('lists requests for each side with status filters, and summarizes for owners', async () => {
    const { listing, tenantAgent, ownerAgent } = await setup();
    const a = (await report(tenantAgent, listing, { title: 'Broken boiler again', urgency: 'urgent', category: 'heating' })).body;
    await report(tenantAgent, listing, { title: 'Loose stair railing', category: 'structural' });
    await update(ownerAgent, a._id, { status: 'in_progress' });

    const tenantList = await tenantAgent.get('/api/maintenance');
    const ownerOpen = await ownerAgent.get('/api/maintenance?as=owner&status=open');
    const summary = await ownerAgent.get('/api/maintenance/summary');

    expect(tenantList.body).toHaveLength(2);
    expect(tenantList.body[0]).not.toHaveProperty('updates');
    expect(ownerOpen.body.map((r) => r.title)).toEqual(['Loose stair railing']);
    expect(ownerOpen.body[0].tenant.username).toBe('tenant_user');
    expect(summary.body).toEqual({ open: 1, in_progress: 1, resolved: 0, closed: 0, urgentOpen: 1 });
  });

  it('removes requests with the listing or either account', async () => {
    const { owner, listing, tenantAgent, ownerAgent } = await setup();
    const other = await createListing(owner, { type: 'rent' });
    const tenant2 = await createUser();
    await apply(other, tenant2, owner, 'approved');
    await report(tenantAgent, listing);
    await report(await signedInAgent(tenant2), other);

    await ownerAgent.delete(`/api/listing/delete/${listing._id}`).expect(200);
    expect(await MaintenanceRequest.countDocuments()).toBe(1);

    await ownerAgent.delete(`/api/user/delete/${owner._id}`).expect(200);
    expect(await MaintenanceRequest.countDocuments()).toBe(0);
  });
});
