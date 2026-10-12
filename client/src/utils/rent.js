// Labels and styles for leases and rent charges. Mirrors the statuses and
// methods in api/models/rentCharge.model.js.
export const CHARGE_STATES = {
  paid: { label: 'Paid', tone: 'bg-green-50 text-green-800 ring-green-200' },
  waived: { label: 'Waived', tone: 'bg-slate-100 text-slate-700 ring-slate-200' },
  due: { label: 'Due', tone: 'bg-amber-50 text-amber-800 ring-amber-200' },
  overdue: { label: 'Overdue', tone: 'bg-red-50 text-red-800 ring-red-200' },
};

export const chargeStateInfo = (state) => CHARGE_STATES[state] ?? { label: state, tone: CHARGE_STATES.waived.tone };

export const METHOD_LABELS = {
  online: 'Paid online',
  bank_transfer: 'Bank transfer',
  cash: 'Cash',
  check: 'Check',
  other: 'Other',
};

// Methods an owner can record by hand; 'online' only comes from the tenant.
export const RECORDABLE_METHODS = ['bank_transfer', 'cash', 'check', 'other'];

// "October 2026" for '2026-10'.
export const periodLabel = (period) => {
  const [year, month] = period.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, 1)).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
};

// 1st, 2nd, 3rd, 4th ... 21st, 22nd, 23rd, 28th.
export const ordinal = (n) => {
  const tens = n % 100;
  if (tens >= 11 && tens <= 13) return `${n}th`;
  return `${n}${{ 1: 'st', 2: 'nd', 3: 'rd' }[n % 10] ?? 'th'}`;
};

// Dates on leases are calendar days stored at UTC midnight, so they're
// shown in UTC to avoid slipping a day in western time zones.
export const formatLeaseDate = (date) =>
  date ? new Date(date).toLocaleDateString('en-US', { dateStyle: 'medium', timeZone: 'UTC' }) : '';

// 'YYYY-MM-DD' for <input type="date">.
export const toDateInput = (date) => new Date(date).toISOString().slice(0, 10);
