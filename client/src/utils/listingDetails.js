// Human labels for listing property types and amenities. Kept in step with
// the API's constants/listing.js.
export const PROPERTY_TYPE_OPTIONS = [
  ['apartment', 'Apartment'],
  ['house', 'House'],
  ['studio', 'Studio'],
  ['room', 'Room'],
  ['land', 'Land'],
];

export const AMENITY_OPTIONS = [
  ['wifi', 'Wi-Fi'],
  ['air_conditioning', 'Air conditioning'],
  ['heating', 'Heating'],
  ['washing_machine', 'Washing machine'],
  ['dishwasher', 'Dishwasher'],
  ['garden', 'Garden'],
  ['balcony', 'Balcony'],
  ['pool', 'Pool'],
  ['gym', 'Gym'],
  ['elevator', 'Elevator'],
  ['fireplace', 'Fireplace'],
  ['pets_allowed', 'Pets allowed'],
  ['parking_garage', 'Garage parking'],
  ['furnished_kitchen', 'Furnished kitchen'],
];

const labelMap = (options) => Object.fromEntries(options);

export const propertyTypeLabel = (value) => labelMap(PROPERTY_TYPE_OPTIONS)[value] ?? 'Apartment';

export const amenityLabel = (value) => labelMap(AMENITY_OPTIONS)[value] ?? value;

export const amenityLabels = (values = []) => values.map(amenityLabel);
