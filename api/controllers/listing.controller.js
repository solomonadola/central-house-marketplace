import Listing from '../models/listing.model.js';
import User from '../models/user.model.js';
import Review from '../models/review.model.js';
import Viewing from '../models/viewing.model.js';
import { errorHandler } from '../utils/error.js';
import { geocodeAddress } from '../utils/geocode.js';

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
    await User.updateMany({ favorites: listing._id }, { $pull: { favorites: listing._id } });
    await Review.deleteMany({ listing: listing._id });
    await Viewing.deleteMany({ listing: listing._id });
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
    res.status(200).json(updatedListing);
  } catch (error) {
    next(error);
  }
};

export const recordView = async (req, res, next) => {
  try {
    const listing = await Listing.findOneAndUpdate(
      { _id: req.params.id, hidden: { $ne: true } },
      { $inc: { views: 1 } },
      { new: true, projection: { views: 1 } }
    );
    if (!listing) return next(errorHandler(404, 'Listing not found!'));
    res.status(200).json({ views: listing.views });
  } catch (error) {
    next(error);
  }
};

export const getListing = async (req, res, next) => {
  try {
    const listing = await Listing.findById(req.params.id);
    // Hidden listings look missing to everyone but their owner and admins.
    const canSeeHidden = req.user && (req.user.id === listing?.userRef || req.user.role === 'admin');
    if (!listing || (listing.hidden && !canSeeHidden)) {
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

    const filter = {
      hidden: { $ne: true },
      name: { $regex: escapeRegex(searchTerm), $options: 'i' },
      offer: booleanFilter(query.offer),
      furnished: booleanFilter(query.furnished),
      parking: booleanFilter(query.parking),
      type,
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
