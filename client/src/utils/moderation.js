// Why someone flagged a review or question. Mirrors FLAG_REASONS in
// api/models/contentFlag.model.js.
export const FLAG_REASONS = {
  spam: 'Spam or advertising',
  offensive: 'Rude or offensive',
  off_topic: 'Not about this home',
  personal_info: 'Shares personal information',
  other: 'Something else',
};

// "2 × Spam or advertising, 1 × Rude or offensive", most common first.
export const describeReasons = (counts) =>
  Object.entries(counts)
    .sort(([, a], [, b]) => b - a)
    .map(([reason, n]) => `${n} × ${FLAG_REASONS[reason] ?? reason}`)
    .join(', ');
