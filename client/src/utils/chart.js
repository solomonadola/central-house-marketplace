// Rounds up to a clean axis maximum: 1, 2, 5 or 10 times a power of ten.
export const niceMax = (value) => {
  if (value <= 0) return 1;
  const power = 10 ** Math.floor(Math.log10(value));
  const step = [1, 2, 5, 10].find((m) => m * power >= value);
  return step * power;
};
