import { beforeEach, describe, expect, it, vi } from 'vitest';
import { api, createListing, createUser, signedInAgent, validListing } from './helpers.js';
import PriceChange from '../models/priceChange.model.js';
import Notification from '../models/notification.model.js';
import { dropFromPeak, effectivePrice } from '../utils/priceHistory.js';
import { sendMail } from '../utils/mailer.js';

vi.mock('../utils/mailer.js', () => ({ sendMail: vi.fn(), appUrl: () => 'https://app.test' }));

const setup = async (listingOverrides = {}) => {
  const owner = await createUser();
  const agent = await signedInAgent(owner);
  const res = await agent.post('/api/listing/create').send(validListing({ regularPrice: 2000, ...listingOverrides }));
  return { owner, agent, listing: res.body };
};

const update = (agent, listing, body) => agent.post(`/api/listing/update/${listing._id}`).send(body);

describe('effectivePrice', () => {
  it('uses the discount price only during an offer', () => {
    expect(effectivePrice({ offer: true, regularPrice: 100, discountPrice: 80 })).toBe(80);
    expect(effectivePrice({ offer: false, regularPrice: 100, discountPrice: 80 })).toBe(100);
  });
});

describe('dropFromPeak', () => {
  it('measures the current price against the highest one', () => {
    expect(dropFromPeak([{ price: 750 }, { price: 1000 }, { price: 900 }])).toBe(25);
  });

  it('is zero without a drop or history', () => {
    expect(dropFromPeak([{ price: 1200 }, { price: 1000 }])).toBe(0);
    expect(dropFromPeak([])).toBe(0);
  });
});

describe('price history', () => {
  beforeEach(() => {
    vi.mocked(sendMail).mockReset().mockResolvedValue();
  });

  it('records the price a listing is posted at', async () => {
    const { listing } = await setup();

    const history = await PriceChange.find({ listing: listing._id });

    expect(history).toHaveLength(1);
    expect(history[0]).toMatchObject({ price: 2000, previousPrice: null, regularPrice: 2000, offer: false });
  });

  it('records changes to the effective price, newest first', async () => {
    const { agent, listing } = await setup();
    await update(agent, listing, { regularPrice: 1800 });
    await update(agent, listing, { offer: true, discountPrice: 1600 });

    const res = await api().get(`/api/listing/${listing._id}/price-history`);

    expect(res.status).toBe(200);
    expect(res.body.history.map((h) => [h.price, h.previousPrice])).toEqual([
      [1600, 1800],
      [1800, 2000],
      [2000, null],
    ]);
    expect(res.body.dropFromPeak).toBe(20);
  });

  it('ignores updates that leave the price alone', async () => {
    const { agent, listing } = await setup();

    await update(agent, listing, { name: 'A Completely New Name' });
    // Changing the discount while there's no offer doesn't change the price.
    await update(agent, listing, { discountPrice: 100 });

    expect(await PriceChange.countDocuments({ listing: listing._id })).toBe(1);
  });

  it('notifies people who saved the listing when the price drops', async () => {
    const { owner, agent, listing } = await setup({ name: 'Sunny Garden Apartment' });
    // The test helper turns email off by default; this fan wants emails.
    const fan = await createUser({ favorites: [listing._id], emailNotifications: true });
    const quietFan = await createUser({ favorites: [listing._id] });
    await createUser();
    // Owners who saved their own listing don't need telling.
    await owner.updateOne({ favorites: [listing._id] });

    await update(agent, listing, { regularPrice: 1500 });

    const notifications = await Notification.find({ type: 'price_drop', recipient: fan._id });
    expect(await Notification.countDocuments({ type: 'price_drop' })).toBe(2);
    expect(notifications[0]).toMatchObject({
      recipient: fan._id,
      title: 'Price drop on "Sunny Garden Apartment"',
      body: 'Now $1,500 / month, down from $2,000.',
      link: `/listing/${listing._id}`,
    });
    // Both get the in-app notification; only the fan who allows email gets one.
    expect(sendMail).toHaveBeenCalledTimes(1);
    expect(sendMail).toHaveBeenCalledWith(expect.objectContaining({ to: fan.email }));
    expect(await Notification.countDocuments({ recipient: quietFan._id })).toBe(1);
  });

  it('does not notify on a price increase', async () => {
    const { agent, listing } = await setup();
    await createUser({ favorites: [listing._id] });

    await update(agent, listing, { regularPrice: 2500 });

    expect(await Notification.countDocuments({ type: 'price_drop' })).toBe(0);
    expect(await PriceChange.countDocuments({ listing: listing._id })).toBe(2);
  });

  it('keeps the history of hidden listings private', async () => {
    const owner = await createUser();
    const listing = await createListing(owner, { hidden: true, hiddenBy: 'moderation' });

    expect((await api().get(`/api/listing/${listing._id}/price-history`)).status).toBe(404);
    expect((await (await signedInAgent(owner)).get(`/api/listing/${listing._id}/price-history`)).status).toBe(200);
  });

  it('returns 404 for a missing listing and 400 for a malformed id', async () => {
    expect((await api().get('/api/listing/0123456789abcdef01234567/price-history')).status).toBe(404);
    expect((await api().get('/api/listing/abc/price-history')).status).toBe(400);
  });

  it('is deleted with the listing', async () => {
    const { agent, listing } = await setup();

    await agent.delete(`/api/listing/delete/${listing._id}`).expect(200);

    expect(await PriceChange.countDocuments()).toBe(0);
  });
});
