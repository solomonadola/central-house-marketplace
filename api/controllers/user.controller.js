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
import { updateListingRating } from '../utils/ratings.js';
import { clearAuthCookie, setAuthCookie } from '../utils/authCookie.js';
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
    await User.findByIdAndDelete(req.params.id);
    const listingIds = await Listing.find({ userRef: req.params.id }).distinct('_id');
    await Listing.deleteMany({ _id: { $in: listingIds } });
    await ListingViewDay.deleteMany({ listing: { $in: listingIds } });
    await PriceChange.deleteMany({ listing: { $in: listingIds } });
    await User.updateMany(
      { favorites: { $in: listingIds } },
      { $pull: { favorites: { $in: listingIds } } }
    );
    // Reviews on the deleted listings go with them; the user's reviews of
    // other listings are removed and those ratings recalculated.
    await Review.deleteMany({ listing: { $in: listingIds } });
    const reviewedListings = await Review.find({ author: req.params.id }).distinct('listing');
    await Review.deleteMany({ author: req.params.id });
    await Report.deleteMany({ reporter: req.params.id });
    await Viewing.deleteMany({ $or: [{ requester: req.params.id }, { owner: req.params.id }] });
    await AvailabilitySlot.deleteMany({ owner: req.params.id });
    await Application.deleteMany({ $or: [{ applicant: req.params.id }, { owner: req.params.id }] });
    await Payment.deleteMany({ $or: [{ payer: req.params.id }, { payee: req.params.id }] });
    await Notification.deleteMany({ recipient: req.params.id });
    await Promise.all(reviewedListings.map(updateListingRating));
    const conversationIds = await Conversation.find({ 'participants.user': req.params.id }).distinct('_id');
    await Message.deleteMany({ conversation: { $in: conversationIds } });
    await Conversation.deleteMany({ _id: { $in: conversationIds } });
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
