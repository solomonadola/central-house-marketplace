import { describe, expect, it } from 'vitest';
import { describeFilters, savedSearchToQuery } from './savedSearch';

describe('savedSearchToQuery', () => {
  it('includes only the numeric filters that are set', () => {
    const params = new URLSearchParams(
      savedSearchToQuery({ searchTerm: 'loft', type: 'rent', parking: true, minPrice: 1000, maxPrice: 2000 })
    );

    expect(params.get('searchTerm')).toBe('loft');
    expect(params.get('type')).toBe('rent');
    expect(params.get('parking')).toBe('true');
    expect(params.get('minPrice')).toBe('1000');
    expect(params.get('maxPrice')).toBe('2000');
    expect(params.has('minBedrooms')).toBe(false);
    expect(params.has('minBathrooms')).toBe(false);
  });

  it('defaults the type to all', () => {
    const params = new URLSearchParams(savedSearchToQuery({}));
    expect(params.get('type')).toBe('all');
    expect(params.get('parking')).toBe('false');
  });

  it('includes the property type and amenities', () => {
    const params = new URLSearchParams(savedSearchToQuery({ propertyType: 'house', amenities: ['garden', 'wifi'] }));
    expect(params.get('propertyType')).toBe('house');
    expect(params.get('amenities')).toBe('garden,wifi');
  });
});

describe('describeFilters', () => {
  it('describes an empty filter set', () => {
    expect(describeFilters({})).toBe('Any listing');
  });

  it('describes the type and keyword', () => {
    expect(describeFilters({ type: 'rent', searchTerm: 'loft' })).toBe('For rent · "loft"');
    expect(describeFilters({ type: 'sale' })).toBe('For sale');
  });

  it('describes price ranges', () => {
    expect(describeFilters({ minPrice: 1000, maxPrice: 2000 })).toBe('1000–2000');
    expect(describeFilters({ minPrice: 1000 })).toBe('from 1000');
    expect(describeFilters({ maxPrice: 1500 })).toBe('under 1500');
  });

  it('describes the remaining filters', () => {
    const summary = describeFilters({ type: 'rent', maxPrice: 1500, minBedrooms: 2, parking: true, furnished: true });
    expect(summary).toBe('For rent · under 1500 · 2+ beds · Furnished · Parking');
  });

  it('describes the property type and amenities', () => {
    expect(describeFilters({ propertyType: 'house', amenities: ['garden'] })).toBe('House · Garden');
  });
});
