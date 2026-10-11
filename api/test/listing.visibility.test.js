import { describe, expect, it } from 'vitest';
import { api, createListing, createUser, signedInAgent } from './helpers.js';

const setup = async () => {
  const owner = await createUser();
  const visible = await createListing(owner, { name: 'Visible Listing Here' });
  const hidden = await createListing(owner, {
    name: 'Hidden Listing Here',
    hidden: true,
    hiddenReason: 'Misleading photos',
    hiddenBy: 'moderation',
  });
  return { owner, visible, hidden };
};

describe('hidden listings', () => {
  it('are left out of search results and counts', async () => {
    await setup();

    const res = await api().get('/api/listing/get');

    expect(res.body.map((l) => l.name)).toEqual(['Visible Listing Here']);
    expect(res.headers['x-total-count']).toBe('1');
  });

  it('look missing to visitors and other users', async () => {
    const { hidden } = await setup();
    const other = await signedInAgent(await createUser());

    expect((await api().get(`/api/listing/get/${hidden._id}`)).status).toBe(404);
    expect((await other.get(`/api/listing/get/${hidden._id}`)).status).toBe(404);
  });

  it('stay visible to their owner, with the reason', async () => {
    const { owner, hidden } = await setup();

    const res = await (await signedInAgent(owner)).get(`/api/listing/get/${hidden._id}`);

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ hidden: true, hiddenReason: 'Misleading photos' });
  });

  it('stay visible to admins', async () => {
    const { hidden } = await setup();
    const admin = await signedInAgent(await createUser({ role: 'admin' }));

    expect((await admin.get(`/api/listing/get/${hidden._id}`)).status).toBe(200);
  });

  it("appear in the owner's own listings", async () => {
    const { owner } = await setup();
    const res = await (await signedInAgent(owner)).get(`/api/user/listings/${owner._id}`);
    expect(res.body).toHaveLength(2);
  });

  it('drop out of saved listings', async () => {
    const { visible, hidden } = await setup();
    const fan = await createUser({ favorites: [visible._id, hidden._id] });

    const res = await (await signedInAgent(fan)).get('/api/user/favorites');

    expect(res.body.map((l) => l.name)).toEqual(['Visible Listing Here']);
  });

  it('cannot be viewed or messaged about', async () => {
    const { hidden } = await setup();
    const agent = await signedInAgent(await createUser());

    expect((await api().post(`/api/listing/view/${hidden._id}`)).status).toBe(404);
    const res = await agent
      .post('/api/messages/conversations')
      .send({ listingId: hidden._id.toString(), body: 'Hi' });
    expect(res.status).toBe(404);
  });

  it('cannot be un-hidden by the owner through an update', async () => {
    const { owner, hidden } = await setup();

    const res = await (await signedInAgent(owner))
      .post(`/api/listing/update/${hidden._id}`)
      .send({ hidden: false, hiddenReason: '' });

    expect(res.body).toMatchObject({ hidden: true, hiddenReason: 'Misleading photos' });
  });
});
