import { describe, expect, it } from 'vitest';
import { api, createListing, createUser, signedInAgent } from './helpers.js';

const setup = async () => {
  const owner = await createUser();
  const buyer = await createUser();
  const listing = await createListing(owner, { name: 'Calendar Loft Home', address: '5 Diar Lane' });
  const buyerAgent = await signedInAgent(buyer);
  const request = await buyerAgent
    .post('/api/viewings')
    .send({ listingId: listing._id.toString(), startsAt: new Date(Date.now() + 86_400_000).toISOString() });
  return { owner, buyer, listing, buyerAgent, request };
};

describe('GET /api/viewings/export', () => {
  it('returns an .ics calendar of the requested viewings', async () => {
    const { buyerAgent } = await setup();

    const res = await buyerAgent.get('/api/viewings/export');

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('text/calendar');
    expect(res.headers['content-disposition']).toContain('viewings.ics');
    expect(res.text).toContain('BEGIN:VCALENDAR');
    expect(res.text).toContain('SUMMARY:Viewing: Calendar Loft Home');
    expect(res.text).toContain('LOCATION:5 Diar Lane');
    expect(res.text).toContain('END:VCALENDAR');
  });

  it('exports the viewings on your listings with ?as=owner', async () => {
    const { owner } = await setup();

    const res = await (await signedInAgent(owner)).get('/api/viewings/export?as=owner');

    expect(res.text).toContain('SUMMARY:Viewing: Calendar Loft Home');
  });

  it('does not leak other users viewings', async () => {
    await setup();

    const res = await (await signedInAgent(await createUser())).get('/api/viewings/export');

    expect(res.text).not.toContain('Calendar Loft Home');
  });

  it('requires sign-in', async () => {
    expect((await api().get('/api/viewings/export')).status).toBe(401);
  });
});
