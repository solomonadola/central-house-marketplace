import Listing from '../models/listing.model.js';
import User from '../models/user.model.js';
import Conversation from '../models/conversation.model.js';
import Viewing from '../models/viewing.model.js';
import Application from '../models/application.model.js';
import Payment from '../models/payment.model.js';
import ListingViewDay, { utcDay } from '../models/listingViewDay.model.js';
import { sendCsv, toCsv } from '../utils/csv.js';

const DAYS = 30;

// The last 30 UTC days, oldest first, as 'YYYY-MM-DD'.
const lastDays = (now = new Date()) =>
  Array.from({ length: DAYS }, (_, i) => utcDay(new Date(now.getTime() - (DAYS - 1 - i) * 24 * 60 * 60 * 1000)));

// Turns [{ _id, count }] aggregation results into { id: count }.
const countsById = (rows) => Object.fromEntries(rows.map((r) => [r._id.toString(), r.count]));

const rate = (numerator, denominator) =>
  denominator > 0 ? Math.round((numerator / denominator) * 100) / 100 : 0;

// Computes everything the analytics page and CSV export need for one owner.
const computeAnalytics = async (userId) => {
  const listings = await Listing.find(
    { userRef: userId },
    'name imageUrls views ratingAverage ratingCount hidden createdAt regularPrice discountPrice offer type'
  ).lean();
  const ids = listings.map((l) => l._id);
  const days = lastDays();

  const [saves, enquiries, viewingRequests, applications, approved, deposits, daily] = await Promise.all([
    User.aggregate([
      { $match: { favorites: { $in: ids } } },
      { $unwind: '$favorites' },
      { $match: { favorites: { $in: ids } } },
      { $group: { _id: '$favorites', count: { $sum: 1 } } },
    ]),
    Conversation.aggregate([
      { $match: { listing: { $in: ids } } },
      { $group: { _id: '$listing', count: { $sum: 1 } } },
    ]),
    Viewing.aggregate([
      { $match: { listing: { $in: ids } } },
      { $group: { _id: '$listing', count: { $sum: 1 } } },
    ]),
    Application.aggregate([
      { $match: { listing: { $in: ids } } },
      { $group: { _id: '$listing', count: { $sum: 1 } } },
    ]),
    Application.aggregate([
      { $match: { listing: { $in: ids }, status: 'approved' } },
      { $group: { _id: '$listing', count: { $sum: 1 } } },
    ]),
    Payment.aggregate([
      { $match: { listing: { $in: ids }, status: 'paid' } },
      { $group: { _id: '$listing', count: { $sum: 1 }, amount: { $sum: '$amount' } } },
    ]),
    ListingViewDay.find({ listing: { $in: ids }, day: { $gte: days[0] } }).lean(),
  ]);

  const savesBy = countsById(saves);
  const enquiriesBy = countsById(enquiries);
  const viewingsBy = countsById(viewingRequests);
  const applicationsBy = countsById(applications);
  const approvedBy = countsById(approved);
  const depositsBy = Object.fromEntries(
    deposits.map((d) => [d._id.toString(), { count: d.count, amount: d.amount }])
  );

  const viewsByDay = Object.fromEntries(days.map((day) => [day, 0]));
  const recentViewsBy = {};
  for (const { listing, day, count } of daily) {
    viewsByDay[day] += count;
    recentViewsBy[listing.toString()] = (recentViewsBy[listing.toString()] ?? 0) + count;
  }

  const perListing = listings
    .map((l) => {
      const id = l._id.toString();
      const price = l.offer ? l.discountPrice : l.regularPrice;
      return {
        _id: l._id,
        name: l.name,
        imageUrl: l.imageUrls?.[0] ?? null,
        hidden: l.hidden,
        type: l.type,
        price,
        views: l.views ?? 0,
        viewsLast30Days: recentViewsBy[id] ?? 0,
        saves: savesBy[id] ?? 0,
        enquiries: enquiriesBy[id] ?? 0,
        viewingRequests: viewingsBy[id] ?? 0,
        applications: applicationsBy[id] ?? 0,
        approvedApplications: approvedBy[id] ?? 0,
        depositsPaid: depositsBy[id]?.count ?? 0,
        depositsPaidAmount: depositsBy[id]?.amount ?? 0,
        ratingAverage: l.ratingAverage ?? 0,
        ratingCount: l.ratingCount ?? 0,
      };
    })
    .sort((a, b) => b.viewsLast30Days - a.viewsLast30Days || b.views - a.views);

  const sum = (key) => perListing.reduce((total, l) => total + l[key], 0);

  const totals = {
    listings: listings.length,
    views: sum('views'),
    viewsLast30Days: sum('viewsLast30Days'),
    saves: sum('saves'),
    enquiries: sum('enquiries'),
    viewingRequests: sum('viewingRequests'),
    applications: sum('applications'),
    approvedApplications: sum('approvedApplications'),
    depositsPaid: sum('depositsPaid'),
    depositsPaidAmount: sum('depositsPaidAmount'),
  };

  return {
    totals: {
      ...totals,
      // How many views turn into an enquiry, and applications into approvals.
      enquiryRate: rate(totals.enquiries, totals.views),
      approvalRate: rate(totals.approvedApplications, totals.applications),
    },
    viewsByDay: days.map((day) => ({ day, views: viewsByDay[day] })),
    listings: perListing,
  };
};

// Performance of the signed-in user's listings: totals, views per day for
// the last 30 days, and per-listing numbers.
export const getMyAnalytics = async (req, res, next) => {
  try {
    res.status(200).json(await computeAnalytics(req.user.id));
  } catch (error) {
    next(error);
  }
};

const CSV_COLUMNS = [
  { label: 'Listing', value: (l) => l.name },
  { label: 'Type', value: (l) => l.type },
  { label: 'Price', value: (l) => l.price },
  { label: 'Hidden', value: (l) => (l.hidden ? 'yes' : 'no') },
  { label: 'Views (30d)', value: (l) => l.viewsLast30Days },
  { label: 'Views (all time)', value: (l) => l.views },
  { label: 'Saves', value: (l) => l.saves },
  { label: 'Enquiries', value: (l) => l.enquiries },
  { label: 'Viewing requests', value: (l) => l.viewingRequests },
  { label: 'Applications', value: (l) => l.applications },
  { label: 'Approved applications', value: (l) => l.approvedApplications },
  { label: 'Deposits paid', value: (l) => l.depositsPaid },
  { label: 'Deposits amount', value: (l) => l.depositsPaidAmount },
  { label: 'Rating', value: (l) => (l.ratingCount > 0 ? l.ratingAverage.toFixed(1) : '') },
  { label: 'Reviews', value: (l) => l.ratingCount },
];

// A CSV of the same per-listing numbers, for owners who want to dig in.
export const exportMyAnalytics = async (req, res, next) => {
  try {
    const { listings } = await computeAnalytics(req.user.id);
    const csv = toCsv(CSV_COLUMNS, listings);
    sendCsv(res, `central-house-analytics-${new Date().toISOString().slice(0, 10)}.csv`, csv);
  } catch (error) {
    next(error);
  }
};

const WEEK = 7 * 24 * 60 * 60 * 1000;
const round = (n) => (typeof n === 'number' ? Math.round(n * 100) / 100 : 0);
const EFFECTIVE_PRICE = { $cond: ['$offer', '$discountPrice', '$regularPrice'] };

// Public, aggregate view of the whole marketplace for the insights page.
// No user data is included.
export const getInsights = async (req, res, next) => {
  try {
    const visible = { hidden: { $ne: true }, active: { $ne: false } };

    const [total, byStatus, byPropertyType, priceStats, newThisWeek] = await Promise.all([
      Listing.countDocuments(visible),
      Listing.aggregate([
        { $match: visible },
        { $group: { _id: '$type', count: { $sum: 1 } } },
      ]),
      Listing.aggregate([
        { $match: visible },
        {
          $group: {
            _id: '$propertyType',
            count: { $sum: 1 },
            avgPrice: { $avg: EFFECTIVE_PRICE },
          },
        },
        { $sort: { count: -1 } },
      ]),
      Listing.aggregate([
        {
          $match: visible,
        },
        {
          $group: {
            _id: '$type',
            avgPrice: { $avg: EFFECTIVE_PRICE },
            minPrice: { $min: EFFECTIVE_PRICE },
            maxPrice: { $max: EFFECTIVE_PRICE },
            avgBedrooms: { $avg: '$bedrooms' },
            avgBathrooms: { $avg: '$bathrooms' },
            furnishedShare: { $avg: { $cond: ['$furnished', 1, 0] } },
          },
        },
      ]),
      Listing.countDocuments({ ...visible, createdAt: { $gte: new Date(Date.now() - WEEK) } }),
    ]);

    const statusCounts = Object.fromEntries(byStatus.map((s) => [s._id, s.count]));
    const prices = Object.fromEntries(
      priceStats.map((s) => [
        s._id,
        {
          average: round(s.avgPrice),
          min: s.minPrice ?? 0,
          max: s.maxPrice ?? 0,
          averageBedrooms: round(s.avgBedrooms),
          averageBathrooms: round(s.avgBathrooms),
          furnishedShare: round(s.furnishedShare),
        },
      ])
    );

    res.status(200).json({
      total,
      newThisWeek,
      forRent: statusCounts.rent ?? 0,
      forSale: statusCounts.sale ?? 0,
      prices,
      byPropertyType: byPropertyType.map((row) => ({
        propertyType: row._id ?? 'apartment',
        count: row.count,
        averagePrice: round(row.avgPrice),
      })),
    });
  } catch (error) {
    next(error);
  }
};
