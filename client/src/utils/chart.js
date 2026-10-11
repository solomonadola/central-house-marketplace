// Rounds up to a clean axis maximum (e.g. 56 -> 60, 37 -> 40, 120 -> 150)
// whose half is also a clean tick.
const NICE_STEPS = [1, 1.2, 1.6, 2, 3, 4, 5, 6, 8, 10];

export const niceMax = (value) => {
  if (value <= 0) return 1;
  const power = 10 ** Math.floor(Math.log10(value));
  const step = NICE_STEPS.find((m) => m * power >= value);
  return Math.round(step * power * 1000) / 1000;
};
