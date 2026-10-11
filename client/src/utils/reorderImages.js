// Helpers for reordering a listing's photo array. All return a new array so
// they can feed straight into setState.

export const moveImage = (images, index, direction) => {
  const target = index + (direction === 'up' ? -1 : 1);
  if (target < 0 || target >= images.length) return images;
  const next = [...images];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
};

export const makeCover = (images, index) => {
  if (index <= 0 || index >= images.length) return images;
  return [images[index], ...images.slice(0, index), ...images.slice(index + 1)];
};

export const removeImageAt = (images, index) => images.filter((_, i) => i !== index);
