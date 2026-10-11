import Listing from '../models/listing.model.js';
import User from '../models/user.model.js';
import Conversation from '../models/conversation.model.js';
import Viewing from '../models/viewing.model.js';
import ListingViewDay, { utcDay } from '../models/listingViewDay.model.js';

const DAYS = 30;

// The last 30 UTC days, oldest first, as 'YYYY-MM-DD'.
const lastDays = (now = new Date()) =>
  Array.from({ length: DAYS }, (_, i) => utcDay(new Date(now.getTime() - (DAYS - 1 - i) * 24 * 60 * 60 * 1000)));

// Turns [{ _id, count }] aggregation results into { id: count }.
const countsById = (rows) => Object.fromEntries(rows.map((r) => [r._id.toString(), r.count]));

// Performance of the signed-in user's listings: totals, views per day for
// the last 30 days, and per-listing numbers.
export const getMyAnalytics = async (req, res, next) => {
  try {
    const listings = await Listing.find(
      { userRef: req.user.id },
      'name imageUrls views ratingAverage ratingCount hidden createdAt'
    ).lean();
    const ids = listings.map((l) => l._id);
    const days = lastDays();

    const [saves, enquiries, viewingRequests, daily] = await Promise.all([
      User.aggregate([
        { $match: { favorites: { $in: ids } } },
        { $unwind: '$favorites' },
        { $match: { favorites: { $in: ids } } },
        { $group: { _id: '$favorites', count: { $sum: 1 } } },
      ]),
      Conversation.aggregate([
        { $match: { listing: { $in: ids } } },
        { $group: { _id: '$listing', count: { $sum: 1 } } },
      ]),
      Viewing.aggregate([
        { $match: { listing: { $in: ids } } },
        { $group: { _id: '$listing', count: { $sum: 1 } } },
      ]),
      ListingViewDay.find({ listing: { $in: ids }, day: { $gte: days[0] } }).lean(),
    ]);

    const savesBy = countsById(saves);
    const enquiriesBy = countsById(enquiries);
    const viewingsBy = countsById(viewingRequests);

    const viewsByDay = Object.fromEntries(days.map((day) => [day, 0]));
    const recentViewsBy = {};
    for (const { listing, day, count } of daily) {
      viewsByDay[day] += count;
      recentViewsBy[listing.toString()] = (recentViewsBy[listing.toString()] ?? 0) + count;
    }

    const perListing = listings
      .map((l) => {
        const id = l._id.toString();
        return {
          _id: l._id,
          name: l.name,
          imageUrl: l.imageUrls?.[0] ?? null,
          hidden: l.hidden,
          views: l.views ?? 0,
          viewsLast30Days: recentViewsBy[id] ?? 0,
          saves: savesBy[id] ?? 0,
          enquiries: enquiriesBy[id] ?? 0,
          viewingRequests: viewingsBy[id] ?? 0,
          ratingAverage: l.ratingAverage ?? 0,
          ratingCount: l.ratingCount ?? 0,
        };
      })
      .sort((a, b) => b.viewsLast30Days - a.viewsLast30Days || b.views - a.views);

    const sum = (key) => perListing.reduce((total, l) => total + l[key], 0);

    res.status(200).json({
      totals: {
        listings: listings.length,
        views: sum('views'),
        viewsLast30Days: sum('viewsLast30Days'),
        saves: sum('saves'),
        enquiries: sum('enquiries'),
        viewingRequests: sum('viewingRequests'),
      },
      viewsByDay: days.map((day) => ({ day, views: viewsByDay[day] })),
      listings: perListing,
    });
  } catch (error) {
    next(error);
  }
};
