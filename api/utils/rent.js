// Date maths for monthly rent. Everything works in UTC calendar months so a
// charge's period doesn't shift with the server's time zone. A period is a
// 'YYYY-MM' string, which also sorts chronologically.

const pad = (n) => String(n).padStart(2, '0');

export const periodKey = (date) => {
  const d = new Date(date);
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}`;
};

const parsePeriod = (period) => {
  const [year, month] = period.split('-').map(Number);
  return { year, month };
};

export const nextPeriod = (period) => {
  const { year, month } = parsePeriod(period);
  return month === 12 ? `${year + 1}-01` : `${year}-${pad(month + 1)}`;
};

// The day rent is due in the given month. Due days are capped at 28 when a
// lease is created, so every month has that day.
export const dueDateFor = (period, dueDay) => {
  const { year, month } = parsePeriod(period);
  return new Date(Date.UTC(year, month - 1, dueDay));
};

// Every period a lease has charged so far: from the month it started up to
// and including the current month, stopping at the end date if the lease
// has one. A lease starting in the future has no periods yet.
export const periodsBetween = (startDate, endDate, today = new Date()) => {
  const last = periodKey(endDate && new Date(endDate) < today ? endDate : today);
  const periods = [];
  for (let p = periodKey(startDate); p <= last; p = nextPeriod(p)) {
    periods.push(p);
    // A runaway loop would mean bad input; ten years of rent is plenty.
    if (periods.length > 120) break;
  }
  return periods;
};

const startOfDay = (date) => {
  const d = new Date(date);
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
};

// How a charge looks to the people involved today: settled ('paid' or
// 'waived'), 'overdue' after its due day, or 'due' until then.
export const chargeState = (charge, today = new Date()) => {
  if (charge.status === 'paid' || charge.status === 'waived') return charge.status;
  return startOfDay(today) > startOfDay(charge.dueDate) ? 'overdue' : 'due';
};

// Whole days a charge has been overdue, 0 if it isn't.
export const daysOverdue = (charge, today = new Date()) => {
  if (chargeState(charge, today) !== 'overdue') return 0;
  return Math.round((startOfDay(today) - startOfDay(charge.dueDate)) / (24 * 60 * 60 * 1000));
};

// Totals shown on a lease: what has been charged, paid and waived, what is
// still owed, and the earliest unpaid charge.
export const summarizeCharges = (charges, today = new Date()) => {
  const summary = { charged: 0, paid: 0, waived: 0, balance: 0, overdueCount: 0, overdueAmount: 0, nextDue: null };
  const sorted = [...charges].sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
  sorted.forEach((charge) => {
    summary.charged += charge.amount;
    const state = chargeState(charge, today);
    if (state === 'paid') summary.paid += charge.amount;
    else if (state === 'waived') summary.waived += charge.amount;
    else {
      summary.balance += charge.amount;
      if (state === 'overdue') {
        summary.overdueCount += 1;
        summary.overdueAmount += charge.amount;
      }
      if (!summary.nextDue) {
        summary.nextDue = { period: charge.period, amount: charge.amount, dueDate: charge.dueDate, state };
      }
    }
  });
  return summary;
};

// "October 2026" for '2026-10'.
export const periodLabel = (period) =>
  dueDateFor(period, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' });
