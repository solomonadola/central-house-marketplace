import Lease from '../models/lease.model.js';
import RentCharge from '../models/rentCharge.model.js';
import { syncCharges } from '../controllers/lease.controller.js';
import { notify } from './notifications.js';
import { periodLabel } from './rent.js';

const DAY = 24 * 60 * 60 * 1000;
export const UPCOMING_DAYS = 3;

// Each reminder a month's rent can get, latest stage first. A charge that is
// already 8 days late when first checked only gets the 7-day reminder; the
// earlier ones are skipped rather than sent all at once.
const STAGES = [
  { key: 'overdue_7', applies: (days) => days <= -7 },
  { key: 'overdue_1', applies: (days) => days <= -1 },
  { key: 'upcoming', applies: (days) => days >= 0 && days <= UPCOMING_DAYS },
];

const startOfDay = (date) => {
  const d = new Date(date);
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
};

// Whole days until the charge is due; negative once it's late.
export const daysUntilDue = (charge, today) => Math.round((startOfDay(charge.dueDate) - startOfDay(today)) / DAY);

// The reminder to send for an unpaid charge today, or null. Returns the
// stage key and every key to record as sent, so skipped earlier stages are
// never sent later.
export const reminderFor = (charge, today = new Date()) => {
  if (charge.status !== 'unpaid') return null;
  const sent = new Set(charge.remindersSent ?? []);
  const days = daysUntilDue(charge, today);
  const index = STAGES.findIndex((stage) => stage.applies(days));
  if (index === -1 || sent.has(STAGES[index].key)) return null;
  return { key: STAGES[index].key, days, markSent: STAGES.slice(index).map((s) => s.key) };
};

const money = (amount, currency) =>
  currency === 'USD' ? `$${amount.toLocaleString('en-US')}` : `${amount.toLocaleString('en-US')} ${currency}`;

const message = (key, days, charge, lease) => {
  const month = periodLabel(charge.period);
  const amount = money(charge.amount, lease.currency);
  if (key === 'upcoming') {
    return {
      title: days === 0 ? `Rent for ${month} is due today` : `Rent for ${month} is due in ${days} ${days === 1 ? 'day' : 'days'}`,
      body: `${amount} for "${lease.listing?.name ?? 'your home'}"`,
    };
  }
  return {
    title: `Rent for ${month} is ${-days} ${days === -1 ? 'day' : 'days'} late`,
    body: `${amount} is still owed for "${lease.listing?.name ?? 'your home'}"`,
  };
};

// Reminds tenants about rent that is due soon or late. Safe to run as often
// as you like: each reminder is recorded on the charge and only sent once.
// Charges only exist from the first day of their month, so rent due on the
// 1st–3rd gets its "upcoming" reminder on the 1st at the earliest.
export const sendRentReminders = async (today = new Date()) => {
  const leases = await Lease.find({ status: 'active' }).populate('listing', 'name');
  await Promise.all(leases.map((lease) => syncCharges(lease, today)));
  const byId = new Map(leases.map((l) => [l._id.toString(), l]));

  const charges = await RentCharge.find({ lease: { $in: leases.map((l) => l._id) }, status: 'unpaid' });
  let sent = 0;
  for (const charge of charges) {
    const reminder = reminderFor(charge, today);
    if (!reminder) continue;
    const lease = byId.get(charge.lease.toString());
    // Claim the reminder first so two runs at once can't both send it.
    const claimed = await RentCharge.updateOne(
      { _id: charge._id, remindersSent: { $ne: reminder.key } },
      { $addToSet: { remindersSent: { $each: reminder.markSent } } }
    );
    if (claimed.modifiedCount === 0) continue;

    await notify({
      recipient: lease.tenant,
      type: 'rent_reminder',
      ...message(reminder.key, reminder.days, charge, lease),
      link: `/leases/${lease._id}`,
      meta: { leaseId: lease._id, chargeId: charge._id, stage: reminder.key },
      email: true,
    });
    sent += 1;
  }
  return { checked: charges.length, sent };
};

// Runs the reminders once a day inside the API process, for deployments
// without a separate scheduler. Errors are logged, never thrown.
export const startDailyRentReminders = (intervalMs = DAY) => {
  const run = () =>
    sendRentReminders()
      .then(({ sent }) => sent > 0 && console.log(`Sent ${sent} rent reminder(s).`))
      .catch((error) => console.error('Rent reminders failed:', error.message));
  run();
  return setInterval(run, intervalMs);
};
