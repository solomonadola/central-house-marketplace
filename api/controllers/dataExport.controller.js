import User from '../models/user.model.js';
import Listing from '../models/listing.model.js';
import Conversation from '../models/conversation.model.js';
import Message from '../models/message.model.js';
import Review from '../models/review.model.js';
import Report from '../models/report.model.js';
import Viewing from '../models/viewing.model.js';
import Application from '../models/application.model.js';
import Payment from '../models/payment.model.js';
import Notification from '../models/notification.model.js';
import SavedSearch from '../models/savedSearch.model.js';
import ListingQuestion from '../models/listingQuestion.model.js';
import OpenHouse from '../models/openHouse.model.js';
import MaintenanceRequest from '../models/maintenanceRequest.model.js';
import QuickReply from '../models/quickReply.model.js';
import ListingDraft from '../models/listingDraft.model.js';
import Lease from '../models/lease.model.js';
import RentCharge from '../models/rentCharge.model.js';
import { errorHandler } from '../utils/error.js';

export const EXPORT_VERSION = 1;

// Everything the app stores about the signed-in user, as a downloadable
// JSON file. Secrets (password hash, token hashes, token version) are never
// included, and other people appear only by username.
export const exportMyData = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId)
      .select('+blockedUsers')
      .populate('blockedUsers', 'username')
      .lean();
    if (!user) return next(errorHandler(404, 'User not found!'));

    const conversations = await Conversation.find({ 'participants.user': userId })
      .populate('listing', 'name')
      .populate('buyer owner', 'username')
      .lean();
    const conversationIds = conversations.map((c) => c._id);

    const [
      listings,
      messages,
      reviews,
      reports,
      viewings,
      applications,
      payments,
      notifications,
      savedSearches,
      questions,
      openHouseRsvps,
      maintenanceRequests,
      quickReplies,
      listingDrafts,
      leases,
    ] = await Promise.all([
      Listing.find({ userRef: userId }).lean(),
      Message.find({ conversation: { $in: conversationIds } }).sort({ createdAt: 1 }).lean(),
      Review.find({ author: userId }).populate('listing', 'name').lean(),
      Report.find({ reporter: userId }).populate('listing', 'name').lean(),
      Viewing.find({ $or: [{ requester: userId }, { owner: userId }] }).populate('listing', 'name').lean(),
      Application.find({ $or: [{ applicant: userId }, { owner: userId }] }).populate('listing', 'name').lean(),
      Payment.find({ $or: [{ payer: userId }, { payee: userId }] }).populate('listing', 'name').lean(),
      Notification.find({ recipient: userId }).sort({ createdAt: -1 }).lean(),
      SavedSearch.find({ user: userId }).lean(),
      ListingQuestion.find({ asker: userId }).populate('listing', 'name').lean(),
      OpenHouse.find({ 'rsvps.user': userId }, 'listing startsAt endsAt cancelled').populate('listing', 'name').lean(),
      MaintenanceRequest.find({ $or: [{ tenant: userId }, { owner: userId }] }, '-updates').populate('listing', 'name').lean(),
      QuickReply.find({ owner: userId }, 'title body').lean(),
      ListingDraft.find({ owner: userId }, 'data updatedAt').lean(),
      Lease.find({ $or: [{ tenant: userId }, { owner: userId }] }).populate('listing', 'name').lean(),
    ]);
    const rentCharges = await RentCharge.find({ lease: { $in: leases.map((l) => l._id) } }, '-settledBy')
      .sort({ period: 1 })
      .lean();

    const usernames = new Map();
    conversations.forEach((c) => {
      [c.buyer, c.owner].filter(Boolean).forEach((u) => usernames.set(u._id.toString(), u.username));
    });

    const {
      password,
      tokenVersion,
      emailVerifyTokenHash,
      emailVerifyExpires,
      passwordResetTokenHash,
      passwordResetExpires,
      suspendedReason,
      blockedUsers,
      ...profile
    } = user;

    const data = {
      exportVersion: EXPORT_VERSION,
      exportedAt: new Date().toISOString(),
      profile,
      blockedUsers: (blockedUsers ?? []).filter(Boolean).map((u) => u.username),
      listings,
      savedListingIds: profile.favorites ?? [],
      savedSearches,
      conversations: conversations.map((c) => ({
        _id: c._id,
        listing: c.listing?.name ?? null,
        with: (c.owner?._id?.toString() === userId ? c.buyer : c.owner)?.username ?? null,
        messages: messages
          .filter((m) => m.conversation.toString() === c._id.toString())
          .map((m) => ({
            from: m.sender.toString() === userId ? 'you' : usernames.get(m.sender.toString()) ?? 'former user',
            body: m.body,
            sentAt: m.createdAt,
          })),
      })),
      reviews,
      reports,
      questions,
      viewings,
      openHouseRsvps,
      applications,
      payments,
      maintenanceRequests,
      quickReplies,
      listingDrafts,
      leases: leases.map((lease) => ({
        ...lease,
        rentCharges: rentCharges.filter((c) => c.lease.toString() === lease._id.toString()),
      })),
      notifications,
    };

    const day = new Date().toISOString().slice(0, 10);
    res
      .status(200)
      .set('Content-Type', 'application/json; charset=utf-8')
      .set('Content-Disposition', `attachment; filename="central-house-data-${day}.json"`)
      .send(JSON.stringify(data, null, 2));
  } catch (error) {
    next(error);
  }
};
