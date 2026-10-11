import { amenityLabels, propertyTypeLabel } from './listingDetails';

// Turns a saved search's filters back into a /search query string, matching
// the format the search page itself produces.
export const savedSearchToQuery = (filters = {}) => {
  const params = new URLSearchParams();
  params.set('searchTerm', filters.searchTerm ?? '');
  params.set('type', filters.type ?? 'all');
  params.set('parking', String(Boolean(filters.parking)));
  params.set('furnished', String(Boolean(filters.furnished)));
  params.set('offer', String(Boolean(filters.offer)));
  if (filters.propertyType) params.set('propertyType', filters.propertyType);
  if (Array.isArray(filters.amenities) && filters.amenities.length > 0) {
    params.set('amenities', filters.amenities.join(','));
  }
  for (const key of ['minPrice', 'maxPrice', 'minBedrooms', 'minBathrooms']) {
    const value = filters[key];
    if (value !== null && value !== undefined && value !== '') params.set(key, String(value));
  }
  return params.toString();
};

// Short human summary of a filter set, e.g. "For rent · 2+ beds · under 1500 · Parking".
export const describeFilters = (filters = {}) => {
  const parts = [];

  if (filters.type === 'rent') parts.push('For rent');
  else if (filters.type === 'sale') parts.push('For sale');

  if (filters.propertyType) parts.push(propertyTypeLabel(filters.propertyType));

  if (filters.searchTerm) parts.push(`"${filters.searchTerm}"`);

  const { minPrice, maxPrice } = filters;
  const hasMin = minPrice !== null && minPrice !== undefined && minPrice !== '';
  const hasMax = maxPrice !== null && maxPrice !== undefined && maxPrice !== '';
  if (hasMin && hasMax) parts.push(`${minPrice}–${maxPrice}`);
  else if (hasMin) parts.push(`from ${minPrice}`);
  else if (hasMax) parts.push(`under ${maxPrice}`);

  if (filters.minBedrooms) parts.push(`${filters.minBedrooms}+ beds`);
  if (filters.minBathrooms) parts.push(`${filters.minBathrooms}+ baths`);
  if (filters.furnished) parts.push('Furnished');
  if (filters.parking) parts.push('Parking');
  if (filters.offer) parts.push('Special offer');
  if (Array.isArray(filters.amenities) && filters.amenities.length > 0) {
    parts.push(...amenityLabels(filters.amenities));
  }

  return parts.length ? parts.join(' · ') : 'Any listing';
};
