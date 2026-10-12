import mongoose from 'mongoose';
import Review from '../models/review.model.js';
import Listing from '../models/listing.model.js';

// Recalculates a listing's ratingAverage/ratingCount from its reviews,
// leaving out reviews a moderator removed.
export const updateListingRating = async (listingId) => {
  const [stats] = await Review.aggregate([
    { $match: { listing: new mongoose.Types.ObjectId(String(listingId)), removed: { $ne: true } } },
    { $group: { _id: null, average: { $avg: '$rating' }, count: { $sum: 1 } } },
  ]);
  await Listing.updateOne(
    { _id: listingId },
    {
      ratingAverage: stats ? Math.round(stats.average * 100) / 100 : 0,
      ratingCount: stats?.count ?? 0,
    }
  );
};
