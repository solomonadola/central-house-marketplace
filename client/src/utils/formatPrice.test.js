import { describe, expect, it } from 'vitest';
import { effectivePrice, formatShortPrice } from './formatPrice';

const listing = (regularPrice, offer = false, discountPrice = 0) => ({ regularPrice, offer, discountPrice });

describe('effectivePrice', () => {
  it('uses the discount price only when there is an offer', () => {
    expect(effectivePrice(listing(1000, true, 800))).toBe(800);
    expect(effectivePrice(listing(1000, false, 800))).toBe(1000);
  });
});

describe('formatShortPrice', () => {
  it.each([
    [950, '$950'],
    [2400, '$2,400'],
    [485000, '$485k'],
    [1000000, '$1M'],
    [1250000, '$1.3M'],
  ])('formats %d as %s', (price, expected) => {
    expect(formatShortPrice(listing(price))).toBe(expected);
  });

  it('formats the discounted price', () => {
    expect(formatShortPrice(listing(500000, true, 459000))).toBe('$459k');
  });
});
