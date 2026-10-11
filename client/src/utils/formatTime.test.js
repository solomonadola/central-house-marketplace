import { describe, expect, it } from 'vitest';
import { formatShortTime, formatTimeOfDay } from './formatTime';

// A Wednesday.
const now = new Date('2026-10-14T12:00:00');
const ago = (ms) => new Date(now - ms);

describe('formatShortTime', () => {
  it.each([
    [ago(20 * 1000), 'just now'],
    [ago(5 * 60 * 1000), '5m'],
    [ago(3 * 60 * 60 * 1000), '3h'],
    [new Date('2026-10-12T09:00:00'), 'Mon'],
    [new Date('2026-10-03T09:00:00'), 'Oct 3'],
    [new Date('2025-12-25T09:00:00'), 'Dec 25, 2025'],
  ])('formats %s as %s', (date, expected) => {
    expect(formatShortTime(date, now)).toBe(expected);
  });

  it('accepts ISO strings', () => {
    expect(formatShortTime(ago(2 * 60 * 1000).toISOString(), now)).toBe('2m');
  });
});

describe('formatTimeOfDay', () => {
  it('formats hours and minutes', () => {
    expect(formatTimeOfDay(new Date('2026-10-14T15:05:00'))).toBe('3:05 PM');
  });
});
