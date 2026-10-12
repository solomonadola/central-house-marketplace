import { describe, expect, it } from 'vitest';
import {
  chargeState,
  daysOverdue,
  dueDateFor,
  nextPeriod,
  periodKey,
  periodLabel,
  periodsBetween,
  summarizeCharges,
} from '../utils/rent.js';

const day = (iso) => new Date(`${iso}T12:00:00Z`);

describe('periods', () => {
  it('keys dates by UTC month', () => {
    expect(periodKey(day('2026-03-15'))).toBe('2026-03');
    expect(periodKey(new Date('2026-03-31T23:30:00Z'))).toBe('2026-03');
  });

  it('steps to the next month across a year end', () => {
    expect(nextPeriod('2026-11')).toBe('2026-12');
    expect(nextPeriod('2026-12')).toBe('2027-01');
  });

  it('puts the due date on the due day of the month', () => {
    expect(dueDateFor('2026-02', 28).toISOString()).toBe('2026-02-28T00:00:00.000Z');
    expect(dueDateFor('2026-10', 1).toISOString()).toBe('2026-10-01T00:00:00.000Z');
  });

  it('labels a period with its month name', () => {
    expect(periodLabel('2026-10')).toBe('October 2026');
  });
});

describe('periodsBetween', () => {
  it('lists every month from the start up to this month', () => {
    expect(periodsBetween(day('2026-08-20'), null, day('2026-10-12'))).toEqual(['2026-08', '2026-09', '2026-10']);
  });

  it('stops at the end date', () => {
    expect(periodsBetween(day('2026-01-01'), day('2026-03-31'), day('2026-10-12'))).toEqual([
      '2026-01',
      '2026-02',
      '2026-03',
    ]);
  });

  it('ignores an end date that is still in the future', () => {
    expect(periodsBetween(day('2026-09-01'), day('2027-08-31'), day('2026-10-12'))).toEqual(['2026-09', '2026-10']);
  });

  it('returns nothing for a lease that starts later', () => {
    expect(periodsBetween(day('2026-12-01'), null, day('2026-10-12'))).toEqual([]);
  });

  it('caps the number of periods', () => {
    expect(periodsBetween(day('2000-01-01'), null, day('2026-10-12'))).toHaveLength(121);
  });
});

describe('charge states', () => {
  const charge = (overrides) => ({ amount: 1000, status: 'unpaid', dueDate: day('2026-10-05'), period: '2026-10', ...overrides });

  it('is due up to and including the due day', () => {
    expect(chargeState(charge(), day('2026-10-01'))).toBe('due');
    expect(chargeState(charge(), new Date('2026-10-05T23:59:00Z'))).toBe('due');
  });

  it('is overdue from the day after', () => {
    expect(chargeState(charge(), day('2026-10-06'))).toBe('overdue');
    expect(daysOverdue(charge(), day('2026-10-12'))).toBe(7);
  });

  it('keeps paid and waived charges settled', () => {
    expect(chargeState(charge({ status: 'paid' }), day('2027-01-01'))).toBe('paid');
    expect(chargeState(charge({ status: 'waived' }), day('2027-01-01'))).toBe('waived');
    expect(daysOverdue(charge({ status: 'paid' }), day('2027-01-01'))).toBe(0);
  });
});

describe('summarizeCharges', () => {
  it('totals what was charged, paid, waived and owed', () => {
    const charges = [
      { period: '2026-10', amount: 1200, status: 'unpaid', dueDate: day('2026-10-05') },
      { period: '2026-08', amount: 1200, status: 'paid', dueDate: day('2026-08-05') },
      { period: '2026-09', amount: 1200, status: 'unpaid', dueDate: day('2026-09-05') },
      { period: '2026-07', amount: 600, status: 'waived', dueDate: day('2026-07-05') },
    ];

    expect(summarizeCharges(charges, day('2026-10-03'))).toEqual({
      charged: 4200,
      paid: 1200,
      waived: 600,
      balance: 2400,
      overdueCount: 1,
      overdueAmount: 1200,
      nextDue: { period: '2026-09', amount: 1200, dueDate: day('2026-09-05'), state: 'overdue' },
    });
  });

  it('has nothing due when everything is settled', () => {
    const summary = summarizeCharges([{ period: '2026-10', amount: 900, status: 'paid', dueDate: day('2026-10-01') }]);
    expect(summary).toMatchObject({ balance: 0, overdueCount: 0, nextDue: null });
  });
});
