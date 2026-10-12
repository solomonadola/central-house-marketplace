import { describe, expect, it } from 'vitest';
import { api, createListing, createUser, signedInAgent } from './helpers.js';
import Application from '../models/application.model.js';
import Lease from '../models/lease.model.js';
import RentCharge from '../models/rentCharge.model.js';
import Notification from '../models/notification.model.js';
import { syncCharges } from '../controllers/lease.controller.js';

const apply = (listing, applicant, owner, status = 'approved') =>
  Application.create({
    listing: listing._id,
    applicant: applicant._id,
    owner: owner._id,
    fullName: applicant.username,
    email: applicant.email,
    status,
  });

// Months ago from now, on the given day, as a 'YYYY-MM-DD' string.
const monthsAgo = (months, dayOfMonth = 1) => {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - months, dayOfMonth)).toISOString().slice(0, 10);
};

const setup = async ({ names = true } = {}) => {
  const owner = await createUser(names ? { username: 'landlord_lee' } : {});
  const tenant = await createUser(names ? { username: 'tenant_tia' } : {});
  const listing = await createListing(owner, { name: 'Canal View Flat', type: 'rent', regularPrice: 1500 });
  const application = await apply(listing, tenant, owner);
  return {
    owner,
    tenant,
    listing,
    application,
    ownerAgent: await signedInAgent(owner),
    tenantAgent: await signedInAgent(tenant),
  };
};

const createLease = (agent, application, overrides = {}) =>
  agent.post('/api/leases').send({
    applicationId: application._id.toString(),
    monthlyRent: 1500,
    dueDay: 5,
    startDate: monthsAgo(2),
    ...overrides,
  });

// A lease that started two months ago, so three months have been charged.
const leased = async (options) => {
  const ctx = await setup(options);
  const res = await createLease(ctx.ownerAgent, ctx.application);
  return { ...ctx, view: res.body, leaseId: res.body.lease._id };
};

describe('setting up a lease', () => {
  it('creates a lease, charges every month so far and tells the tenant', async () => {
    const { tenant, application, ownerAgent } = await setup();

    const res = await createLease(ownerAgent, application, { notes: 'Pets allowed.' });

    expect(res.status).toBe(201);
    expect(res.body.lease).toMatchObject({
      monthlyRent: 1500,
      currency: 'USD',
      dueDay: 5,
      status: 'active',
      notes: 'Pets allowed.',
      tenant: { username: 'tenant_tia' },
      listing: { name: 'Canal View Flat' },
    });
    expect(res.body.charges.map((c) => c.period)).toHaveLength(3);
    expect(res.body.charges.every((c) => c.amount === 1500 && c.status === 'unpaid')).toBe(true);
    expect(res.body.summary.charged).toBe(4500);
    expect(res.body.viewer).toEqual({ role: 'owner' });
    expect(await Notification.findOne({ recipient: tenant._id })).toMatchObject({
      type: 'lease_created',
      title: 'landlord_lee set up your lease',
      body: '"Canal View Flat" at $1,500 / month',
      link: `/leases/${res.body.lease._id}`,
    });
  });

  it('has no charges yet for a lease starting next month', async () => {
    const { application, ownerAgent } = await setup();
    const now = new Date();
    const nextMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1)).toISOString().slice(0, 10);

    const res = await createLease(ownerAgent, application, { startDate: nextMonth });

    expect(res.body.charges).toEqual([]);
    expect(res.body.summary.nextDue).toBeNull();
  });

  it('only lets the owner set up a lease for an approved rental application', async () => {
    const { owner, tenant, application, tenantAgent, ownerAgent } = await setup();
    const pending = await apply(await createListing(owner, { type: 'rent' }), tenant, owner, 'submitted');
    const sale = await apply(await createListing(owner, { type: 'sale' }), tenant, owner);

    expect((await createLease(tenantAgent, application)).status).toBe(404);
    expect((await createLease(ownerAgent, pending)).status).toBe(409);
    expect((await createLease(ownerAgent, sale)).body.message).toBe('Leases are only for homes listed for rent.');
  });

  it('allows only one active lease per tenancy', async () => {
    const { application, ownerAgent } = await setup();
    await createLease(ownerAgent, application);

    const res = await createLease(ownerAgent, application);

    expect(res.status).toBe(409);
    expect(res.body.message).toBe('This tenancy already has an active lease.');
  });

  it.each([
    ['a due day after the 28th', { dueDay: 31 }, 'between the 1st and the 28th'],
    ['an end before the start', { startDate: '2026-05-01', endDate: '2026-04-01' }, 'after the start date'],
    ['a twenty-year lease', { startDate: '2026-01-01', endDate: '2046-01-01' }, 'at most 10 years'],
    ['zero rent', { monthlyRent: 0 }, 'at least 1'],
  ])('rejects %s', async (_, overrides, message) => {
    const { application, ownerAgent } = await setup();

    const res = await createLease(ownerAgent, application, overrides);

    expect(res.status).toBe(400);
    expect(res.body.message).toContain(message);
  });

  it('lists approved rental tenancies that still need a lease', async () => {
    const { owner, tenant, application, ownerAgent, listing } = await setup();
    const other = await createUser({ username: 'second_tenant' });
    const second = await apply(listing, other, owner);
    await apply(await createListing(owner, { type: 'sale' }), tenant, owner);
    await createLease(ownerAgent, application);

    const res = await ownerAgent.get('/api/leases/candidates');

    expect(res.body).toEqual([
      expect.objectContaining({
        applicationId: second._id.toString(),
        listing: expect.objectContaining({ name: 'Canal View Flat' }),
        tenant: expect.objectContaining({ username: 'second_tenant' }),
        suggestedRent: 1500,
      }),
    ]);
  });
});

describe('reading leases', () => {
  it('lists leases for each side with their balance', async () => {
    const { ownerAgent, tenantAgent, leaseId } = await leased();

    const asTenant = await tenantAgent.get('/api/leases');
    const asOwner = await ownerAgent.get('/api/leases?as=owner');

    expect(asTenant.body.map((l) => l._id)).toEqual([leaseId]);
    expect(asTenant.body[0].summary.balance).toBe(4500);
    expect(asOwner.body.map((l) => l._id)).toEqual([leaseId]);
    expect((await ownerAgent.get('/api/leases')).body).toEqual([]);
  });

  it('hides a lease from everyone else', async () => {
    const { leaseId } = await leased();
    const stranger = await signedInAgent(await createUser());

    expect((await stranger.get(`/api/leases/${leaseId}`)).status).toBe(404);
    expect((await api().get(`/api/leases/${leaseId}`)).status).toBe(401);
  });

  it('marks months past their due day as overdue', async () => {
    const { tenantAgent, leaseId } = await leased();

    const res = await tenantAgent.get(`/api/leases/${leaseId}`);

    const oldest = res.body.charges.at(-1);
    expect(oldest.state).toBe('overdue');
    expect(oldest.daysOverdue).toBeGreaterThan(25);
    expect(res.body.summary.overdueCount).toBeGreaterThanOrEqual(2);
    expect(res.body.viewer).toEqual({ role: 'tenant' });
  });

  it('adds a new charge when a new month starts', async () => {
    const { tenantAgent, leaseId } = await leased();
    const before = (await tenantAgent.get(`/api/leases/${leaseId}`)).body.charges.length;

    const now = new Date();
    await syncCharges(await Lease.findById(leaseId), new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 15)));
    const after = (await tenantAgent.get(`/api/leases/${leaseId}`)).body.charges.length;

    expect(after).toBe(before + 1);
  });
});

describe('paying rent', () => {
  it('lets the tenant pay a month online and tells the owner', async () => {
    const { owner, tenantAgent, view, leaseId } = await leased();
    const charge = view.charges.at(-1);

    const res = await tenantAgent.post(`/api/leases/${leaseId}/charges/${charge._id}/pay`);

    expect(res.status).toBe(200);
    const paid = res.body.charges.find((c) => c._id === charge._id);
    expect(paid).toMatchObject({ status: 'paid', state: 'paid', method: 'online' });
    expect(paid.reference).toMatch(/^RENT-[0-9A-F]{10}$/);
    expect(res.body.summary.paid).toBe(1500);
    expect(await Notification.findOne({ recipient: owner._id, type: 'rent_paid' })).toMatchObject({
      title: expect.stringMatching(/^tenant_tia paid rent for \w+ \d{4}$/),
      body: '$1,500',
    });
  });

  it("won't take the same month twice", async () => {
    const { tenantAgent, view, leaseId } = await leased();
    const charge = view.charges[0];
    await tenantAgent.post(`/api/leases/${leaseId}/charges/${charge._id}/pay`);

    const res = await tenantAgent.post(`/api/leases/${leaseId}/charges/${charge._id}/pay`);

    expect(res.status).toBe(409);
    expect(res.body.message).toBe("This month's rent is already paid.");
  });

  it('only lets the tenant pay online and only the owner record payments', async () => {
    const { ownerAgent, tenantAgent, view, leaseId } = await leased();
    const charge = view.charges[0];

    expect((await ownerAgent.post(`/api/leases/${leaseId}/charges/${charge._id}/pay`)).status).toBe(404);
    expect(
      (await tenantAgent.post(`/api/leases/${leaseId}/charges/${charge._id}/record`).send({ method: 'cash' })).status
    ).toBe(404);
  });

  it('rejects a charge from another lease', async () => {
    const { tenantAgent, leaseId } = await leased();
    const other = await leased({ names: false });

    const res = await tenantAgent.post(`/api/leases/${leaseId}/charges/${other.view.charges[0]._id}/pay`);

    expect(res.status).toBe(404);
  });

  it('lets the owner record a payment made outside the app', async () => {
    const { ownerAgent, view, leaseId } = await leased();
    const charge = view.charges[1];

    const res = await ownerAgent
      .post(`/api/leases/${leaseId}/charges/${charge._id}/record`)
      .send({ method: 'bank_transfer', note: 'Received on the 3rd' });

    expect(res.body.charges.find((c) => c._id === charge._id)).toMatchObject({
      status: 'paid',
      method: 'bank_transfer',
      note: 'Received on the 3rd',
      reference: null,
    });
  });

  it('requires a method when recording a payment', async () => {
    const { ownerAgent, view, leaseId } = await leased();

    const res = await ownerAgent.post(`/api/leases/${leaseId}/charges/${view.charges[0]._id}/record`).send({ method: 'online' });

    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Choose how the rent was paid');
  });

  it('lets the owner waive a month and tells the tenant', async () => {
    const { tenant, ownerAgent, view, leaseId } = await leased();
    const charge = view.charges[0];

    const res = await ownerAgent.post(`/api/leases/${leaseId}/charges/${charge._id}/waive`).send({ note: 'Boiler was broken' });

    expect(res.body.charges.find((c) => c._id === charge._id)).toMatchObject({ status: 'waived', note: 'Boiler was broken' });
    expect(res.body.summary).toMatchObject({ waived: 1500, balance: 3000 });
    expect(await Notification.findOne({ recipient: tenant._id, type: 'rent_waived' })).toMatchObject({
      body: '$1,500 no longer owed',
    });
  });
});

describe('ending a lease', () => {
  it('ends the lease, drops unpaid months after the end and tells the tenant', async () => {
    const { tenant, ownerAgent, leaseId } = await leased();
    const endDate = monthsAgo(1, 20);

    const res = await ownerAgent.post(`/api/leases/${leaseId}/end`).send({ endDate });

    expect(res.status).toBe(200);
    expect(res.body.lease).toMatchObject({ status: 'ended', endDate: `${endDate}T00:00:00.000Z` });
    expect(res.body.charges).toHaveLength(2);
    expect(await Notification.findOne({ recipient: tenant._id, type: 'lease_ended' })).toMatchObject({
      title: 'Your lease for "Canal View Flat" has ended',
    });
  });

  it('keeps paid months even after the end date', async () => {
    const { ownerAgent, tenantAgent, view, leaseId } = await leased();
    const current = view.charges[0];
    await tenantAgent.post(`/api/leases/${leaseId}/charges/${current._id}/pay`);

    const res = await ownerAgent.post(`/api/leases/${leaseId}/end`).send({ endDate: monthsAgo(1, 20) });

    expect(res.body.charges.map((c) => c._id)).toContain(current._id);
  });

  it("doesn't charge months after the end date", async () => {
    const { ownerAgent, leaseId } = await leased();
    await ownerAgent.post(`/api/leases/${leaseId}/end`).send({});
    const count = await RentCharge.countDocuments({ lease: leaseId });

    const now = new Date();
    await syncCharges(await Lease.findById(leaseId), new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 2, 15)));

    expect(await RentCharge.countDocuments({ lease: leaseId })).toBe(count);
  });

  it('can only be ended once, by the owner', async () => {
    const { ownerAgent, tenantAgent, leaseId } = await leased();

    expect((await tenantAgent.post(`/api/leases/${leaseId}/end`).send({})).status).toBe(404);
    expect((await ownerAgent.post(`/api/leases/${leaseId}/end`).send({})).status).toBe(200);
    expect((await ownerAgent.post(`/api/leases/${leaseId}/end`).send({})).status).toBe(409);
  });

  it('lets the owner set up a new lease for the tenancy afterwards', async () => {
    const { ownerAgent, application, leaseId } = await leased();
    await ownerAgent.post(`/api/leases/${leaseId}/end`).send({});

    expect((await createLease(ownerAgent, application, { monthlyRent: 1600 })).status).toBe(201);
  });
});

describe('rental income', () => {
  it('totals expected and collected rent by month for the owner', async () => {
    const { ownerAgent, tenantAgent, view, leaseId } = await leased();
    await tenantAgent.post(`/api/leases/${leaseId}/charges/${view.charges.at(-1)._id}/pay`);
    await ownerAgent.post(`/api/leases/${leaseId}/charges/${view.charges[1]._id}/waive`).send({});

    const res = await ownerAgent.get('/api/leases/income?months=4');

    expect(res.status).toBe(200);
    expect(res.body.months).toHaveLength(4);
    expect(res.body.months.map((m) => m.expected)).toEqual([0, 1500, 0, 1500]);
    expect(res.body.months.map((m) => m.collected)).toEqual([0, 1500, 0, 0]);
    expect(res.body.totals).toEqual({
      activeLeases: 1,
      expected: 3000,
      collected: 1500,
      outstanding: 1500,
      overdue: expect.any(Number),
      overdueCount: expect.any(Number),
    });
  });

  it('defaults to six months and caps the range', async () => {
    const { ownerAgent } = await leased();

    expect((await ownerAgent.get('/api/leases/income')).body.months).toHaveLength(6);
    expect((await ownerAgent.get('/api/leases/income?months=500')).body.months).toHaveLength(24);
    expect((await ownerAgent.get('/api/leases/income?months=abc')).body.months).toHaveLength(6);
  });

  it("is empty for someone who doesn't let any homes", async () => {
    const { tenantAgent } = await leased();

    const res = await tenantAgent.get('/api/leases/income');

    expect(res.body.totals).toMatchObject({ activeLeases: 0, expected: 0, outstanding: 0 });
  });
});

describe('rent ledger export', () => {
  it('downloads every month as CSV, oldest first', async () => {
    const { tenantAgent, view, leaseId } = await leased();
    await tenantAgent.post(`/api/leases/${leaseId}/charges/${view.charges.at(-1)._id}/pay`);

    const res = await tenantAgent.get(`/api/leases/${leaseId}/export`);

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('text/csv');
    const lines = res.text.trim().split('\n');
    expect(lines[0]).toBe('Month,Due date,Amount,Status,Method,Reference,Paid on,Note');
    expect(lines).toHaveLength(4);
    expect(lines[1]).toMatch(/^\d{4}-\d{2},\d{4}-\d{2}-05,1500,paid,online,RENT-/);
  });
});

describe('cleanup', () => {
  it('removes leases and charges when the listing is deleted', async () => {
    const { ownerAgent, listing, leaseId } = await leased();

    await ownerAgent.delete(`/api/listing/delete/${listing._id}`);

    expect(await Lease.findById(leaseId)).toBeNull();
    expect(await RentCharge.countDocuments({ lease: leaseId })).toBe(0);
  });

  it("includes the user's leases and charges in their data export", async () => {
    const { tenantAgent } = await leased();

    const res = await tenantAgent.get('/api/user/export');
    const data = JSON.parse(res.text);

    expect(data.leases).toHaveLength(1);
    expect(data.leases[0].rentCharges).toHaveLength(3);
  });
});
