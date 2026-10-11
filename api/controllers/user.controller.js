import bcryptjs from 'bcryptjs';
import User from '../models/user.model.js';
import { errorHandler } from '../utils/error.js';
import Listing from '../models/listing.model.js';
import Conversation from '../models/conversation.model.js';
import Message from '../models/message.model.js';
import Review from '../models/review.model.js';
import { updateListingRating } from '../utils/ratings.js';
import { clearAuthCookie } from '../utils/authCookie.js';

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

    const updatedUser = await User.findByIdAndUpdate(
      req.params.id,
      {
        $set: {
          username: req.body.username,
          email: req.body.email,
          password: req.body.password,
          avatar: req.body.avatar,
        },
      },
      { new: true }
    );

    const { password, ...rest } = updatedUser._doc;

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
    await User.updateMany(
      { favorites: { $in: listingIds } },
      { $pull: { favorites: { $in: listingIds } } }
    );
    // Reviews on the deleted listings go with them; the user's reviews of
    // other listings are removed and those ratings recalculated.
    await Review.deleteMany({ listing: { $in: listingIds } });
    const reviewedListings = await Review.find({ author: req.params.id }).distinct('listing');
    await Review.deleteMany({ author: req.params.id });
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

export const getFavorites = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).populate('favorites');
    if (!user) return next(errorHandler(404, 'User not found!'));
    // populate() leaves null for listings that were deleted.
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
