import Listing from '../models/listing.model.js';
import { effectivePrice } from './priceHistory.js';
import { median } from './responseStats.js';

export const MIN_COMPARABLES = 3;
export const RADIUS_KM = 5;
const MAX_CANDIDATES = 300;

// Great-circle distance between two { lat, lng } points, in kilometres.
export const distanceKm = (a, b) => {
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
};

// How a listing's price compares with similar public listings: same
// rent/sale type and bedroom count, and within 5 km when both have a
// location. Returns null with fewer than 3 comparable homes.
export const comparePrice = async (listing) => {
  const candidates = await Listing.find(
    {
      _id: { $ne: listing._id },
      type: listing.type,
      bedrooms: listing.bedrooms,
      hidden: { $ne: true },
      active: { $ne: false },
    },
    'regularPrice discountPrice offer location'
  )
    .limit(MAX_CANDIDATES)
    .lean();

  const nearby = listing.location
    ? candidates.filter((c) => c.location && distanceKm(listing.location, c.location) <= RADIUS_KM)
    : candidates;
  if (nearby.length < MIN_COMPARABLES) return null;

  const typical = median(nearby.map(effectivePrice));
  const price = effectivePrice(listing);
  return {
    comparables: nearby.length,
    medianPrice: Math.round(typical),
    // Positive: more expensive than similar homes; negative: cheaper.
    percentDifference: Math.round(((price - typical) / typical) * 100),
    nearbyOnly: Boolean(listing.location),
  };
};
