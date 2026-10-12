import { describe, expect, it } from 'vitest';
import { describeReasons } from './moderation';

describe('describeReasons', () => {
  it('lists the reasons, most common first', () => {
    expect(describeReasons({ offensive: 1, spam: 3 })).toBe('3 × Spam or advertising, 1 × Rude or offensive');
  });

  it('shows unknown reasons as they are', () => {
    expect(describeReasons({ weird: 2 })).toBe('2 × weird');
  });
});
