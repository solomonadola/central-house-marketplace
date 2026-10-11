import { describe, expect, it } from 'vitest';
import { api, createListing, createUser, signedInAgent } from './helpers.js';
import Payment from '../models/payment.model.js';
import Notification from '../models/notification.model.js';

const withApproved = async () => {
  const owner = await createUser();
  const applicant = await createUser();
  const listing = await createListing(owner);
  const ownerAgent = await signedInAgent(owner);
  const applicantAgent = await signedInAgent(applicant);

  const application = await applicantAgent
    .post('/api/applications')
    .send({ listingId: listing._id.toString(), fullName: 'Jane Applicant', email: 'jane@example.com' });
  await ownerAgent.patch(`/api/applications/${application.body._id}`).send({ action: 'approve' });

  return { owner, applicant, listing, ownerAgent, applicantAgent, applicationId: application.body._id };
};

const pay = (agent, applicationId, overrides = {}) =>
  agent.post('/api/payments').send({ applicationId, amount: 500, ...overrides });

describe('POST /api/payments', () => {
  it('requires sign-in', async () => {
    expect((await api().post('/api/payments').send({})).status).toBe(401);
  });

  it('creates a pending deposit for an approved application', async () => {
    const { applicantAgent, applicationId } = await withApproved();

    const res = await pay(applicantAgent, applicationId);

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ amount: 500, currency: 'USD', status: 'pending' });
    expect(res.body.reference).toMatch(/^DEP-[0-9A-F]{12}$/);
  });

  it('refuses an application that is not approved yet', async () => {
    const owner = await createUser();
    const applicant = await createUser();
    const listing = await createListing(owner);
    const applicantAgent = await signedInAgent(applicant);
    const application = await applicantAgent
      .post('/api/applications')
      .send({ listingId: listing._id.toString(), fullName: 'Jane Applicant', email: 'jane@example.com' });

    const res = await pay(applicantAgent, application.body._id);

    expect(res.status).toBe(409);
    expect(res.body.message).toMatch(/approved/);
  });

  it("won't let someone pay for another person's application", async () => {
    const { applicationId } = await withApproved();
    const strangerAgent = await signedInAgent(await createUser());

    expect((await pay(strangerAgent, applicationId)).status).toBe(403);
  });

  it('allows only one deposit per application', async () => {
    const { applicantAgent, applicationId } = await withApproved();
    await pay(applicantAgent, applicationId).expect(201);

    expect((await pay(applicantAgent, applicationId)).status).toBe(409);
    expect(await Payment.countDocuments()).toBe(1);
  });

  it.each([
    ['too small an amount', { amount: 5 }, 'at least 10'],
    ['a bad currency', { currency: 'dollars' }, '3-letter code'],
    ['a bad application id', { applicationId: 'abc' }, 'Invalid application id'],
  ])('rejects %s', async (_, override, message) => {
    const { applicantAgent, applicationId } = await withApproved();
    const res = await pay(applicantAgent, applicationId, override);
    expect(res.status).toBe(400);
    expect(res.body.message).toContain(message);
  });
});

describe('deposit lifecycle', () => {
  const pending = async () => {
    const ctx = await withApproved();
    const res = await pay(ctx.applicantAgent, ctx.applicationId);
    return { ...ctx, paymentId: res.body._id };
  };

  it('confirms a deposit and notifies the owner', async () => {
    const { owner, applicantAgent, paymentId } = await pending();

    const res = await applicantAgent.post(`/api/payments/${paymentId}/confirm`);

    expect(res.body).toMatchObject({ status: 'paid' });
    expect(res.body.paidAt).not.toBeNull();
    const note = await Notification.findOne({ recipient: owner._id, type: 'payment_received' });
    expect(note).not.toBeNull();
  });

  it('refunds a paid deposit and notifies the payer', async () => {
    const { applicant, applicantAgent, ownerAgent, paymentId } = await pending();
    await applicantAgent.post(`/api/payments/${paymentId}/confirm`);

    const res = await ownerAgent.post(`/api/payments/${paymentId}/refund`);

    expect(res.body).toMatchObject({ status: 'refunded' });
    const note = await Notification.findOne({ recipient: applicant._id, type: 'payment_refunded' });
    expect(note).not.toBeNull();
  });

  it('cancels a pending deposit', async () => {
    const { applicantAgent, paymentId } = await pending();

    const res = await applicantAgent.post(`/api/payments/${paymentId}/cancel`);

    expect(res.body.status).toBe('cancelled');
  });

  it('only lets the payer confirm or cancel', async () => {
    const { ownerAgent, paymentId } = await pending();

    expect((await ownerAgent.post(`/api/payments/${paymentId}/confirm`)).status).toBe(404);
    expect((await ownerAgent.post(`/api/payments/${paymentId}/cancel`)).status).toBe(404);
  });

  it('only lets the owner refund', async () => {
    const { applicantAgent, paymentId } = await pending();
    await applicantAgent.post(`/api/payments/${paymentId}/confirm`);

    expect((await applicantAgent.post(`/api/payments/${paymentId}/refund`)).status).toBe(404);
  });

  it('refuses to double-confirm or refund a pending deposit', async () => {
    const { applicantAgent, ownerAgent, paymentId } = await pending();
    await applicantAgent.post(`/api/payments/${paymentId}/confirm`).expect(200);

    expect((await applicantAgent.post(`/api/payments/${paymentId}/confirm`)).status).toBe(409);
    expect((await ownerAgent.post(`/api/payments/${paymentId}/refund`)).status).toBe(200);
    // A refunded deposit cannot be refunded again.
    expect((await ownerAgent.post(`/api/payments/${paymentId}/refund`)).status).toBe(409);
  });
});

describe('listing payments', () => {
  it('lists the deposits you paid or received', async () => {
    const { owner, applicant, applicantAgent, ownerAgent, applicationId } = await withApproved();
    await pay(applicantAgent, applicationId);

    const paid = await applicantAgent.get('/api/payments');
    const received = await ownerAgent.get('/api/payments?role=payee');

    expect(paid.body).toHaveLength(1);
    expect(received.body).toHaveLength(1);
    expect(received.body[0].payer._id).toBe(applicant._id.toString());
    expect(received.body[0].payee._id).toBe(owner._id.toString());
  });

  it('hides a payment from unrelated users', async () => {
    const { applicantAgent, applicationId } = await withApproved();
    const created = await pay(applicantAgent, applicationId);
    const stranger = await signedInAgent(await createUser());

    expect((await stranger.get(`/api/payments/${created.body._id}`)).status).toBe(404);
  });

  it('removes payments when the listing is deleted', async () => {
    const { listing, applicantAgent, ownerAgent, applicationId } = await withApproved();
    await pay(applicantAgent, applicationId);

    await ownerAgent.delete(`/api/listing/delete/${listing._id}`).expect(200);

    expect(await Payment.countDocuments()).toBe(0);
  });
});

describe('GET /api/payments/export', () => {
  it('exports the deposits you paid as a CSV', async () => {
    const { applicantAgent, applicationId } = await withApproved();
    await pay(applicantAgent, applicationId, { amount: 750 });

    const res = await applicantAgent.get('/api/payments/export');

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('text/csv');
    expect(res.text).toContain('Reference,Listing,Counterparty');
    expect(res.text).toContain('750');
    expect(res.text).toMatch(/DEP-[0-9A-F]{12}/);
  });

  it('exports the deposits you received with ?role=payee', async () => {
    const { ownerAgent, applicantAgent, applicationId } = await withApproved();
    await pay(applicantAgent, applicationId);

    expect((await ownerAgent.get('/api/payments/export?role=payee')).text).toContain('Reference,Listing,Counterparty');
    expect((await ownerAgent.get('/api/payments/export')).text).not.toContain('DEP-');
  });

  it('requires sign-in', async () => {
    expect((await api().get('/api/payments/export')).status).toBe(401);
  });
});
