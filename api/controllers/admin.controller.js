import User from '../models/user.model.js';
import Listing from '../models/listing.model.js';
import Report from '../models/report.model.js';
import Review from '../models/review.model.js';
import Conversation from '../models/conversation.model.js';
import Message from '../models/message.model.js';

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
