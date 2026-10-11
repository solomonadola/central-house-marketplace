import SavedSearch from '../models/savedSearch.model.js';
import { notifySavedSearchMatch } from './notifications.js';

// The price a buyer actually pays: the discount price when there's an offer.
export const effectivePrice = (listing) =>
  listing.offer ? listing.discountPrice : listing.regularPrice;

const has = (value) => value !== null && value !== undefined && value !== '';

// Pure matcher mirroring the /api/listing/get filters. Kept in JS so the
// same rules can be tested without a database and reused when alerting.
export const listingMatchesFilters = (listing, filters = {}) => {
  if (!listing || listing.hidden || listing.active === false) return false;

  const { searchTerm, type, parking, furnished, offer, propertyType, amenities } = filters;
  const { minPrice, maxPrice, minBedrooms, minBathrooms } = filters;

  if (searchTerm && !String(listing.name ?? '').toLowerCase().includes(String(searchTerm).toLowerCase())) {
    return false;
  }
  if (type && type !== 'all' && listing.type !== type) return false;
  if (propertyType && listing.propertyType !== propertyType) return false;
  if (Array.isArray(amenities) && amenities.length > 0) {
    const have = new Set(listing.amenities ?? []);
    if (!amenities.every((amenity) => have.has(amenity))) return false;
  }
  if (parking && !listing.parking) return false;
  if (furnished && !listing.furnished) return false;
  if (offer && !listing.offer) return false;

  const price = effectivePrice(listing);
  if (has(minPrice) && price < minPrice) return false;
  if (has(maxPrice) && price > maxPrice) return false;
  if (has(minBedrooms) && (listing.bedrooms ?? 0) < minBedrooms) return false;
  if (has(minBathrooms) && (listing.bathrooms ?? 0) < minBathrooms) return false;

  return true;
};

// Alerts everyone whose enabled saved search matches a newly listed home,
// except the owner (who obviously knows about their own listing). Never
// throws: alerting must not break listing creation.
export const notifySavedSearchMatches = async (listing) => {
  try {
    if (!listing || listing.hidden) return 0;

    const searches = await SavedSearch.find({
      alertsEnabled: true,
      user: { $ne: listing.userRef },
    });

    const matching = searches.filter((search) => listingMatchesFilters(listing, search.filters));
    if (matching.length === 0) return 0;

    await Promise.all(
      matching.map((search) =>
        notifySavedSearchMatch({
          recipients: [search.user],
          listingId: listing._id,
          listingName: listing.name,
          savedSearchId: search._id,
        })
      )
    );

    await SavedSearch.updateMany(
      { _id: { $in: matching.map((s) => s._id) } },
      { lastNotifiedAt: new Date() }
    );

    return matching.length;
  } catch (error) {
    console.error('Failed to notify saved search matches:', error.message);
    return 0;
  }
};
