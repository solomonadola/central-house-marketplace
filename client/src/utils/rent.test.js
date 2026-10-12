import { describe, expect, it } from 'vitest';
import { chargeStateInfo, formatLeaseDate, ordinal, periodLabel, toDateInput, upcomingPeriods } from './rent';

describe('rent helpers', () => {
  it('labels periods with the month name', () => {
    expect(periodLabel('2026-10')).toBe('October 2026');
    expect(periodLabel('2027-01')).toBe('January 2027');
  });

  it.each([
    [1, '1st'],
    [2, '2nd'],
    [3, '3rd'],
    [4, '4th'],
    [11, '11th'],
    [12, '12th'],
    [13, '13th'],
    [21, '21st'],
    [22, '22nd'],
    [28, '28th'],
  ])('writes %i as %s', (n, expected) => {
    expect(ordinal(n)).toBe(expected);
  });

  it('shows lease dates as calendar days in UTC', () => {
    expect(formatLeaseDate('2026-03-01T00:00:00.000Z')).toBe('Mar 1, 2026');
    expect(formatLeaseDate(null)).toBe('');
  });

  it('formats dates for date inputs', () => {
    expect(toDateInput('2026-03-01T00:00:00.000Z')).toBe('2026-03-01');
  });

  it('falls back for unknown charge states', () => {
    expect(chargeStateInfo('overdue').label).toBe('Overdue');
    expect(chargeStateInfo('mystery').label).toBe('mystery');
  });

  it('lists the coming months, starting next month', () => {
    expect(upcomingPeriods(3, new Date('2026-11-20T12:00:00Z'))).toEqual(['2026-12', '2027-01', '2027-02']);
  });
});
