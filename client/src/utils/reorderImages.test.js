import { describe, expect, it } from 'vitest';
import { makeCover, moveImage, removeImageAt } from './reorderImages';

describe('reorderImages', () => {
  it('moves an image up and down', () => {
    const images = ['a', 'b', 'c'];
    expect(moveImage(images, 1, 'up')).toEqual(['b', 'a', 'c']);
    expect(moveImage(images, 1, 'down')).toEqual(['a', 'c', 'b']);
  });

  it('does nothing at the ends', () => {
    expect(moveImage(['a', 'b'], 0, 'up')).toEqual(['a', 'b']);
    expect(moveImage(['a', 'b'], 1, 'down')).toEqual(['a', 'b']);
  });

  it('promotes an image to the cover', () => {
    expect(makeCover(['a', 'b', 'c', 'd'], 2)).toEqual(['c', 'a', 'b', 'd']);
  });

  it('leaves the cover alone when already first', () => {
    expect(makeCover(['a', 'b'], 0)).toEqual(['a', 'b']);
  });

  it('removes an image by index', () => {
    expect(removeImageAt(['a', 'b', 'c'], 1)).toEqual(['a', 'c']);
  });
});
