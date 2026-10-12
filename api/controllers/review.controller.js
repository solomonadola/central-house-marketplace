import Review from '../models/review.model.js';
import Listing from '../models/listing.model.js';
import User from '../models/user.model.js';
import Conversation from '../models/conversation.model.js';
import { errorHandler } from '../utils/error.js';
import { updateListingRating } from '../utils/ratings.js';
import { notifyNewReview } from '../utils/notifications.js';

// Only people who contacted the owner about a listing can review it, so
// every review comes from someone who actually got in touch.
const hasContactedOwner = (listingId, userId) =>
  Conversation.exists({ listing: listingId, buyer: userId });

// The viewer's own review, including one a moderator removed, so they can
// see why it isn't public instead of thinking it was lost.
const ownReview = async (shaped, listingId, userId) => {
  const visible = shaped.find((r) => r.author?._id.toString() === userId);
  if (visible) return visible;
  const removed = await Review.findOne({ listing: listingId, author: userId, removed: true }, '-helpfulBy').populate(
    'author',
    'username avatar'
  );
  return removed ? removed.toObject() : null;
};

export const getListingReviews = async (req, res, next) => {
  try {
    const listing = await Listing.findById(req.params.id, 'userRef ratingAverage ratingCount');
    if (!listing) return next(errorHandler(404, 'Listing not found!'));

    const sortParam = req.query.sort;
    const sort =
      sortParam === 'helpful'
        ? { helpfulCount: -1, createdAt: -1 }
        : sortParam === 'rating_high'
          ? { rating: -1, createdAt: -1 }
          : sortParam === 'rating_low'
            ? { rating: 1, createdAt: -1 }
            : { createdAt: -1 };

    const reviews = await Review.find({ listing: listing._id, removed: { $ne: true } })
      .sort(sort)
      .limit(100)
      .populate('author', 'username avatar');

    // Signed-in users also learn whether they can review, see their own
    // review, and which reviews they've marked helpful.
    const helpfulIds = new Set(
      reviews.filter((r) => r.helpfulBy?.some((u) => u.toString() === req.user?.id)).map((r) => r._id.toString())
    );
    const shaped = reviews.map((r) => ({
      ...r.toObject(),
      helpfulBy: undefined,
      votedHelpful: helpfulIds.has(r._id.toString()),
    }));

    let viewer = null;
    if (req.user) {
      const isOwner = listing.userRef === req.user.id;
      viewer = {
        canReview: !isOwner && Boolean(await hasContactedOwner(listing._id, req.user.id)),
        isOwner,
        ownReview: await ownReview(shaped, listing._id, req.user.id),
      };
    }

    res.status(200).json({
      average: listing.ratingAverage,
      count: listing.ratingCount,
      reviews: shaped,
      viewer,
    });
  } catch (error) {
    next(error);
  }
};

// Creates the user's review of a listing, or updates it if one exists.
export const upsertReview = async (req, res, next) => {
  try {
    const listing = await Listing.findById(req.params.id, 'userRef name');
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

    if (!existing) {
      const author = await User.findById(req.user.id, 'username');
      await notifyNewReview({
        recipient: listing.userRef,
        authorName: author?.username ?? 'Someone',
        rating: review.rating,
        listingName: listing.name,
        listingId: listing._id,
      });
    }

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

// Toggles the caller's "helpful" vote on someone else's review.
export const toggleHelpful = async (req, res, next) => {
  try {
    const review = await Review.findById(req.params.id);
    if (!review) return next(errorHandler(404, 'Review not found!'));
    if (review.author.toString() === req.user.id) {
      return next(errorHandler(400, "You can't mark your own review as helpful."));
    }

    const index = review.helpfulBy.findIndex((u) => u.toString() === req.user.id);
    let voted;
    if (index === -1) {
      review.helpfulBy.push(req.user.id);
      voted = true;
    } else {
      review.helpfulBy.splice(index, 1);
      voted = false;
    }
    review.helpfulCount = review.helpfulBy.length;
    await review.save();

    res.status(200).json({ helpfulCount: review.helpfulCount, voted });
  } catch (error) {
    next(error);
  }
};

// The listing owner's public reply to a review.
export const replyToReview = async (req, res, next) => {
  try {
    const review = await Review.findById(req.params.id);
    if (!review) return next(errorHandler(404, 'Review not found!'));
    const listing = await Listing.findById(review.listing, 'userRef');
    if (!listing) return next(errorHandler(404, 'Listing not found!'));
    if (listing.userRef !== req.user.id) {
      return next(errorHandler(403, 'Only the listing owner can reply to a review.'));
    }

    review.ownerReply = req.body.comment;
    review.ownerRepliedAt = new Date();
    await review.save();
    res.status(200).json(review);
  } catch (error) {
    next(error);
  }
};
