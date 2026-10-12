import Lease from '../models/lease.model.js';
import RentCharge, { rentReference } from '../models/rentCharge.model.js';
import Application from '../models/application.model.js';
import Listing from '../models/listing.model.js';
import User from '../models/user.model.js';
import { errorHandler } from '../utils/error.js';
import { sendCsv, toCsv } from '../utils/csv.js';
import {
  chargeState,
  daysOverdue,
  dueDateFor,
  incomeByPeriod,
  periodLabel,
  periodsBetween,
  nextPeriod,
  periodKey,
  recentPeriods,
  rentForPeriod,
  summarizeCharges,
} from '../utils/rent.js';
import {
  notifyLeaseCreated,
  notifyLeaseEnded,
  notifyLeaseTermsChanged,
  notifyRentPaid,
  notifyRentWaived,
} from '../utils/notifications.js';

const populate = (query) =>
  query
    .populate('listing', 'name address imageUrls')
    .populate('owner', 'username avatar')
    .populate('tenant', 'username avatar');

const idOf = (ref) => (ref?._id ?? ref).toString();

const roleOf = (lease, userId) => {
  if (idOf(lease.owner) === userId) return 'owner';
  if (idOf(lease.tenant) === userId) return 'tenant';
  return null;
};

// Creates the charge for every month the lease has run that doesn't have
// one yet. Upserts keep this safe to call on every read, even from two
// requests at once.
export const syncCharges = async (lease, today = new Date()) => {
  const periods = periodsBetween(lease.startDate, lease.endDate, today);
  if (periods.length === 0) return;
  await RentCharge.bulkWrite(
    periods.map((period) => ({
      updateOne: {
        filter: { lease: lease._id, period },
        update: {
          $setOnInsert: { lease: lease._id, period, amount: rentForPeriod(lease, period), dueDate: dueDateFor(period, lease.dueDay) },
        },
        upsert: true,
      },
    })),
    { ordered: false }
  );
};

const withState = (charge, today) => ({
  ...charge,
  state: chargeState(charge, today),
  daysOverdue: daysOverdue(charge, today),
});

// The lease with its charges (newest first), totals and what the viewer may
// do with it.
const leaseView = async (lease, userId) => {
  const today = new Date();
  // Only active leases gain new months; an ended one keeps what it has.
  if (lease.status === 'active') await syncCharges(lease, today);
  const charges = await RentCharge.find({ lease: lease._id }).sort({ period: -1 }).lean();
  return {
    lease,
    charges: charges.map((c) => withState(c, today)),
    summary: summarizeCharges(charges, today),
    currentRent: rentForPeriod(lease, periodKey(today)),
    viewer: { role: roleOf(lease, userId) },
  };
};

// The owner's approved rental applications that don't have an active lease
// yet, i.e. tenancies they can set up.
export const listLeaseCandidates = async (req, res, next) => {
  try {
    const [applications, leased] = await Promise.all([
      Application.find({ owner: req.user.id, status: 'approved' })
        .sort({ statusChangedAt: -1, _id: -1 })
        .populate('listing', 'name type regularPrice discountPrice offer')
        .populate('applicant', 'username avatar'),
      Lease.find({ owner: req.user.id, status: 'active' }).distinct('application'),
    ]);
    const taken = new Set(leased.map(String));
    const candidates = applications
      .filter((a) => a.listing?.type === 'rent' && !taken.has(a._id.toString()))
      .map((a) => ({
        applicationId: a._id,
        listing: { _id: a.listing._id, name: a.listing.name },
        tenant: a.applicant,
        suggestedRent: a.listing.offer ? a.listing.discountPrice : a.listing.regularPrice,
        moveInDate: a.moveInDate,
      }));
    res.status(200).json(candidates);
  } catch (error) {
    next(error);
  }
};

export const createLease = async (req, res, next) => {
  try {
    const { applicationId, monthlyRent, currency, dueDay, startDate, endDate, notes } = req.body;
    const application = await Application.findById(applicationId, 'listing applicant owner status');
    if (!application || application.owner.toString() !== req.user.id) {
      return next(errorHandler(404, 'Application not found!'));
    }
    if (application.status !== 'approved') {
      return next(errorHandler(409, 'You can set up a lease once the application is approved.'));
    }
    const listing = await Listing.findById(application.listing, 'name type');
    if (!listing || listing.type !== 'rent') {
      return next(errorHandler(409, 'Leases are only for homes listed for rent.'));
    }
    if (await Lease.exists({ application: application._id, status: 'active' })) {
      return next(errorHandler(409, 'This tenancy already has an active lease.'));
    }

    const lease = await Lease.create({
      listing: listing._id,
      owner: req.user.id,
      tenant: application.applicant,
      application: application._id,
      monthlyRent,
      currency,
      dueDay,
      startDate,
      endDate: endDate ?? null,
      notes,
    });

    const owner = await User.findById(req.user.id, 'username');
    await notifyLeaseCreated({
      recipient: application.applicant,
      ownerName: owner?.username ?? 'Your landlord',
      listingName: listing.name,
      monthlyRent,
      currency,
      leaseId: lease._id,
    });

    res.status(201).json(await leaseView(await populate(Lease.findById(lease._id)), req.user.id));
  } catch (error) {
    if (error.code === 11000) return next(errorHandler(409, 'This tenancy already has an active lease.'));
    next(error);
  }
};

// Leases the user rents (?as=tenant, default) or lets out (?as=owner), with
// each one's balance so the list can flag overdue rent.
export const listLeases = async (req, res, next) => {
  try {
    const field = req.query.as === 'owner' ? 'owner' : 'tenant';
    const filter = { [field]: req.user.id };
    if (req.query.status === 'active' || req.query.status === 'ended') filter.status = req.query.status;

    const leases = await populate(Lease.find(filter).sort({ status: 1, startDate: -1, _id: -1 }).limit(100));
    const today = new Date();
    await Promise.all(leases.filter((l) => l.status === 'active').map((l) => syncCharges(l, today)));
    const charges = await RentCharge.find({ lease: { $in: leases.map((l) => l._id) } }).lean();

    res.status(200).json(
      leases.map((lease) => ({
        ...lease.toObject(),
        currentRent: rentForPeriod(lease, periodKey(today)),
        summary: summarizeCharges(
          charges.filter((c) => c.lease.toString() === lease._id.toString()),
          today
        ),
      }))
    );
  } catch (error) {
    next(error);
  }
};

const MAX_INCOME_MONTHS = 24;

// The owner's rent across all their leases: expected and collected per month
// for the last ?months= months (6 by default), and what tenants owe now.
export const getIncome = async (req, res, next) => {
  try {
    const months = Math.min(Math.max(Number.parseInt(req.query.months, 10) || 6, 1), MAX_INCOME_MONTHS);
    const today = new Date();
    const periods = recentPeriods(months, today);

    const leases = await Lease.find({ owner: req.user.id });
    await Promise.all(leases.filter((l) => l.status === 'active').map((l) => syncCharges(l, today)));
    const charges = await RentCharge.find({ lease: { $in: leases.map((l) => l._id) } }).lean();

    const outstanding = summarizeCharges(charges, today);
    const byMonth = incomeByPeriod(charges, periods);
    res.status(200).json({
      months: byMonth,
      totals: {
        activeLeases: leases.filter((l) => l.status === 'active').length,
        expected: byMonth.reduce((sum, m) => sum + m.expected, 0),
        collected: byMonth.reduce((sum, m) => sum + m.collected, 0),
        outstanding: outstanding.balance,
        overdue: outstanding.overdueAmount,
        overdueCount: outstanding.overdueCount,
      },
    });
  } catch (error) {
    next(error);
  }
};

const loadLease = async (req, next, role) => {
  const lease = await populate(Lease.findById(req.params.id));
  const viewerRole = lease && roleOf(lease, req.user.id);
  if (!viewerRole || (role && viewerRole !== role)) {
    next(errorHandler(404, 'Lease not found!'));
    return null;
  }
  return lease;
};

export const getLease = async (req, res, next) => {
  try {
    const lease = await loadLease(req, next);
    if (!lease) return;
    res.status(200).json(await leaseView(lease, req.user.id));
  } catch (error) {
    next(error);
  }
};

const loadUnpaidCharge = async (req, lease, next) => {
  const charge = await RentCharge.findOne({ _id: req.params.chargeId, lease: lease._id });
  if (!charge) {
    next(errorHandler(404, 'Charge not found!'));
    return null;
  }
  if (charge.status !== 'unpaid') {
    next(errorHandler(409, `This month's rent is already ${charge.status}.`));
    return null;
  }
  return charge;
};

// The tenant pays a month's rent in the app. Like holding deposits this is
// simulated: a real provider would confirm the charge before it's marked paid.
export const payCharge = async (req, res, next) => {
  try {
    const lease = await loadLease(req, next, 'tenant');
    if (!lease) return;
    const charge = await loadUnpaidCharge(req, lease, next);
    if (!charge) return;

    Object.assign(charge, {
      status: 'paid',
      method: 'online',
      reference: rentReference(),
      paidAt: new Date(),
      settledBy: req.user.id,
    });
    await charge.save();

    await notifyRentPaid({
      recipient: lease.owner._id,
      tenantName: lease.tenant.username,
      amount: charge.amount,
      currency: lease.currency,
      periodLabel: periodLabel(charge.period),
      leaseId: lease._id,
    });
    res.status(200).json(await leaseView(lease, req.user.id));
  } catch (error) {
    next(error);
  }
};

// The owner records rent received outside the app (cash, bank transfer...).
export const recordPayment = async (req, res, next) => {
  try {
    const lease = await loadLease(req, next, 'owner');
    if (!lease) return;
    const charge = await loadUnpaidCharge(req, lease, next);
    if (!charge) return;

    Object.assign(charge, {
      status: 'paid',
      method: req.body.method,
      note: req.body.note,
      paidAt: new Date(),
      settledBy: req.user.id,
    });
    await charge.save();
    res.status(200).json(await leaseView(lease, req.user.id));
  } catch (error) {
    next(error);
  }
};

// The owner lets a month's rent go, e.g. after a repair took too long.
export const waiveCharge = async (req, res, next) => {
  try {
    const lease = await loadLease(req, next, 'owner');
    if (!lease) return;
    const charge = await loadUnpaidCharge(req, lease, next);
    if (!charge) return;

    Object.assign(charge, { status: 'waived', note: req.body.note, settledBy: req.user.id });
    await charge.save();

    await notifyRentWaived({
      recipient: lease.tenant._id,
      amount: charge.amount,
      currency: lease.currency,
      periodLabel: periodLabel(charge.period),
      leaseId: lease._id,
    });
    res.status(200).json(await leaseView(lease, req.user.id));
  } catch (error) {
    next(error);
  }
};

// Ends a lease on the given day (today by default). Months after that day
// that were never paid are dropped; anything already owed stays owed.
export const endLease = async (req, res, next) => {
  try {
    const lease = await loadLease(req, next, 'owner');
    if (!lease) return;
    if (lease.status === 'ended') return next(errorHandler(409, 'This lease has already ended.'));

    const endDate = req.body.endDate ?? new Date();
    if (endDate < lease.startDate) {
      return next(errorHandler(400, 'The end date must be after the start date'));
    }

    // Charge everything up to the end date before closing the books.
    await syncCharges(lease);
    await RentCharge.deleteMany({ lease: lease._id, status: 'unpaid', dueDate: { $gt: endDate } });

    Object.assign(lease, { status: 'ended', endDate, endedAt: new Date() });
    await lease.save();

    await notifyLeaseEnded({
      recipient: lease.tenant._id,
      listingName: lease.listing?.name ?? 'your home',
      endDate,
      leaseId: lease._id,
    });
    res.status(200).json(await leaseView(lease, req.user.id));
  } catch (error) {
    next(error);
  }
};

// The owner schedules a rent change and/or moves the end date. A change
// must start next month or later, so months already charged never change.
export const changeTerms = async (req, res, next) => {
  try {
    const lease = await loadLease(req, next, 'owner');
    if (!lease) return;
    if (lease.status !== 'active') return next(errorHandler(409, 'This lease has ended.'));

    const { monthlyRent, effectiveFrom, endDate } = req.body;
    const today = new Date();
    const changes = {};

    if (monthlyRent !== undefined) {
      const firstAllowed = nextPeriod(periodKey(today));
      if (effectiveFrom < firstAllowed) {
        return next(errorHandler(400, 'A rent change can start next month at the earliest.'));
      }
      if (lease.endDate && effectiveFrom > periodKey(lease.endDate) && !endDate) {
        return next(errorHandler(400, 'That month is after the lease ends.'));
      }
      // A newer change for the same month replaces the old one.
      lease.rentChanges = [
        ...lease.rentChanges.filter((c) => c.effectiveFrom !== effectiveFrom),
        { amount: monthlyRent, effectiveFrom },
      ];
      changes.rent = { amount: monthlyRent, effectiveFrom };
    }

    if (endDate !== undefined) {
      if (endDate <= today || endDate <= lease.startDate) {
        return next(errorHandler(400, 'The new end date must be in the future.'));
      }
      lease.endDate = endDate;
      changes.endDate = endDate;
    }

    await lease.save();
    await notifyLeaseTermsChanged({
      recipient: lease.tenant._id,
      listingName: lease.listing?.name ?? 'your home',
      currency: lease.currency,
      ...changes,
      leaseId: lease._id,
    });
    res.status(200).json(await leaseView(lease, req.user.id));
  } catch (error) {
    next(error);
  }
};

const isoDay = (date) => (date ? new Date(date).toISOString().slice(0, 10) : '');

const CSV_COLUMNS = [
  { label: 'Month', value: (c) => c.period },
  { label: 'Due date', value: (c) => isoDay(c.dueDate) },
  { label: 'Amount', value: (c) => c.amount },
  { label: 'Status', value: (c) => c.state },
  { label: 'Method', value: (c) => c.method ?? '' },
  { label: 'Reference', value: (c) => c.reference ?? '' },
  { label: 'Paid on', value: (c) => isoDay(c.paidAt) },
  { label: 'Note', value: (c) => c.note },
];

// A rent ledger both sides can keep for their records or taxes.
export const exportLedger = async (req, res, next) => {
  try {
    const lease = await loadLease(req, next);
    if (!lease) return;
    const { charges } = await leaseView(lease, req.user.id);
    const rows = [...charges].sort((a, b) => a.period.localeCompare(b.period));
    sendCsv(res, `rent-ledger-${lease._id}.csv`, toCsv(CSV_COLUMNS, rows));
  } catch (error) {
    next(error);
  }
};
