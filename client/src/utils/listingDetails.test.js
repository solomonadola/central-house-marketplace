import { describe, expect, it } from 'vitest';
import { amenityLabel, amenityLabels, propertyTypeLabel } from './listingDetails';

describe('listingDetails labels', () => {
  it('labels property types', () => {
    expect(propertyTypeLabel('house')).toBe('House');
    expect(propertyTypeLabel('unknown')).toBe('Apartment');
  });

  it('labels amenities', () => {
    expect(amenityLabel('pets_allowed')).toBe('Pets allowed');
    expect(amenityLabel('mystery')).toBe('mystery');
    expect(amenityLabels(['wifi', 'garden'])).toEqual(['Wi-Fi', 'Garden']);
    expect(amenityLabels()).toEqual([]);
  });
});
