import { describe, expect, it } from 'vitest';
import { conditionCounts } from './inspection';

describe('conditionCounts', () => {
  it('counts items in each condition across rooms', () => {
    const rooms = [
      { name: 'Kitchen', items: [{ condition: 'good' }, { condition: 'poor' }] },
      { name: 'Bathroom', items: [{ condition: 'good' }, { condition: 'na' }] },
      { name: 'Empty', items: [] },
    ];
    expect(conditionCounts(rooms)).toEqual({ good: 2, fair: 0, poor: 1, damaged: 0, na: 1 });
  });
});
