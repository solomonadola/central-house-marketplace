import { describe, expect, it } from 'vitest';
import { describeAttendance, formatOpenHouseTime, toLocalInputValue } from './openHouseTime';

describe('formatOpenHouseTime', () => {
  it('shows one date for same-day events', () => {
    expect(formatOpenHouseTime(new Date(2026, 9, 17, 10, 0), new Date(2026, 9, 17, 12, 30))).toBe(
      'Sat, Oct 17 · 10:00 AM – 12:30 PM'
    );
  });

  it('shows both dates when the event crosses midnight', () => {
    expect(formatOpenHouseTime(new Date(2026, 9, 17, 22, 0), new Date(2026, 9, 18, 1, 0))).toBe(
      'Sat, Oct 17 10:00 PM – Sun, Oct 18 1:00 AM'
    );
  });
});

describe('describeAttendance', () => {
  it.each([
    [{ rsvpCount: 3, capacity: 0, isFull: false }, '3 going'],
    [{ rsvpCount: 3, capacity: 10, isFull: false }, '3 of 10 going'],
    [{ rsvpCount: 10, capacity: 10, isFull: true }, 'Full'],
  ])('describes %o as %s', (openHouse, expected) => {
    expect(describeAttendance(openHouse)).toBe(expected);
  });
});

describe('toLocalInputValue', () => {
  it('formats a date for a datetime-local input', () => {
    expect(toLocalInputValue(new Date(2026, 0, 5, 9, 7))).toBe('2026-01-05T09:07');
  });
});
