// The attributes shown in the side-by-side comparison table, in order.
export const COMPARE_ATTRIBUTES = [
  'price',
  'type',
  'bedrooms',
  'bathrooms',
  'parking',
  'furnished',
  'offer',
  'rating',
  'address',
];

const ATTRIBUTE_LABELS = {
  price: 'Price',
  type: 'Listing type',
  bedrooms: 'Bedrooms',
  bathrooms: 'Bathrooms',
  parking: 'Parking',
  furnished: 'Furnished',
  offer: 'Special offer',
  rating: 'Rating',
  address: 'Address',
};

const yesNo = (value) => (value ? 'Yes' : 'No');

// A single attribute of a listing, formatted for display.
export const attributeValue = (listing, attribute) => {
  if (!listing) return '—';

  switch (attribute) {
    case 'price': {
      const price = listing.offer ? listing.discountPrice : listing.regularPrice;
      return `$${price.toLocaleString('en-US')}${listing.type === 'rent' ? ' / month' : ''}`;
    }
    case 'type':
      return listing.type === 'rent' ? 'For rent' : 'For sale';
    case 'bedrooms':
      return String(listing.bedrooms);
    case 'bathrooms':
      return String(listing.bathrooms);
    case 'parking':
      return yesNo(listing.parking);
    case 'furnished':
      return yesNo(listing.furnished);
    case 'offer':
      return listing.offer
        ? `Yes (save $${(listing.regularPrice - listing.discountPrice).toLocaleString('en-US')})`
        : 'No';
    case 'rating':
      return listing.ratingCount > 0 ? `${listing.ratingAverage.toFixed(1)} (${listing.ratingCount})` : 'No reviews';
    case 'address':
      return listing.address;
    default:
      return '—';
  }
};

// One row per attribute, with a value for each listing, ready for the table.
export const buildComparisonRows = (listings) =>
  COMPARE_ATTRIBUTES.map((attribute) => ({
    attribute,
    label: ATTRIBUTE_LABELS[attribute],
    values: listings.map((listing) => attributeValue(listing, attribute)),
  }));

// The attribute where the listings differ, used to highlight differences.
export const differingAttributes = (listings) =>
  new Set(
    COMPARE_ATTRIBUTES.filter((attribute) => {
      const values = listings.map((listing) => attributeValue(listing, attribute));
      return new Set(values).size > 1;
    })
  );
