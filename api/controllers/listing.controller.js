import Listing from '../models/listing.model.js';
import User from '../models/user.model.js';
import Review from '../models/review.model.js';
import Viewing from '../models/viewing.model.js';
import AvailabilitySlot from '../models/availabilitySlot.model.js';
import Application from '../models/application.model.js';
import Payment from '../models/payment.model.js';
import ListingViewDay, { utcDay } from '../models/listingViewDay.model.js';
import mongoose from 'mongoose';
import { errorHandler } from '../utils/error.js';
import { geocodeAddress } from '../utils/geocode.js';
import { notifyListingDeleted } from '../utils/notifications.js';
import { notifySavedSearchMatches } from '../utils/savedSearch.js';
import { AMENITIES, PROPERTY_TYPES } from '../constants/listing.js';
import PriceChange from '../models/priceChange.model.js';
import ListingQuestion from '../models/listingQuestion.model.js';
import { dropFromPeak, recordInitialPrice, recordPriceChange } from '../utils/priceHistory.js';

// Fields a client may set. Ownership (userRef) is always taken from the
// auth token so users can't create or transfer listings as someone else.
const EDITABLE_FIELDS = [
  'name',
  'description',
  'address',
  'regularPrice',
  'discountPrice',
  'bathrooms',
  'bedrooms',
  'furnished',
  'parking',
  'type',
  'offer',
  'propertyType',
  'amenities',
  'imageUrls',
];

const pickEditable = (body) =>
  Object.fromEntries(
    EDITABLE_FIELDS.filter((key) => key in body).map((key) => [key, body[key]])
  );

export const createListing = async (req, res, next) => {
  try {
    const fields = pickEditable(req.body);
    const location = await geocodeAddress(fields.address);
    const listing = await Listing.create({
      ...fields,
      ...(location && { location }),
      userRef: req.user.id,
    });
    await notifySavedSearchMatches(listing);
    await recordInitialPrice(listing);
    return res.status(201).json(listing);
  } catch (error) {
    next(error);
  }
};

export const deleteListing = async (req, res, next) => {
  try {
    const listing = await Listing.findById(req.params.id);

    if (!listing) {
      return next(errorHandler(404, 'Listing not found!'));
    }

    if (req.user.id !== listing.userRef) {
      return next(errorHandler(401, 'You can only delete your own listings!'));
    }

    await Listing.findByIdAndDelete(req.params.id);
    // Let everyone who saved it know before removing it from their favorites.
    const favoriters = await User.find({ favorites: listing._id }, '_id');
    await Promise.all(favoriters.map((u) => notifyListingDeleted({ recipient: u._id, listingName: listing.name })));
    await User.updateMany({ favorites: listing._id }, { $pull: { favorites: listing._id } });
    await Review.deleteMany({ listing: listing._id });
    await Viewing.deleteMany({ listing: listing._id });
    await AvailabilitySlot.deleteMany({ listing: listing._id });
    await Application.deleteMany({ listing: listing._id });
    await Payment.deleteMany({ listing: listing._id });
    await ListingViewDay.deleteMany({ listing: listing._id });
    await PriceChange.deleteMany({ listing: listing._id });
    await ListingQuestion.deleteMany({ listing: listing._id });
    res.status(200).json('Listing has been deleted!');
  } catch (error) {
    next(error);
  }
};

export const updateListing = async (req, res, next) => {
  try {
    const listing = await Listing.findById(req.params.id);
    if (!listing) {
      return next(errorHandler(404, 'Listing not found!'));
    }
    if (req.user.id !== listing.userRef) {
      return next(errorHandler(401, 'You can only update your own listings!'));
    }

    const update = { $set: pickEditable(req.body) };
    // Re-geocode only when the address changes. If the new address can't
    // be found, drop the old coordinates rather than keep a wrong pin.
    if (update.$set.address !== undefined && update.$set.address !== listing.address) {
      const location = await geocodeAddress(update.$set.address);
      if (location) update.$set.location = location;
      else update.$unset = { location: 1 };
    }

    const updatedListing = await Listing.findByIdAndUpdate(req.params.id, update, {
      new: true,
      runValidators: true,
    });
    await recordPriceChange(listing, updatedListing);
    res.status(200).json(updatedListing);
  } catch (error) {
    next(error);
  }
};

// Pauses or reactivates one of the owner's listings.
export const setListingActive = async (req, res, next) => {
  try {
    const listing = await Listing.findById(req.params.id);
    if (!listing) return next(errorHandler(404, 'Listing not found!'));
    if (req.user.id !== listing.userRef) {
      return next(errorHandler(401, 'You can only pause your own listings!'));
    }
    listing.active = req.body.active;
    await listing.save();
    res.status(200).json(listing);
  } catch (error) {
    next(error);
  }
};

const COPYABLE_FIELDS = [
  'description',
  'address',
  'regularPrice',
  'discountPrice',
  'bathrooms',
  'bedrooms',
  'furnished',
  'parking',
  'type',
  'offer',
  'propertyType',
  'amenities',
  'imageUrls',
  'location',
];

// Clones one of the owner's listings as an unpublished draft they can tweak
// and publish. View counts, ratings and moderation state are not copied.
export const duplicateListing = async (req, res, next) => {
  try {
    const source = await Listing.findById(req.params.id);
    if (!source) return next(errorHandler(404, 'Listing not found!'));
    if (req.user.id !== source.userRef) {
      return next(errorHandler(401, 'You can only duplicate your own listings!'));
    }

    const copy = Object.fromEntries(COPYABLE_FIELDS.map((key) => [key, source[key]]));
    const listing = await Listing.create({
      ...copy,
      name: `${source.name.slice(0, 55)} (copy)`,
      userRef: req.user.id,
      active: false,
    });
    res.status(201).json(listing);
  } catch (error) {
    next(error);
  }
};

export const recordView = async (req, res, next) => {  try {
    const listing = await Listing.findOneAndUpdate(
      { _id: req.params.id, hidden: { $ne: true }, active: { $ne: false } },
      { $inc: { views: 1 } },
      { new: true, projection: { views: 1 } }
    );
    if (!listing) return next(errorHandler(404, 'Listing not found!'));
    await ListingViewDay.updateOne(
      { listing: listing._id, day: utcDay() },
      { $inc: { count: 1 } },
      { upsert: true }
    );
    res.status(200).json({ views: listing.views });
  } catch (error) {
    next(error);
  }
};

export const getListing = async (req, res, next) => {
  try {
    const listing = await Listing.findById(req.params.id);
    // Hidden or paused listings look missing to everyone but their owner
    // and admins.
    const canSeeRestricted = req.user && (req.user.id === listing?.userRef || req.user.role === 'admin');
    if (!listing || ((listing.hidden || listing.active === false) && !canSeeRestricted)) {
      return next(errorHandler(404, 'Listing not found!'));
    }
    res.status(200).json(listing);
  } catch (error) {
    next(error);
  }
};

// Only these values are accepted from the query string. Anything else
// (including objects like ?type[$ne]=x) falls back to the default.
const SORT_FIELDS = ['createdAt', 'regularPrice'];
const MAX_LIMIT = 50;

const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Boolean filters: 'true' restricts to true, anything else means "either".
const booleanFilter = (value) => (value === 'true' ? true : { $in: [false, true] });

const toInt = (value, fallback, min, max) => {
  const n = Number.parseInt(value, 10);
  if (Number.isNaN(n)) return fallback;
  return Math.min(Math.max(n, min), max);
};

// Optional numeric filter: undefined unless the value is a non-negative number.
const optionalNumber = (value) => {
  if (typeof value !== 'string' || value.trim() === '') return undefined;
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : undefined;
};

// The price a buyer actually pays: the discount price when there's an offer.
const EFFECTIVE_PRICE = { $cond: ['$offer', '$discountPrice', '$regularPrice'] };

const priceFilter = (min, max) => {
  const conditions = [];
  if (min !== undefined) conditions.push({ $gte: [EFFECTIVE_PRICE, min] });
  if (max !== undefined) conditions.push({ $lte: [EFFECTIVE_PRICE, max] });
  return conditions.length ? { $expr: { $and: conditions } } : {};
};

export const getListings = async (req, res, next) => {
  try {
    const { query } = req;

    const limit = toInt(query.limit, 9, 1, MAX_LIMIT);
    const startIndex = toInt(query.startIndex, 0, 0, Number.MAX_SAFE_INTEGER);

    const type = ['rent', 'sale'].includes(query.type) ? query.type : { $in: ['sale', 'rent'] };

    const searchTerm = typeof query.searchTerm === 'string' ? query.searchTerm.slice(0, 100) : '';

    const sort = SORT_FIELDS.includes(query.sort) ? query.sort : 'createdAt';
    const order = query.order === 'asc' ? 'asc' : 'desc';

    const minBedrooms = optionalNumber(query.minBedrooms);
    const minBathrooms = optionalNumber(query.minBathrooms);

    const propertyType = PROPERTY_TYPES.includes(query.propertyType) ? query.propertyType : undefined;
    const amenities =
      typeof query.amenities === 'string'
        ? query.amenities
            .split(',')
            .map((id) => id.trim())
            .filter((id) => AMENITIES.includes(id))
        : [];

    const filter = {
      hidden: { $ne: true },
      active: { $ne: false },
      name: { $regex: escapeRegex(searchTerm), $options: 'i' },
      offer: booleanFilter(query.offer),
      furnished: booleanFilter(query.furnished),
      parking: booleanFilter(query.parking),
      type,
      ...(propertyType && { propertyType }),
      ...(amenities.length > 0 && { amenities: { $all: amenities } }),
      ...(minBedrooms !== undefined && { bedrooms: { $gte: minBedrooms } }),
      ...(minBathrooms !== undefined && { bathrooms: { $gte: minBathrooms } }),
      ...priceFilter(optionalNumber(query.minPrice), optionalNumber(query.maxPrice)),
    };

    const [listings, total] = await Promise.all([
      Listing.find(filter).sort({ [sort]: order }).limit(limit).skip(startIndex),
      Listing.countDocuments(filter),
    ]);

    // The body stays a plain array; the total is for pagination UIs.
    res.set('X-Total-Count', String(total));
    return res.status(200).json(listings);
  } catch (error) {
    next(error);
  }
};

// Up to four listings by id, in the order requested, for the comparison
// page. Hidden or missing listings are silently dropped.
const MAX_COMPARE = 4;

const fetchListingsByIds = async (rawIds, max) => {
  const ids = String(rawIds ?? '')
    .split(',')
    .map((id) => id.trim())
    .filter((id) => mongoose.isValidObjectId(id))
    .slice(0, max);

  if (ids.length === 0) return [];

  const listings = await Listing.find({ _id: { $in: ids }, hidden: { $ne: true }, active: { $ne: false } });
  const byId = Object.fromEntries(listings.map((l) => [l._id.toString(), l]));

  // Preserve the caller's order.
  return ids.map((id) => byId[id]).filter(Boolean);
};

export const getListingsByIds = async (req, res, next) => {
  try {
    res.status(200).json(await fetchListingsByIds(req.query.ids, MAX_COMPARE));
  } catch (error) {
    next(error);
  }
};

// Recently viewed listings, in the order the client saw them (up to 12).
const MAX_RECENT = 12;

export const getListingsByRecentIds = async (req, res, next) => {
  try {
    res.status(200).json(await fetchListingsByIds(req.query.ids, MAX_RECENT));
  } catch (error) {
    next(error);
  }
};

// Up to four listings similar to one listing: same rent/sale type, closest
// in price, preferring the same property type.
const MAX_SIMILAR = 4;

export const getSimilarListings = async (req, res, next) => {
  try {
    const listing = await Listing.findById(req.params.id, 'type propertyType regularPrice discountPrice offer');
    if (!listing) return next(errorHandler(404, 'Listing not found!'));

    const price = listing.offer ? listing.discountPrice : listing.regularPrice;
    const effective = (l) => (l.offer ? l.discountPrice : l.regularPrice);

    const candidates = await Listing.find({
      _id: { $ne: listing._id },
      hidden: { $ne: true },
      active: { $ne: false },
      type: listing.type,
    })
      .sort({ ratingAverage: -1 })
      .limit(50)
      .lean();

    candidates.sort((a, b) => {
      const sameTypeA = a.propertyType === listing.propertyType ? 0 : 1;
      const sameTypeB = b.propertyType === listing.propertyType ? 0 : 1;
      if (sameTypeA !== sameTypeB) return sameTypeA - sameTypeB;
      return Math.abs(effective(a) - price) - Math.abs(effective(b) - price);
    });

    res.status(200).json(candidates.slice(0, MAX_SIMILAR));
  } catch (error) {
    next(error);
  }
};

// A listing's price history, newest first, with how far it has dropped from
// its highest price. Hidden and paused listings follow the same visibility
// rules as the listing page.
export const getPriceHistory = async (req, res, next) => {
  try {
    const listing = await Listing.findById(req.params.id, 'userRef hidden active');
    const canSeeHidden = req.user && (req.user.id === listing?.userRef || req.user.role === 'admin');
    if (!listing || ((listing.hidden || listing.active === false) && !canSeeHidden)) {
      return next(errorHandler(404, 'Listing not found!'));
    }

    const history = await PriceChange.find({ listing: listing._id }).sort({ createdAt: -1, _id: -1 }).limit(50).lean();
    res.status(200).json({ history, dropFromPeak: dropFromPeak(history) });
  } catch (error) {
    next(error);
  }
};
