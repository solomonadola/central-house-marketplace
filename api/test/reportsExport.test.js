import { describe, expect, it } from 'vitest';
import { api, createListing, createUser, signedInAgent } from './helpers.js';

describe('GET /api/admin/reports/export', () => {
  it('requires an admin', async () => {
    expect((await api().get('/api/admin/reports/export')).status).toBe(401);
    const member = await signedInAgent(await createUser());
    expect((await member.get('/api/admin/reports/export')).status).toBe(403);
  });

  it('exports the open reports as a CSV', async () => {
    const admin = await createUser({ role: 'admin' });
    const listing = await createListing(await createUser(), { name: 'Reported Listing Home' });
    await (await signedInAgent(await createUser()))
      .post('/api/reports')
      .send({ listingId: listing._id.toString(), reason: 'scam', details: 'Looks fake' });

    const res = await (await signedInAgent(admin)).get('/api/admin/reports/export');

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('text/csv');
    expect(res.text).toContain('Listing,Reporter,Reason');
    expect(res.text).toContain('Reported Listing Home');
    expect(res.text).toContain('scam');
  });

  it('honours the status filter', async () => {
    const admin = await createUser({ role: 'admin' });
    const listing = await createListing(await createUser(), { name: 'Resolved Report Home' });
    const report = await (await signedInAgent(await createUser()))
      .post('/api/reports')
      .send({ listingId: listing._id.toString(), reason: 'scam' });
    const agent = await signedInAgent(admin);
    await agent.patch(`/api/admin/reports/${report.body._id}`).send({ status: 'resolved' });

    expect((await agent.get('/api/admin/reports/export?status=open')).text).not.toContain('Resolved Report Home');
    expect((await agent.get('/api/admin/reports/export?status=resolved')).text).toContain('Resolved Report Home');
  });
});
