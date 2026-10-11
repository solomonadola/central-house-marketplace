import { describe, expect, it } from 'vitest';
import { attributeValue, buildComparisonRows, differingAttributes } from './compare';
import { makeListing } from '../test/utils';

describe('attributeValue', () => {
  it('formats the price with the rent suffix', () => {
    expect(attributeValue(makeListing({ regularPrice: 1200, type: 'rent' }), 'price')).toBe('$1,200 / month');
    expect(attributeValue(makeListing({ regularPrice: 250000, type: 'sale' }), 'price')).toBe('$250,000');
  });

  it('uses the discount price when there is an offer', () => {
    const listing = makeListing({ offer: true, regularPrice: 2000, discountPrice: 1500 });
    expect(attributeValue(listing, 'price')).toBe('$1,500 / month');
    expect(attributeValue(listing, 'offer')).toBe('Yes (save $500)');
  });

  it('summarises the rating', () => {
    expect(attributeValue(makeListing({ ratingCount: 0 }), 'rating')).toBe('No reviews');
    expect(attributeValue(makeListing({ ratingAverage: 4.5, ratingCount: 3 }), 'rating')).toBe('4.5 (3)');
  });

  it('handles a missing listing', () => {
    expect(attributeValue(null, 'price')).toBe('—');
  });
});

describe('buildComparisonRows', () => {
  it('has one row per attribute and one value per listing', () => {
    const rows = buildComparisonRows([makeListing({ _id: 'a' }), makeListing({ _id: 'b' })]);
    expect(rows.every((row) => row.values.length === 2)).toBe(true);
    expect(rows.map((row) => row.label)).toContain('Price');
  });
});

describe('differingAttributes', () => {
  it('flags attributes whose values differ', () => {
    const listings = [makeListing({ _id: 'a', bedrooms: 2 }), makeListing({ _id: 'b', bedrooms: 3 })];
    const differing = differingAttributes(listings);
    expect(differing.has('bedrooms')).toBe(true);
    expect(differing.has('parking')).toBe(false);
  });
});
