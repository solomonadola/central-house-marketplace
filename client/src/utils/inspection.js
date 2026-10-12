// Labels for inspection reports. Mirrors api/models/inspection.model.js and
// the conditions in api/utils/inspections.js.
export const KIND_LABELS = { move_in: 'Move-in report', move_out: 'Move-out report' };

export const CONDITIONS = ['good', 'fair', 'poor', 'damaged', 'na'];

export const CONDITION_LABELS = {
  good: 'Good',
  fair: 'Fair',
  poor: 'Poor',
  damaged: 'Damaged',
  na: 'Not applicable',
};

export const CONDITION_TONES = {
  good: 'text-green-700',
  fair: 'text-amber-700',
  poor: 'text-orange-700',
  damaged: 'text-red-700',
  na: 'text-slate-500',
};

export const INSPECTION_STATUS = {
  draft: { label: 'Draft', tone: 'bg-slate-100 text-slate-700 ring-slate-200' },
  submitted: { label: 'Waiting for tenant', tone: 'bg-amber-50 text-amber-800 ring-amber-200' },
  disputed: { label: 'Disputed', tone: 'bg-red-50 text-red-800 ring-red-200' },
  signed: { label: 'Signed', tone: 'bg-green-50 text-green-800 ring-green-200' },
};

export const CHANGE_LABELS = {
  worse: 'Worse',
  better: 'Better',
  same: 'No change',
  new: 'Not in move-in report',
  unrated: 'Not rated',
};

// Counts of each condition across all rooms, e.g. for a summary line.
export const conditionCounts = (rooms) => {
  const counts = Object.fromEntries(CONDITIONS.map((c) => [c, 0]));
  rooms.forEach((room) => room.items.forEach((item) => (counts[item.condition] += 1)));
  return counts;
};
