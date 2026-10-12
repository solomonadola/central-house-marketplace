import { describe, expect, it } from 'vitest';
import { api, createListing, createUser, signedInAgent } from './helpers.js';
import Application from '../models/application.model.js';
import Inspection from '../models/inspection.model.js';
import Lease from '../models/lease.model.js';
import Notification from '../models/notification.model.js';
import { DEFAULT_ROOMS } from '../utils/inspections.js';
import { removeLeases } from '../utils/leases.js';

// An owner and tenant with an active lease.
const setup = async () => {
  const owner = await createUser({ username: 'owner_olga' });
  const tenant = await createUser({ username: 'tenant_tim' });
  const listing = await createListing(owner, { name: 'Harbour Loft', type: 'rent' });
  const application = await Application.create({
    listing: listing._id,
    applicant: tenant._id,
    owner: owner._id,
    fullName: 'Tim Tenant',
    email: tenant.email,
    status: 'approved',
  });
  const lease = await Lease.create({
    listing: listing._id,
    owner: owner._id,
    tenant: tenant._id,
    application: application._id,
    monthlyRent: 1000,
    dueDay: 1,
    startDate: new Date(),
  });
  return { owner, tenant, lease, ownerAgent: await signedInAgent(owner), tenantAgent: await signedInAgent(tenant) };
};

const create = (agent, lease, kind = 'move_in') => agent.post('/api/inspections').send({ leaseId: lease._id.toString(), kind });

const rooms = (conditions) =>
  Object.entries(conditions).map(([name, items]) => ({
    name,
    items: Object.entries(items).map(([item, condition]) => ({ name: item, condition })),
  }));

// A move-in report the tenant has signed.
const signedMoveIn = async (ctx, roomConditions) => {
  const { body } = await create(ctx.ownerAgent, ctx.lease);
  const id = body.inspection._id;
  await ctx.ownerAgent.patch(`/api/inspections/${id}`).send({ rooms: rooms(roomConditions) });
  await ctx.ownerAgent.post(`/api/inspections/${id}/submit`);
  await ctx.tenantAgent.post(`/api/inspections/${id}/sign`);
  return id;
};

describe('creating reports', () => {
  it('starts a move-in report from the default rooms', async () => {
    const { ownerAgent, lease } = await setup();

    const res = await create(ownerAgent, lease);

    expect(res.status).toBe(201);
    expect(res.body.inspection).toMatchObject({ kind: 'move_in', status: 'draft', listing: { name: 'Harbour Loft' } });
    expect(res.body.inspection.rooms.map((r) => r.name)).toEqual(DEFAULT_ROOMS.map((r) => r.name));
    expect(res.body.viewer).toEqual({ role: 'owner' });
    expect(res.body.comparison).toBeNull();
  });

  it('starts a move-out report from the move-in rooms, unrated', async () => {
    const ctx = await setup();
    await signedMoveIn(ctx, { Studio: { Floor: 'fair', Window: 'good' } });

    const res = await create(ctx.ownerAgent, ctx.lease, 'move_out');

    expect(res.body.inspection.rooms).toEqual([
      {
        name: 'Studio',
        items: [
          { name: 'Floor', condition: 'good', note: '' },
          { name: 'Window', condition: 'good', note: '' },
        ],
      },
    ]);
  });

  it('allows one report of each kind per lease', async () => {
    const { ownerAgent, lease } = await setup();
    await create(ownerAgent, lease);

    const res = await create(ownerAgent, lease);

    expect(res.status).toBe(409);
    expect(res.body.message).toBe('This lease already has a move-in report.');
  });

  it('only lets the owner create reports', async () => {
    const { tenantAgent, lease } = await setup();

    expect((await create(tenantAgent, lease)).status).toBe(404);
    expect((await create(tenantAgent, lease, 'checkout')).status).toBe(400);
  });
});

describe('editing and sending', () => {
  it('saves rooms and a summary while it is a draft', async () => {
    const { ownerAgent, lease } = await setup();
    const { body } = await create(ownerAgent, lease);

    const res = await ownerAgent.patch(`/api/inspections/${body.inspection._id}`).send({
      rooms: [{ name: 'Kitchen', items: [{ name: 'Oven', condition: 'poor', note: 'Door hinge loose' }] }],
      summary: 'Two sets of keys handed over. Meter: 10432.',
    });

    expect(res.status).toBe(200);
    expect(res.body.inspection.rooms).toEqual([
      { name: 'Kitchen', items: [{ name: 'Oven', condition: 'poor', note: 'Door hinge loose' }] },
    ]);
    expect(res.body.inspection.summary).toBe('Two sets of keys handed over. Meter: 10432.');
  });

  it.each([
    ['an unknown condition', { rooms: [{ name: 'Kitchen', items: [{ name: 'Oven', condition: 'awful' }] }] }, 'Choose a condition'],
    ['a nameless room', { rooms: [{ name: ' ', items: [] }] }, 'Every room needs a name'],
    ['an empty update', {}, 'Nothing to update'],
  ])('rejects %s', async (_, update, message) => {
    const { ownerAgent, lease } = await setup();
    const { body } = await create(ownerAgent, lease);

    const res = await ownerAgent.patch(`/api/inspections/${body.inspection._id}`).send(update);

    expect(res.status).toBe(400);
    expect(res.body.message).toContain(message);
  });

  it('keeps drafts hidden from the tenant until they are sent', async () => {
    const { tenant, ownerAgent, tenantAgent, lease } = await setup();
    const { body } = await create(ownerAgent, lease);
    const id = body.inspection._id;

    expect((await tenantAgent.get(`/api/inspections/${id}`)).status).toBe(404);
    expect((await tenantAgent.get(`/api/inspections?leaseId=${lease._id}`)).body).toEqual([]);

    const sent = await ownerAgent.post(`/api/inspections/${id}/submit`);

    expect(sent.body.inspection.status).toBe('submitted');
    expect((await tenantAgent.get(`/api/inspections/${id}`)).status).toBe(200);
    expect((await tenantAgent.get(`/api/inspections?leaseId=${lease._id}`)).body).toHaveLength(1);
    expect(await Notification.findOne({ recipient: tenant._id })).toMatchObject({
      type: 'inspection_submitted',
      title: 'owner_olga sent you the move-in report',
      link: `/inspections/${id}`,
    });
  });

  it("won't send an empty report", async () => {
    const { ownerAgent, lease } = await setup();
    const { body } = await create(ownerAgent, lease);
    await ownerAgent.patch(`/api/inspections/${body.inspection._id}`).send({ rooms: [{ name: 'Kitchen', items: [] }] });

    const res = await ownerAgent.post(`/api/inspections/${body.inspection._id}/submit`);

    expect(res.status).toBe(400);
  });

  it('locks a report once it is sent', async () => {
    const { ownerAgent, lease } = await setup();
    const { body } = await create(ownerAgent, lease);
    await ownerAgent.post(`/api/inspections/${body.inspection._id}/submit`);

    const res = await ownerAgent.patch(`/api/inspections/${body.inspection._id}`).send({ summary: 'Changed my mind' });

    expect(res.status).toBe(409);
  });

  it('lets the owner delete a draft but not a sent report', async () => {
    const { ownerAgent, lease } = await setup();
    const draft = (await create(ownerAgent, lease)).body.inspection._id;
    expect((await ownerAgent.delete(`/api/inspections/${draft}`)).body).toEqual({ deleted: true });
    expect(await Inspection.findById(draft)).toBeNull();

    const sent = (await create(ownerAgent, lease)).body.inspection._id;
    await ownerAgent.post(`/api/inspections/${sent}/submit`);
    expect((await ownerAgent.delete(`/api/inspections/${sent}`)).status).toBe(409);
  });
});

describe('signing and disputing', () => {
  const sent = async () => {
    const ctx = await setup();
    const id = (await create(ctx.ownerAgent, ctx.lease)).body.inspection._id;
    await ctx.ownerAgent.post(`/api/inspections/${id}/submit`);
    return { ...ctx, id };
  };

  it('lets the tenant sign and tells the owner', async () => {
    const { owner, tenantAgent, id } = await sent();

    const res = await tenantAgent.post(`/api/inspections/${id}/sign`);

    expect(res.body.inspection.status).toBe('signed');
    expect(res.body.inspection.signedAt).toBeTruthy();
    expect(await Notification.findOne({ recipient: owner._id })).toMatchObject({
      type: 'inspection_signed',
      title: 'tenant_tim signed the move-in report',
    });
    expect((await tenantAgent.post(`/api/inspections/${id}/sign`)).status).toBe(409);
  });

  it('lets the tenant dispute, the owner revise and send it again', async () => {
    const { owner, ownerAgent, tenantAgent, id } = await sent();

    const disputed = await tenantAgent
      .post(`/api/inspections/${id}/dispute`)
      .send({ reason: 'The bathroom tiles were already cracked when I moved in.' });
    expect(disputed.body.inspection).toMatchObject({
      status: 'disputed',
      dispute: 'The bathroom tiles were already cracked when I moved in.',
    });
    expect(await Notification.findOne({ recipient: owner._id })).toMatchObject({ type: 'inspection_disputed' });

    expect((await ownerAgent.patch(`/api/inspections/${id}`).send({ summary: 'Tiles noted as cracked.' })).status).toBe(200);
    const resent = await ownerAgent.post(`/api/inspections/${id}/submit`);
    expect(resent.body.inspection).toMatchObject({ status: 'submitted', dispute: '' });
  });

  it('requires a reason to dispute', async () => {
    const { tenantAgent, id } = await sent();

    const res = await tenantAgent.post(`/api/inspections/${id}/dispute`).send({ reason: 'No' });

    expect(res.status).toBe(400);
    expect(res.body.message).toContain('at least 10 characters');
  });

  it('only lets the tenant sign', async () => {
    const { ownerAgent, id } = await sent();
    const stranger = await signedInAgent(await createUser());

    expect((await ownerAgent.post(`/api/inspections/${id}/sign`)).status).toBe(404);
    expect((await stranger.post(`/api/inspections/${id}/sign`)).status).toBe(404);
    expect((await api().post(`/api/inspections/${id}/sign`)).status).toBe(401);
  });
});

describe('move-out comparison', () => {
  it('shows what changed since move-in', async () => {
    const ctx = await setup();
    await signedMoveIn(ctx, { Kitchen: { Floor: 'good', Oven: 'fair' }, Bathroom: { Mirror: 'good' } });
    const moveOut = (await create(ctx.ownerAgent, ctx.lease, 'move_out')).body.inspection._id;

    const res = await ctx.ownerAgent.patch(`/api/inspections/${moveOut}`).send({
      rooms: rooms({ Kitchen: { Floor: 'damaged', Oven: 'fair' }, Bathroom: { Mirror: 'good' }, Garden: { Fence: 'poor' } }),
    });

    expect(res.body.comparison.totals).toEqual({ worse: 1, better: 0, same: 2, new: 1, unrated: 0 });
    expect(res.body.comparison.rows[0]).toMatchObject({ room: 'Kitchen', item: 'Floor', before: 'good', after: 'damaged', change: 'worse' });
  });

  it("doesn't compare with a move-in draft the tenant never saw", async () => {
    const ctx = await setup();
    await create(ctx.ownerAgent, ctx.lease);
    const moveOut = (await create(ctx.ownerAgent, ctx.lease, 'move_out')).body.inspection._id;
    await ctx.ownerAgent.post(`/api/inspections/${moveOut}/submit`);

    const res = await ctx.tenantAgent.get(`/api/inspections/${moveOut}`);

    expect(res.body.comparison).toBeNull();
  });
});

describe('listing reports', () => {
  it('needs a lease the caller is part of', async () => {
    const { lease } = await setup();
    const stranger = await signedInAgent(await createUser());

    expect((await stranger.get(`/api/inspections?leaseId=${lease._id}`)).status).toBe(404);
    expect((await stranger.get('/api/inspections?leaseId=not-an-id')).status).toBe(404);
  });

  it('are removed with the lease', async () => {
    const { ownerAgent, lease } = await setup();
    await create(ownerAgent, lease);

    await removeLeases({ _id: lease._id });

    expect(await Inspection.countDocuments({ lease: lease._id })).toBe(0);
  });
});
