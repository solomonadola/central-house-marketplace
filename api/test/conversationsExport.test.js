import { describe, expect, it } from 'vitest';
import { api, createListing, createUser, signedInAgent } from './helpers.js';

describe('GET /api/messages/conversations/export', () => {
  it('exports the conversations as a CSV', async () => {
    const owner = await createUser();
    const buyer = await createUser();
    const listing = await createListing(owner, { name: 'Enquiry Loft Home' });
    const buyerAgent = await signedInAgent(buyer);
    await buyerAgent.post('/api/messages/conversations').send({ listingId: listing._id.toString(), body: 'Is it free?' });

    const res = await buyerAgent.get('/api/messages/conversations/export');

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('text/csv');
    expect(res.text).toContain('With,Listing,Last message');
    expect(res.text).toContain('Enquiry Loft Home');
    expect(res.text).toContain('Is it free?');
  });

  it('does not include other users conversations', async () => {
    const owner = await createUser();
    const buyer = await createUser();
    const listing = await createListing(owner, { name: 'Private Enquiry Home' });
    await (await signedInAgent(buyer))
      .post('/api/messages/conversations')
      .send({ listingId: listing._id.toString(), body: 'Hi' });

    const res = await (await signedInAgent(await createUser())).get('/api/messages/conversations/export');

    expect(res.text).not.toContain('Private Enquiry Home');
  });

  it('requires sign-in', async () => {
    expect((await api().get('/api/messages/conversations/export')).status).toBe(401);
  });
});
