import { describe, expect, it } from 'vitest';
import { api, createListing, createUser, signedInAgent } from './helpers.js';
import Conversation from '../models/conversation.model.js';
import Viewing from '../models/viewing.model.js';
import ListingViewDay, { utcDay } from '../models/listingViewDay.model.js';

const daysAgo = (n) => utcDay(new Date(Date.now() - n * 24 * 60 * 60 * 1000));

describe('GET /api/user/analytics', () => {
  it("summarizes the owner's listings", async () => {
    const owner = await createUser();
    const popular = await createListing(owner, { name: 'Popular Listing Here', views: 40, ratingAverage: 4.5, ratingCount: 2 });
    const quiet = await createListing(owner, { name: 'Quiet Listing Here', views: 3 });
    await createListing(await createUser(), { name: 'Somebody Elses Listing', views: 999 });

    // Saves, enquiries and viewing requests from other users.
    await createUser({ favorites: [popular._id, quiet._id] });
    await createUser({ favorites: [popular._id] });
    const buyer = await createUser();
    await Conversation.create({
      listing: popular._id,
      buyer: buyer._id,
      owner: owner._id,
      participants: [{ user: buyer._id }, { user: owner._id }],
    });
    await Viewing.create({ listing: popular._id, requester: buyer._id, owner: owner._id, startsAt: new Date(Date.now() + 86400000) });
    await ListingViewDay.create([
      { listing: popular._id, day: daysAgo(0), count: 5 },
      { listing: popular._id, day: daysAgo(2), count: 3 },
      { listing: quiet._id, day: daysAgo(2), count: 1 },
      { listing: popular._id, day: daysAgo(45), count: 30 },
    ]);

    const res = await (await signedInAgent(owner)).get('/api/user/analytics');

    expect(res.status).toBe(200);
    expect(res.body.totals).toEqual({
      listings: 2,
      views: 43,
      viewsLast30Days: 9,
      saves: 3,
      enquiries: 1,
      viewingRequests: 1,
    });
    expect(res.body.listings[0]).toMatchObject({
      name: 'Popular Listing Here',
      views: 40,
      viewsLast30Days: 8,
      saves: 2,
      enquiries: 1,
      viewingRequests: 1,
      ratingAverage: 4.5,
    });
    expect(res.body.listings[1]).toMatchObject({ name: 'Quiet Listing Here', viewsLast30Days: 1, saves: 1 });

    expect(res.body.viewsByDay).toHaveLength(30);
    expect(res.body.viewsByDay.at(-1)).toEqual({ day: daysAgo(0), views: 5 });
    expect(res.body.viewsByDay.at(-3)).toEqual({ day: daysAgo(2), views: 4 });
    expect(res.body.viewsByDay[0]).toEqual({ day: daysAgo(29), views: 0 });
  });

  it('works for users without listings', async () => {
    const res = await (await signedInAgent(await createUser())).get('/api/user/analytics');

    expect(res.body.totals).toMatchObject({ listings: 0, views: 0 });
    expect(res.body.listings).toEqual([]);
    expect(res.body.viewsByDay.every((d) => d.views === 0)).toBe(true);
  });

  it('requires sign-in', async () => {
    expect((await api().get('/api/user/analytics')).status).toBe(401);
  });
});
