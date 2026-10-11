import { describe, expect, it } from 'vitest';
import { applicationStatus, describeApplication, isOpen } from './applicationStatus';

describe('applicationStatus', () => {
  it('maps known statuses to labels and tones', () => {
    expect(applicationStatus('approved')).toMatchObject({ label: 'Approved' });
    expect(applicationStatus('withdrawn').tone).toContain('slate');
  });

  it('falls back for unknown statuses', () => {
    expect(applicationStatus('mystery').label).toBe('mystery');
  });

  it('knows which statuses are still open', () => {
    expect(isOpen('submitted')).toBe(true);
    expect(isOpen('under_review')).toBe(true);
    expect(isOpen('approved')).toBe(false);
    expect(isOpen('rejected')).toBe(false);
  });
});

describe('describeApplication', () => {
  it('summarises occupants, income and move-in date', () => {
    const summary = describeApplication({ occupants: 2, income: 90000, moveInDate: '2030-06-01T00:00:00Z' });
    expect(summary).toContain('2 occupants');
    expect(summary).toContain('$90,000 income');
    expect(summary).toContain('move in');
  });

  it('handles a single occupant and no extras', () => {
    expect(describeApplication({ occupants: 1 })).toBe('1 occupant');
  });
});
