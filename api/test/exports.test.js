import { describe, expect, it } from 'vitest';
import { api, createListing, createUser, signedInAgent } from './helpers.js';

const apply = (agent, listing, overrides = {}) =>
  agent
    .post('/api/applications')
    .send({ listingId: listing._id.toString(), fullName: 'Jane Applicant', email: 'jane@example.com', ...overrides });

const withPipeline = async () => {
  const owner = await createUser();
  const listing = await createListing(owner, { name: 'Pipeline Listing Home' });
  const ownerAgent = await signedInAgent(owner);

  const approvedApplicant = await createUser();
  const approvedAgent = await signedInAgent(approvedApplicant);
  const approved = await apply(approvedAgent, listing, { email: 'approved@example.com' });
  await ownerAgent.patch(`/api/applications/${approved.body._id}`).send({ action: 'approve' });

  const otherApplicant = await createUser();
  const otherAgent = await signedInAgent(otherApplicant);
  await apply(otherAgent, listing, { email: 'other@example.com' });

  // A paid holding deposit for the approved application.
  const deposit = await approvedAgent
    .post('/api/payments')
    .send({ applicationId: approved.body._id, amount: 500 });
  await approvedAgent.post(`/api/payments/${deposit.body._id}/confirm`);

  return { owner, listing, ownerAgent, approvedApplicant };
};

describe('analytics with applications and deposits', () => {
  it('counts applications, approvals and deposits', async () => {
    const { ownerAgent } = await withPipeline();

    const res = await ownerAgent.get('/api/user/analytics');

    expect(res.body.totals).toMatchObject({
      applications: 2,
      approvedApplications: 1,
      depositsPaid: 1,
      depositsPaidAmount: 500,
      approvalRate: 0.5,
    });
    expect(res.body.listings[0]).toMatchObject({ applications: 2, approvedApplications: 1, depositsPaidAmount: 500 });
  });
});

describe('CSV exports', () => {
  it('exports the analytics as a CSV attachment', async () => {
    const { ownerAgent } = await withPipeline();

    const res = await ownerAgent.get('/api/user/analytics/export');

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('text/csv');
    expect(res.headers['content-disposition']).toContain('attachment');
    expect(res.text).toContain('Listing,Type,Price');
    expect(res.text).toContain('Pipeline Listing Home');
    expect(res.text).toContain('Applications');
  });

  it('exports received applications with their details', async () => {
    const { ownerAgent } = await withPipeline();

    const res = await ownerAgent.get('/api/applications/export');

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('text/csv');
    expect(res.text).toContain('approved@example.com');
    expect(res.text).toContain('Jane Applicant');
    expect(res.text).toContain('Pipeline Listing Home');
  });

  it('quotes values that contain commas', async () => {
    const owner = await createUser();
    const listing = await createListing(owner);
    const applicantAgent = await signedInAgent(await createUser());
    await apply(applicantAgent, listing, { message: 'Hello, I am, interested' });

    const res = await (await signedInAgent(owner)).get('/api/applications/export');

    expect(res.text).toContain('"Hello, I am, interested"');
  });

  it('requires sign-in', async () => {
    expect((await api().get('/api/user/analytics/export')).status).toBe(401);
    expect((await api().get('/api/applications/export')).status).toBe(401);
  });
});
