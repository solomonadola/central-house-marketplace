import mongoose from 'mongoose';
import User from '../models/user.model.js';
import Listing from '../models/listing.model.js';
import Report from '../models/report.model.js';
import Review from '../models/review.model.js';
import Conversation from '../models/conversation.model.js';
import Message from '../models/message.model.js';
import Application from '../models/application.model.js';
import Payment from '../models/payment.model.js';
import AuditLog from '../models/auditLog.model.js';
import { errorHandler } from '../utils/error.js';
import { sendCsv, toCsv } from '../utils/csv.js';
import { notifyAccountStatus, notifyListingModerated } from '../utils/notifications.js';
import { notifySavedSearchMatches } from '../utils/savedSearch.js';
import { recordAudit } from '../utils/auditLog.js';

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export const getStats = async (req, res, next) => {
  try {
    const weekAgo = new Date(Date.now() - WEEK_MS);
    const [
      users,
      newUsers,
      suspendedUsers,
      listings,
      newListings,
      hiddenListings,
      openReports,
      reviews,
      conversations,
      messages,
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ createdAt: { $gte: weekAgo } }),
      User.countDocuments({ suspended: true }),
      Listing.countDocuments(),
      Listing.countDocuments({ createdAt: { $gte: weekAgo } }),
      Listing.countDocuments({ hidden: true }),
      Report.countDocuments({ status: 'open' }),
      Review.countDocuments(),
      Conversation.countDocuments(),
      Message.countDocuments(),
    ]);

    res.status(200).json({
      users: { total: users, newThisWeek: newUsers, suspended: suspendedUsers },
      listings: { total: listings, newThisWeek: newListings, hidden: hiddenListings },
      reports: { open: openReports },
      reviews: { total: reviews },
      messages: { conversations, total: messages },
    });
  } catch (error) {
    next(error);
  }
};

const REPORT_STATUSES = ['open', 'resolved', 'dismissed'];

const REPORT_CSV_COLUMNS = [
  { label: 'Listing', value: (r) => r.listing?.name ?? '' },
  { label: 'Reporter', value: (r) => r.reporter?.username ?? '' },
  { label: 'Reason', value: (r) => r.reason },
  { label: 'Details', value: (r) => r.details },
  { label: 'Status', value: (r) => r.status },
  { label: 'Reported at', value: (r) => r.createdAt.toISOString() },
];

// A CSV of the moderation queue (?status=open|resolved|dismissed|all).
export const exportReports = async (req, res, next) => {
  try {
    let status = REPORT_STATUSES.includes(req.query.status) ? req.query.status : 'open';
    if (req.query.status === 'all') status = null;
    const reports = await Report.find(status ? { status } : {})
      .sort({ createdAt: -1 })
      .limit(1000)
      .populate('listing', 'name')
      .populate('reporter', 'username');

    sendCsv(res, `central-house-reports-${new Date().toISOString().slice(0, 10)}.csv`, toCsv(REPORT_CSV_COLUMNS, reports));
  } catch (error) {
    next(error);
  }
};

// The moderation queue. ?status=open (default), resolved, dismissed or all.
export const listReports = async (req, res, next) => {
  try {
    let status = REPORT_STATUSES.includes(req.query.status) ? req.query.status : 'open';
    if (req.query.status === 'all') status = null;
    const reports = await Report.find(status ? { status } : {})
      // _id breaks ties between reports created in the same millisecond.
      .sort({ createdAt: status === 'open' ? 1 : -1, _id: status === 'open' ? 1 : -1 })
      .limit(200)
      .populate('listing', 'name imageUrls hidden hiddenReason userRef')
      .populate('reporter', 'username avatar');

    // How many open reports each listing has, to spot the worst offenders.
    const listingIds = [...new Set(reports.map((r) => r.listing?._id.toString()).filter(Boolean))];
    const counts = await Report.aggregate([
      {
        $match: {
          status: 'open',
          listing: { $in: listingIds.map((id) => new mongoose.Types.ObjectId(id)) },
        },
      },
      { $group: { _id: '$listing', count: { $sum: 1 } } },
    ]);
    const openByListing = Object.fromEntries(counts.map((c) => [c._id.toString(), c.count]));

    res.status(200).json(
      reports.map((r) => ({
        ...r.toObject(),
        openReportsForListing: r.listing ? openByListing[r.listing._id.toString()] ?? 0 : 0,
      }))
    );
  } catch (error) {
    next(error);
  }
};

export const updateReport = async (req, res, next) => {
  try {
    const report = await Report.findByIdAndUpdate(req.params.id, { status: req.body.status }, { new: true });
    if (!report) return next(errorHandler(404, 'Report not found!'));
    const actionByStatus = {
      resolved: 'resolve_report',
      dismissed: 'dismiss_report',
      open: 'reopen_report',
    };
    await recordAudit({
      actor: req.user.id,
      action: actionByStatus[req.body.status] ?? 'resolve_report',
      targetType: 'report',
      targetId: report._id,
      meta: { status: req.body.status },
    });
    res.status(200).json(report);
  } catch (error) {
    // Reopening can clash with another open report from the same user.
    if (error.code === 11000) {
      return next(errorHandler(409, 'This user already has an open report for this listing.'));
    }
    next(error);
  }
};

// Hides a listing from everyone but its owner and admins, and closes the
// open reports about it.
export const hideListing = async (req, res, next) => {
  try {
    const listing = await Listing.findByIdAndUpdate(
      req.params.id,
      { hidden: true, hiddenReason: req.body.reason, hiddenBy: 'moderation' },
      { new: true }
    );
    if (!listing) return next(errorHandler(404, 'Listing not found!'));
    await Report.updateMany({ listing: listing._id, status: 'open' }, { status: 'resolved' });
    await notifyListingModerated({
      recipient: listing.userRef,
      hidden: true,
      listingName: listing.name,
      listingId: listing._id,
      reason: req.body.reason,
    });
    await recordAudit({
      actor: req.user.id,
      action: 'hide_listing',
      targetType: 'listing',
      targetId: listing._id,
      targetLabel: listing.name,
      reason: req.body.reason,
    });
    res.status(200).json(listing);
  } catch (error) {
    next(error);
  }
};

export const unhideListing = async (req, res, next) => {
  try {
    const listing = await Listing.findByIdAndUpdate(
      req.params.id,
      { hidden: false, hiddenReason: '', hiddenBy: null },
      { new: true }
    );
    if (!listing) return next(errorHandler(404, 'Listing not found!'));
    await notifyListingModerated({
      recipient: listing.userRef,
      hidden: false,
      listingName: listing.name,
      listingId: listing._id,
    });
    await recordAudit({
      actor: req.user.id,
      action: 'unhide_listing',
      targetType: 'listing',
      targetId: listing._id,
      targetLabel: listing.name,
    });
    // A restored listing is effectively newly available again.
    await notifySavedSearchMatches(listing);
    res.status(200).json(listing);
  } catch (error) {
    next(error);
  }
};

// Hidden listings, most recently changed first.
export const listHiddenListings = async (req, res, next) => {
  try {
    const listings = await Listing.find({ hidden: true }).sort({ updatedAt: -1 }).limit(200);
    const owners = await User.find({ _id: { $in: listings.map((l) => l.userRef) } }, 'username');
    const ownerNames = Object.fromEntries(owners.map((u) => [u._id.toString(), u.username]));
    res.status(200).json(
      listings.map((l) => ({ ...l.toObject(), ownerUsername: ownerNames[l.userRef] ?? null }))
    );
  } catch (error) {
    next(error);
  }
};

const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Users matching ?search= (username or email), newest first, with how
// many listings each has.
export const listUsers = async (req, res, next) => {
  try {
    const search = typeof req.query.search === 'string' ? req.query.search.trim().slice(0, 100) : '';
    const pattern = { $regex: escapeRegex(search), $options: 'i' };
    const filter = search ? { $or: [{ username: pattern }, { email: pattern }] } : {};
    if (req.query.suspended === 'true') filter.suspended = true;

    const users = await User.find(filter, 'username email avatar role suspended +suspendedReason emailVerified createdAt')
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();

    const counts = await Listing.aggregate([
      { $match: { userRef: { $in: users.map((u) => u._id.toString()) } } },
      { $group: { _id: '$userRef', count: { $sum: 1 } } },
    ]);
    const listingCounts = Object.fromEntries(counts.map((c) => [c._id, c.count]));

    res.status(200).json(users.map((u) => ({ ...u, listingCount: listingCounts[u._id.toString()] ?? 0 })));
  } catch (error) {
    next(error);
  }
};

// A single user's profile plus the numbers and recent admin actions an
// admin needs to judge an account.
export const getUserDetail = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id).select(
      'username email avatar role suspended emailVerified createdAt +suspendedReason'
    );
    if (!user) return next(errorHandler(404, 'User not found!'));

    const listings = await Listing.find(
      { userRef: user._id },
      'name hidden active views ratingAverage ratingCount createdAt'
    )
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();
    const listingIds = listings.map((l) => l._id);

    const [openReports, reviews, applicationsReceived, deposits, recentActions] = await Promise.all([
      Report.countDocuments({ listing: { $in: listingIds }, status: 'open' }),
      Review.countDocuments({ author: user._id }),
      Application.countDocuments({ owner: user._id }),
      Payment.aggregate([
        { $match: { payee: new mongoose.Types.ObjectId(user._id), status: 'paid' } },
        { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } },
      ]),
      AuditLog.find({ actor: user._id }).sort({ createdAt: -1 }).limit(10).lean(),
    ]);

    res.status(200).json({
      user: {
        _id: user._id,
        username: user.username,
        email: user.email,
        avatar: user.avatar,
        role: user.role,
        suspended: user.suspended,
        suspendedReason: user.suspendedReason ?? '',
        emailVerified: user.emailVerified,
        createdAt: user.createdAt,
      },
      stats: {
        listings: listings.length,
        hidden: listings.filter((l) => l.hidden).length,
        paused: listings.filter((l) => l.active === false).length,
        openReports,
        reviews,
        applicationsReceived,
        depositsReceived: deposits[0]?.count ?? 0,
        depositsReceivedAmount: deposits[0]?.total ?? 0,
      },
      listings,
      recentActions,
    });
  } catch (error) {
    next(error);
  }
};

// Suspends a user: they're signed out everywhere (verifyToken checks the
// flag) and their public listings are hidden until they're reinstated.
export const suspendUser = async (req, res, next) => {
  try {
    if (req.params.id === req.user.id) return next(errorHandler(400, "You can't suspend yourself!"));
    const target = await User.findById(req.params.id, 'role username');
    if (!target) return next(errorHandler(404, 'User not found!'));
    if (target.role === 'admin') return next(errorHandler(400, "Admins can't be suspended. Remove their admin role first."));

    await User.updateOne({ _id: target._id }, { suspended: true, suspendedReason: req.body.reason });
    const { modifiedCount } = await Listing.updateMany(
      { userRef: req.params.id, hidden: { $ne: true } },
      { hidden: true, hiddenReason: 'Owner account suspended', hiddenBy: 'suspension' }
    );
    await notifyAccountStatus({ recipient: target._id, suspended: true, reason: req.body.reason });
    await recordAudit({
      actor: req.user.id,
      action: 'suspend_user',
      targetType: 'user',
      targetId: target._id,
      targetLabel: target.username,
      reason: req.body.reason,
    });
    res.status(200).json({ suspended: true, listingsHidden: modifiedCount });
  } catch (error) {
    next(error);
  }
};

export const unsuspendUser = async (req, res, next) => {
  try {
    const user = await User.findByIdAndUpdate(req.params.id, { suspended: false, $unset: { suspendedReason: 1 } });
    if (!user) return next(errorHandler(404, 'User not found!'));
    // Restore only what the suspension hid, not listings a moderator hid.
    const { modifiedCount } = await Listing.updateMany(
      { userRef: req.params.id, hiddenBy: 'suspension' },
      { hidden: false, hiddenReason: '', hiddenBy: null }
    );
    await notifyAccountStatus({ recipient: user._id, suspended: false });
    await recordAudit({
      actor: req.user.id,
      action: 'unsuspend_user',
      targetType: 'user',
      targetId: user._id,
      targetLabel: user.username,
    });
    res.status(200).json({ suspended: false, listingsRestored: modifiedCount });
  } catch (error) {
    next(error);
  }
};
