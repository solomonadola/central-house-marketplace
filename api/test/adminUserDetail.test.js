import { describe, expect, it } from 'vitest';
import { api, createListing, createUser, signedInAgent } from './helpers.js';
import Report from '../models/report.model.js';
import Review from '../models/review.model.js';
import Application from '../models/application.model.js';
import Payment from '../models/payment.model.js';

const adminAgent = async () => signedInAgent(await createUser({ role: 'admin' }));

describe('GET /api/admin/users/:id', () => {
  it('requires an admin', async () => {
    const user = await createUser();
    expect((await api().get(`/api/admin/users/${user._id}`)).status).toBe(401);
    const member = await signedInAgent(await createUser());
    expect((await member.get(`/api/admin/users/${user._id}`)).status).toBe(403);
  });

  it('returns the profile, stats and listings', async () => {
    const user = await createUser({ username: 'target_user' });
    const visible = await createListing(user, { name: 'Visible Target Listing' });
    await createListing(user, { name: 'Hidden Target Listing', hidden: true });
    await createListing(user, { name: 'Paused Target Listing', active: false });
    const reporter = await createUser();
    await Report.create({ listing: visible._id, reporter: reporter._id, reason: 'scam' });
    await Review.create({ listing: visible._id, author: reporter._id, rating: 4 });

    const res = await (await adminAgent()).get(`/api/admin/users/${user._id}`);

    expect(res.status).toBe(200);
    expect(res.body.user).toMatchObject({ username: 'target_user', role: 'user' });
    expect(res.body.user).not.toHaveProperty('password');
    expect(res.body.stats).toMatchObject({
      listings: 3,
      hidden: 1,
      paused: 1,
      openReports: 1,
      reviews: 0,
    });
    expect(res.body.listings).toHaveLength(3);
  });

  it('summarises applications and deposits received', async () => {
    const owner = await createUser();
    const applicant = await createUser();
    const listing = await createListing(owner);
    const application = await Application.create({
      listing: listing._id,
      applicant: applicant._id,
      owner: owner._id,
      fullName: 'Jane Applicant',
      email: 'jane@example.com',
      status: 'approved',
    });
    await Payment.create({
      application: application._id,
      listing: listing._id,
      payer: applicant._id,
      payee: owner._id,
      amount: 900,
      reference: 'DEP-TESTREF001',
      status: 'paid',
    });

    const res = await (await adminAgent()).get(`/api/admin/users/${owner._id}`);

    expect(res.body.stats).toMatchObject({ applicationsReceived: 1, depositsReceived: 1, depositsReceivedAmount: 900 });
  });

  it('returns 404 for an unknown user and 400 for a bad id', async () => {
    const agent = await adminAgent();
    expect((await agent.get('/api/admin/users/0123456789abcdef01234567')).status).toBe(404);
    expect((await agent.get('/api/admin/users/abc')).status).toBe(400);
  });
});
