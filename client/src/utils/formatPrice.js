// The price a buyer pays: the discount price when the listing has an offer.
export const effectivePrice = (listing) => (listing.offer ? listing.discountPrice : listing.regularPrice);

// Compact price for map markers: $950, $2,400, $485k, $1.3M.
export const formatShortPrice = (listing) => {
  const price = effectivePrice(listing);
  if (price >= 1_000_000) return `$${(price / 1_000_000).toFixed(price % 1_000_000 ? 1 : 0)}M`;
  if (price >= 10_000) return `$${Math.round(price / 1000)}k`;
  return `$${price.toLocaleString('en-US')}`;
};
