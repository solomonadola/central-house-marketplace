import Review from '../models/review.model.js';
import Listing from '../models/listing.model.js';
import Conversation from '../models/conversation.model.js';
import { errorHandler } from '../utils/error.js';
import { updateListingRating } from '../utils/ratings.js';

// Only people who contacted the owner about a listing can review it, so
// every review comes from someone who actually got in touch.
const hasContactedOwner = (listingId, userId) =>
  Conversation.exists({ listing: listingId, buyer: userId });

export const getListingReviews = async (req, res, next) => {
  try {
    const listing = await Listing.findById(req.params.id, 'userRef ratingAverage ratingCount');
    if (!listing) return next(errorHandler(404, 'Listing not found!'));

    const reviews = await Review.find({ listing: listing._id })
      .sort({ createdAt: -1 })
      .limit(100)
      .populate('author', 'username avatar');

    // Signed-in users also learn whether they can review and see their own review.
    let viewer = null;
    if (req.user) {
      const isOwner = listing.userRef === req.user.id;
      viewer = {
        canReview: !isOwner && Boolean(await hasContactedOwner(listing._id, req.user.id)),
        isOwner,
        ownReview: reviews.find((r) => r.author?._id.toString() === req.user.id) ?? null,
      };
    }

    res.status(200).json({
      average: listing.ratingAverage,
      count: listing.ratingCount,
      reviews,
      viewer,
    });
  } catch (error) {
    next(error);
  }
};

// Creates the user's review of a listing, or updates it if one exists.
export const upsertReview = async (req, res, next) => {
  try {
    const listing = await Listing.findById(req.params.id, 'userRef');
    if (!listing) return next(errorHandler(404, 'Listing not found!'));
    if (listing.userRef === req.user.id) {
      return next(errorHandler(400, "You can't review your own listing!"));
    }
    if (!(await hasContactedOwner(listing._id, req.user.id))) {
      return next(errorHandler(403, 'You can review a listing after contacting its owner.'));
    }

    const existing = await Review.exists({ listing: listing._id, author: req.user.id });
    const review = await Review.findOneAndUpdate(
      { listing: listing._id, author: req.user.id },
      { rating: req.body.rating, comment: req.body.comment },
      { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true }
    ).populate('author', 'username avatar');

    await updateListingRating(listing._id);
    res.status(existing ? 200 : 201).json(review);
  } catch (error) {
    next(error);
  }
};

export const deleteReview = async (req, res, next) => {
  try {
    const review = await Review.findById(req.params.id);
    if (!review) return next(errorHandler(404, 'Review not found!'));
    if (review.author.toString() !== req.user.id) {
      return next(errorHandler(401, 'You can only delete your own reviews!'));
    }

    await review.deleteOne();
    await updateListingRating(review.listing);
    res.status(200).json('Review has been deleted!');
  } catch (error) {
    next(error);
  }
};

// A landlord's overall rating across all their listings.
export const getOwnerRating = async (req, res, next) => {
  try {
    const listings = await Listing.find({ userRef: req.params.id, ratingCount: { $gt: 0 } }, 'ratingAverage ratingCount');
    const count = listings.reduce((sum, l) => sum + l.ratingCount, 0);
    const total = listings.reduce((sum, l) => sum + l.ratingAverage * l.ratingCount, 0);
    res.status(200).json({ average: count ? Math.round((total / count) * 100) / 100 : 0, count });
  } catch (error) {
    next(error);
  }
};
