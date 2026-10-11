import { describe, expect, it } from 'vitest';
import { formatMoney, paymentStatus } from './paymentStatus';

describe('paymentStatus', () => {
  it('maps known statuses and falls back for unknown ones', () => {
    expect(paymentStatus('paid')).toMatchObject({ label: 'Paid' });
    expect(paymentStatus('refunded').tone).toContain('sky');
    expect(paymentStatus('mystery').label).toBe('mystery');
  });
});

describe('formatMoney', () => {
  it('formats USD with a dollar sign', () => {
    expect(formatMoney(1500)).toBe('$1,500');
  });

  it('appends other currencies as a code', () => {
    expect(formatMoney(1500, 'EUR')).toBe('1,500 EUR');
  });
});
