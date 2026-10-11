import { describe, expect, it } from 'vitest';
import { api, createListing, createUser, signedInAgent } from './helpers.js';
import Application from '../models/application.model.js';
import Notification from '../models/notification.model.js';

const apply = (agent, listing, overrides = {}) =>
  agent.post('/api/applications').send({
    listingId: listing._id.toString(),
    fullName: 'Jane Applicant',
    email: 'jane@example.com',
    occupants: 2,
    ...overrides,
  });

const setup = async () => {
  const owner = await createUser();
  const applicant = await createUser();
  const listing = await createListing(owner);
  return {
    owner,
    applicant,
    listing,
    ownerAgent: await signedInAgent(owner),
    applicantAgent: await signedInAgent(applicant),
  };
};

describe('POST /api/applications', () => {
  it('requires sign-in', async () => {
    expect((await apply(api(), { _id: 'x' })).status).toBe(401);
  });

  it('creates an application and notifies the owner', async () => {
    const { owner, applicant, listing, applicantAgent } = await setup();

    const res = await apply(applicantAgent, listing, { message: 'We love it', income: 90000 });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ status: 'submitted', occupants: 2, income: 90000 });
    expect(res.body.applicant._id).toBe(applicant._id.toString());
    expect(res.body.owner._id).toBe(owner._id.toString());

    const note = await Notification.findOne({ recipient: owner._id, type: 'application_received' });
    expect(note).not.toBeNull();
    expect(note.link).toBe('/applications?role=owner');
  });

  it("does not let owners apply to their own listing", async () => {
    const { listing, ownerAgent } = await setup();
    expect((await apply(ownerAgent, listing)).status).toBe(400);
  });

  it('allows only one active application per listing', async () => {
    const { listing, applicantAgent } = await setup();
    await apply(applicantAgent, listing).expect(201);

    const second = await apply(applicantAgent, listing);

    expect(second.status).toBe(409);
    expect(await Application.countDocuments()).toBe(1);
  });

  it('lets a rejected applicant apply again', async () => {
    const { listing, applicantAgent, ownerAgent } = await setup();
    const first = await apply(applicantAgent, listing);
    await ownerAgent.patch(`/api/applications/${first.body._id}`).send({ action: 'reject' });

    expect((await apply(applicantAgent, listing)).status).toBe(201);
  });

  it.each([
    ['a short name', { fullName: 'Jo' }, 'full name'],
    ['a bad email', { email: 'not-an-email' }, 'Invalid email'],
    ['too many occupants', { occupants: 50 }, 'At most 20 occupants'],
    ['a bad listing id', { listingId: 'abc' }, 'Invalid listing id'],
  ])('rejects %s', async (_, override, message) => {
    const { listing, applicantAgent } = await setup();
    const res = await apply(applicantAgent, listing, override);
    expect(res.status).toBe(400);
    expect(res.body.message).toContain(message);
  });

  it('returns 404 for a hidden listing', async () => {
    const { applicantAgent } = await setup();
    const hidden = await createListing(await createUser(), { hidden: true });
    expect((await apply(applicantAgent, hidden)).status).toBe(404);
  });
});

describe('GET /api/applications', () => {
  it('lists the applications you submitted, or received', async () => {
    const { owner, applicant, listing, ownerAgent, applicantAgent } = await setup();
    const otherListing = await createListing(owner, { name: 'Another Listing Home' });
    await apply(applicantAgent, listing);
    await apply(applicantAgent, otherListing, { email: 'jane2@example.com' });

    const mine = await applicantAgent.get('/api/applications');
    const received = await ownerAgent.get('/api/applications?role=owner');

    expect(mine.body).toHaveLength(2);
    expect(received.body).toHaveLength(2);
    expect(received.body[0].applicant.username).toBe(applicant.username);
    expect((await ownerAgent.get('/api/applications')).body).toHaveLength(0);
  });

  it('hides an application from unrelated users', async () => {
    const { listing, applicantAgent } = await setup();
    const created = await apply(applicantAgent, listing);
    const stranger = await signedInAgent(await createUser());

    expect((await stranger.get(`/api/applications/${created.body._id}`)).status).toBe(404);
  });
});

describe('PATCH /api/applications/:id', () => {
  const submitted = async () => {
    const ctx = await setup();
    const res = await apply(ctx.applicantAgent, ctx.listing);
    return { ...ctx, applicationId: res.body._id };
  };

  it('lets the owner review, then approve with a note', async () => {
    const { ownerAgent, applicationId, applicant } = await submitted();

    await ownerAgent.patch(`/api/applications/${applicationId}`).send({ action: 'review' }).expect(200);
    const res = await ownerAgent
      .patch(`/api/applications/${applicationId}`)
      .send({ action: 'approve', note: 'Great references' });

    expect(res.body).toMatchObject({ status: 'approved', responseNote: 'Great references' });
    const note = await Notification.findOne({ recipient: applicant._id, type: 'application_status' });
    expect(note).not.toBeNull();
  });

  it('lets the applicant withdraw', async () => {
    const { applicantAgent, applicationId } = await submitted();

    const res = await applicantAgent.patch(`/api/applications/${applicationId}`).send({ action: 'withdraw' });

    expect(res.body.status).toBe('withdrawn');
  });

  it('only lets the owner approve or reject', async () => {
    const { applicantAgent, applicationId } = await submitted();
    expect((await applicantAgent.patch(`/api/applications/${applicationId}`).send({ action: 'approve' })).status).toBe(403);
  });

  it('does not let the owner withdraw on behalf of the applicant', async () => {
    const { ownerAgent, applicationId } = await submitted();
    expect((await ownerAgent.patch(`/api/applications/${applicationId}`).send({ action: 'withdraw' })).status).toBe(403);
  });

  it('refuses to change a decided application', async () => {
    const { ownerAgent, applicationId } = await submitted();
    await ownerAgent.patch(`/api/applications/${applicationId}`).send({ action: 'approve' });

    expect((await ownerAgent.patch(`/api/applications/${applicationId}`).send({ action: 'reject' })).status).toBe(409);
  });

  it('validates the action', async () => {
    const { ownerAgent, applicationId } = await submitted();
    expect((await ownerAgent.patch(`/api/applications/${applicationId}`).send({ action: 'explode' })).status).toBe(400);
  });
});

describe('DELETE /api/applications/:id', () => {
  it('deletes a withdrawn application', async () => {
    const { listing, applicantAgent } = await setup();
    const created = await apply(applicantAgent, listing);
    await applicantAgent.patch(`/api/applications/${created.body._id}`).send({ action: 'withdraw' });

    const res = await applicantAgent.delete(`/api/applications/${created.body._id}`);

    expect(res.status).toBe(200);
    expect(await Application.countDocuments()).toBe(0);
  });

  it('refuses to delete an active application', async () => {
    const { listing, applicantAgent } = await setup();
    const created = await apply(applicantAgent, listing);

    expect((await applicantAgent.delete(`/api/applications/${created.body._id}`)).status).toBe(409);
  });
});

describe('cleanup', () => {
  it('removes applications when the listing is deleted', async () => {
    const { listing, ownerAgent, applicantAgent } = await setup();
    await apply(applicantAgent, listing);

    await ownerAgent.delete(`/api/listing/delete/${listing._id}`).expect(200);

    expect(await Application.countDocuments()).toBe(0);
  });
});
