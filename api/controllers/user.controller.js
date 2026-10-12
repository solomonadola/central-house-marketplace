import bcryptjs from 'bcryptjs';
import User from '../models/user.model.js';
import { errorHandler } from '../utils/error.js';
import Listing from '../models/listing.model.js';
import Conversation from '../models/conversation.model.js';
import Message from '../models/message.model.js';
import Review from '../models/review.model.js';
import Report from '../models/report.model.js';
import Viewing from '../models/viewing.model.js';
import Application from '../models/application.model.js';
import Payment from '../models/payment.model.js';
import AvailabilitySlot from '../models/availabilitySlot.model.js';
import Notification from '../models/notification.model.js';
import ListingViewDay from '../models/listingViewDay.model.js';
import PriceChange from '../models/priceChange.model.js';
import ListingQuestion from '../models/listingQuestion.model.js';
import OpenHouse from '../models/openHouse.model.js';
import MaintenanceRequest from '../models/maintenanceRequest.model.js';
import QuickReply from '../models/quickReply.model.js';
import ListingDraft from '../models/listingDraft.model.js';
import { removeLeases } from '../utils/leases.js';
import ContentFlag from '../models/contentFlag.model.js';
import { updateListingRating } from '../utils/ratings.js';
import { clearAuthCookie, setAuthCookie } from '../utils/authCookie.js';
import { getResponseStats } from '../utils/responseStats.js';
import { sendVerificationEmail } from '../utils/emailVerification.js';

export const test = (req, res) => {
  res.json({
    message: 'Api route is working!',
  });
};

export const updateUser = async (req, res, next) => {
  if (req.user.id !== req.params.id)
    return next(errorHandler(401, 'You can only update your own account!'));
  try {
    if (req.body.password) {
      req.body.password = bcryptjs.hashSync(req.body.password, 10);
    }

    const current = await User.findById(req.params.id, 'email');
    if (!current) return next(errorHandler(404, 'User not found!'));
    // A new address has to be confirmed again.
    const emailChanged = req.body.email !== undefined && req.body.email !== current.email;

    const updatedUser = await User.findByIdAndUpdate(
      req.params.id,
      {
        $set: {
          username: req.body.username,
          email: req.body.email,
          password: req.body.password,
          avatar: req.body.avatar,
          ...(emailChanged && { emailVerified: false }),
        },
        // A new password signs out other devices; this one gets a new cookie below.
        ...(req.body.password && { $inc: { tokenVersion: 1 } }),
      },
      { new: true }
    ).select('+tokenVersion');
    if (emailChanged) await sendVerificationEmail(updatedUser);

    if (req.body.password) setAuthCookie(res, updatedUser);

    const { password, tokenVersion, ...rest } = updatedUser._doc;

    res.status(200).json(rest);
  } catch (error) {
    next(error);
  }
};

export const deleteUser = async (req, res, next) => {
  if (req.user.id !== req.params.id)
    return next(errorHandler(401, 'You can only delete your own account!'));
  try {
    const userId = req.params.id;
    await User.findByIdAndDelete(userId);

    // Look up what the cleanup depends on before deleting anything.
    const [listingIds, reviewedListings, conversationIds] = await Promise.all([
      Listing.find({ userRef: userId }).distinct('_id'),
      // Listings this user reviewed, whose ratings change once the reviews go.
      Review.find({ author: userId }).distinct('listing'),
      Conversation.find({ 'participants.user': userId }).distinct('_id'),
    ]);
    const onTheirListings = { listing: { $in: listingIds } };

    // Everything below is independent, so it runs in parallel.
    await Promise.all([
      Listing.deleteMany({ _id: { $in: listingIds } }),
      ListingViewDay.deleteMany(onTheirListings),
      PriceChange.deleteMany(onTheirListings),
      OpenHouse.deleteMany(onTheirListings),
      // Questions on their listings, and questions they asked elsewhere.
      ListingQuestion.deleteMany({ $or: [onTheirListings, { asker: userId }] }),
      OpenHouse.updateMany({ 'rsvps.user': userId }, { $pull: { rsvps: { user: userId } } }),
      MaintenanceRequest.deleteMany({ $or: [{ tenant: userId }, { owner: userId }] }),
      removeLeases({ $or: [{ tenant: userId }, { owner: userId }] }),
      User.updateMany({ favorites: { $in: listingIds } }, { $pull: { favorites: { $in: listingIds } } }),
      // Reviews on their listings, and reviews they wrote elsewhere.
      Review.deleteMany({ $or: [onTheirListings, { author: userId }] }),
      Report.deleteMany({ reporter: userId }),
      ContentFlag.deleteMany({ $or: [onTheirListings, { reporter: userId }] }),
      Viewing.deleteMany({ $or: [{ requester: userId }, { owner: userId }] }),
      AvailabilitySlot.deleteMany({ owner: userId }),
      Application.deleteMany({ $or: [{ applicant: userId }, { owner: userId }] }),
      Payment.deleteMany({ $or: [{ payer: userId }, { payee: userId }] }),
      Notification.deleteMany({ recipient: userId }),
      User.updateMany({ blockedUsers: userId }, { $pull: { blockedUsers: userId } }),
      QuickReply.deleteMany({ owner: userId }),
      ListingDraft.deleteMany({ owner: userId }),
      Message.deleteMany({ conversation: { $in: conversationIds } }),
      Conversation.deleteMany({ _id: { $in: conversationIds } }),
    ]);

    await Promise.all(reviewedListings.map(updateListingRating));
    clearAuthCookie(res);
    res.status(200).json('User has been deleted!');
  } catch (error) {
    next(error);
  }
};

export const getUserListings = async (req, res, next) => {
  if (req.user.id === req.params.id) {
    try {
      const listings = await Listing.find({ userRef: req.params.id });
      res.status(200).json(listings);
    } catch (error) {
      next(error);
    }
  } else {
    return next(errorHandler(401, 'You can only view your own listings!'));
  }
};

export const getUser = async (req, res, next) => {
  try {
    
    const user = await User.findById(req.params.id);
  
    if (!user) return next(errorHandler(404, 'User not found!'));
  
    // Other users can call this, so leave out private fields. Contact
    // happens through in-app messages, so others don't need the email.
    const { password: pass, favorites, email, ...rest } = user._doc;
    const isSelf = req.user.id === req.params.id;

    res.status(200).json(isSelf ? { ...rest, email } : rest);
  } catch (error) {
    next(error);
  }
};

// Public profile for an owner: who they are, their rating and their active
// listings. No auth required, so it can be linked to from a listing.
export const getPublicProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id, 'username avatar role createdAt');
    if (!user) return next(errorHandler(404, 'User not found!'));

    const listings = await Listing.find(
      { userRef: req.params.id, hidden: { $ne: true }, active: { $ne: false } },
      'name imageUrls address regularPrice discountPrice offer bedrooms bathrooms parking furnished type ratingAverage ratingCount views createdAt'
    )
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    const rated = listings.filter((l) => l.ratingCount > 0);
    const reviewCount = rated.reduce((sum, l) => sum + l.ratingCount, 0);
    const reviewTotal = rated.reduce((sum, l) => sum + l.ratingAverage * l.ratingCount, 0);

    res.status(200).json({
      user: {
        _id: user._id,
        username: user.username,
        avatar: user.avatar,
        role: user.role,
        memberSince: user.createdAt,
      },
      rating: {
        average: reviewCount ? Math.round((reviewTotal / reviewCount) * 100) / 100 : 0,
        count: reviewCount,
      },
      listingCount: listings.length,
      listings,
    });
  } catch (error) {
    next(error);
  }
};

export const getFavorites = async (req, res, next) => {  try {
    const user = await User.findById(req.user.id).populate({
      path: 'favorites',
      match: { hidden: { $ne: true }, active: { $ne: false } },
    });
    if (!user) return next(errorHandler(404, 'User not found!'));
    // populate() leaves null for listings that were deleted or are hidden.
    res.status(200).json(user.favorites.filter(Boolean));
  } catch (error) {
    next(error);
  }
};

export const addFavorite = async (req, res, next) => {
  try {
    const listingExists = await Listing.exists({ _id: req.params.id });
    if (!listingExists) return next(errorHandler(404, 'Listing not found!'));

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { $addToSet: { favorites: req.params.id } },
      { new: true }
    );
    if (!user) return next(errorHandler(404, 'User not found!'));
    res.status(200).json({ favorites: user.favorites });
  } catch (error) {
    next(error);
  }
};

export const removeFavorite = async (req, res, next) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.user.id,
      { $pull: { favorites: req.params.id } },
      { new: true }
    );
    if (!user) return next(errorHandler(404, 'User not found!'));
    res.status(200).json({ favorites: user.favorites });
  } catch (error) {
    next(error);
  }
};

const PREFERENCE_FIELDS = ['emailNotifications', 'marketingEmails'];

export const getPreferences = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id, PREFERENCE_FIELDS.join(' '));
    if (!user) return next(errorHandler(404, 'User not found!'));
    res.status(200).json({
      emailNotifications: user.emailNotifications,
      marketingEmails: user.marketingEmails,
    });
  } catch (error) {
    next(error);
  }
};

export const updatePreferences = async (req, res, next) => {
  try {
    const update = Object.fromEntries(
      PREFERENCE_FIELDS.filter((field) => req.body[field] !== undefined).map((field) => [field, req.body[field]])
    );
    const user = await User.findByIdAndUpdate(req.user.id, update, { new: true, runValidators: true }).select(
      PREFERENCE_FIELDS.join(' ')
    );
    if (!user) return next(errorHandler(404, 'User not found!'));
    res.status(200).json({
      emailNotifications: user.emailNotifications,
      marketingEmails: user.marketingEmails,
    });
  } catch (error) {
    next(error);
  }
};

// Turns two-step sign-in on or off. Requires the current password, so a
// borrowed session can't quietly weaken the account.
export const setTwoFactor = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return next(errorHandler(404, 'User not found!'));
    if (!bcryptjs.compareSync(req.body.password, user.password)) {
      return next(errorHandler(401, 'Wrong password!'));
    }
    if (req.body.enabled && !user.emailVerified) {
      return next(errorHandler(400, 'Confirm your email address before turning on two-step sign-in.'));
    }
    user.twoFactorEnabled = req.body.enabled;
    await user.save();
    res.status(200).json({ twoFactorEnabled: user.twoFactorEnabled });
  } catch (error) {
    next(error);
  }
};

// Public: how quickly an owner tends to reply to enquiries.
export const getOwnerResponseStats = async (req, res, next) => {
  try {
    const owner = await User.exists({ _id: req.params.id });
    if (!owner) return next(errorHandler(404, 'User not found!'));
    res.status(200).json({ stats: await getResponseStats(req.params.id) });
  } catch (error) {
    next(error);
  }
};
