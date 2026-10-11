import { beforeEach, describe, expect, it } from 'vitest';
import { clearRecentlyViewed, MAX_RECENTLY_VIEWED, recordRecentlyViewed } from './useRecentlyViewed';

const stored = () => JSON.parse(localStorage.getItem('recentlyViewed') || '[]');

describe('recently viewed storage', () => {
  beforeEach(() => localStorage.clear());

  it('records ids newest first', () => {
    recordRecentlyViewed('a');
    recordRecentlyViewed('b');

    expect(stored()).toEqual(['b', 'a']);
  });

  it('moves a repeat view to the front without duplicating', () => {
    recordRecentlyViewed('a');
    recordRecentlyViewed('b');
    recordRecentlyViewed('a');

    expect(stored()).toEqual(['a', 'b']);
  });

  it(`keeps at most ${MAX_RECENTLY_VIEWED} ids`, () => {
    for (let i = 0; i < MAX_RECENTLY_VIEWED + 5; i += 1) recordRecentlyViewed(`id-${i}`);

    expect(stored()).toHaveLength(MAX_RECENTLY_VIEWED);
    expect(stored()[0]).toBe(`id-${MAX_RECENTLY_VIEWED + 4}`);
  });

  it('ignores empty ids and tolerates bad stored data', () => {
    recordRecentlyViewed('');
    expect(stored()).toEqual([]);

    localStorage.setItem('recentlyViewed', 'not json');
    recordRecentlyViewed('a');
    expect(stored()).toEqual(['a']);
  });

  it('clears the history', () => {
    recordRecentlyViewed('a');
    clearRecentlyViewed();
    expect(stored()).toEqual([]);
  });
});
