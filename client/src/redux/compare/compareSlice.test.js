import { describe, expect, it } from 'vitest';
import reducer, { clearCompare, MAX_COMPARE, removeFromCompare, toggleCompare } from './compareSlice';

const state = (ids) => ({ ids });

describe('compareSlice', () => {
  it('adds and removes an id on toggle', () => {
    let next = reducer(state([]), toggleCompare('a'));
    expect(next.ids).toEqual(['a']);

    next = reducer(next, toggleCompare('a'));
    expect(next.ids).toEqual([]);
  });

  it(`keeps at most ${MAX_COMPARE} ids`, () => {
    let next = state([]);
    for (const id of ['a', 'b', 'c', 'd', 'e']) next = reducer(next, toggleCompare(id));
    expect(next.ids).toEqual(['a', 'b', 'c', 'd']);
  });

  it('removes a specific id', () => {
    const next = reducer(state(['a', 'b', 'c']), removeFromCompare('b'));
    expect(next.ids).toEqual(['a', 'c']);
  });

  it('clears everything', () => {
    expect(reducer(state(['a', 'b']), clearCompare()).ids).toEqual([]);
  });
});
