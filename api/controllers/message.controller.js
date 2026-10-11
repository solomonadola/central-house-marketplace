import Conversation from '../models/conversation.model.js';
import Message from '../models/message.model.js';
import Listing from '../models/listing.model.js';
import { errorHandler } from '../utils/error.js';

const findParticipant = (conversation, userId) =>
  conversation.participants.find((p) => p.user.toString() === userId);

// Saves a message and updates the conversation's preview. Sending a
// message also counts as having read the conversation.
const addMessage = async (conversation, senderId, body) => {
  const message = await Message.create({ conversation: conversation._id, sender: senderId, body });

  await Conversation.updateOne(
    { _id: conversation._id, 'participants.user': senderId },
    {
      $set: {
        lastMessage: { body: message.body, sender: senderId, createdAt: message.createdAt },
        'participants.$.lastReadAt': message.createdAt,
      },
    }
  );

  return message;
};

export const startConversation = async (req, res, next) => {
  try {
    const { listingId, body } = req.body;
    const listing = await Listing.findById(listingId);
    if (!listing || listing.hidden) return next(errorHandler(404, 'Listing not found!'));
    if (listing.userRef === req.user.id) {
      return next(errorHandler(400, "You can't message yourself about your own listing!"));
    }

    // Reuse the existing conversation about this listing, if any.
    const filter = { listing: listing._id, buyer: req.user.id };
    let conversation = await Conversation.findOne(filter);
    if (!conversation) {
      try {
        conversation = await Conversation.create({
          ...filter,
          owner: listing.userRef,
          participants: [{ user: req.user.id }, { user: listing.userRef }],
        });
      } catch (error) {
        // Two requests raced to create it; use the one that won.
        if (error.code !== 11000) throw error;
        conversation = await Conversation.findOne(filter);
      }
    }

    const message = await addMessage(conversation, req.user.id, body);
    res.status(201).json({ conversationId: conversation._id, message });
  } catch (error) {
    next(error);
  }
};

export const sendMessage = async (req, res, next) => {
  try {
    const conversation = await Conversation.findById(req.params.id);
    if (!conversation || !findParticipant(conversation, req.user.id)) {
      return next(errorHandler(404, 'Conversation not found!'));
    }

    const message = await addMessage(conversation, req.user.id, req.body.body);
    res.status(201).json(message);
  } catch (error) {
    next(error);
  }
};

const PAGE_SIZE = 50;

const publicUser = (user) => (user ? { _id: user._id, username: user.username, avatar: user.avatar } : null);

// Shapes a conversation for the current user. listing and the other user
// can be null if they were deleted.
const summarize = (conversation, userId) => {
  const isOwner = conversation.owner?._id?.toString() === userId;
  const listing = conversation.listing;
  return {
    _id: conversation._id,
    listing: listing ? { _id: listing._id, name: listing.name, imageUrl: listing.imageUrls?.[0] ?? null } : null,
    otherUser: publicUser(isOwner ? conversation.buyer : conversation.owner),
    isOwner,
    lastMessage: conversation.lastMessage,
  };
};

const populateSummary = (query) =>
  query
    .populate('listing', 'name imageUrls')
    .populate('buyer', 'username avatar')
    .populate('owner', 'username avatar');

const countUnread = (conversation, userId) =>
  Message.countDocuments({
    conversation: conversation._id,
    sender: { $ne: userId },
    createdAt: { $gt: findParticipant(conversation, userId).lastReadAt },
  });

export const listConversations = async (req, res, next) => {
  try {
    const conversations = await populateSummary(
      Conversation.find({ 'participants.user': req.user.id, 'lastMessage.createdAt': { $exists: true } })
        .sort({ 'lastMessage.createdAt': -1 })
        .limit(PAGE_SIZE)
    );

    const result = await Promise.all(
      conversations.map(async (c) => ({
        ...summarize(c, req.user.id),
        unreadCount: await countUnread(c, req.user.id),
      }))
    );
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

// Returns the latest messages (oldest first). Pass ?before=<ISO date> to
// page back through older ones. Opening the latest page marks it read.
export const getConversation = async (req, res, next) => {
  try {
    const conversation = await populateSummary(Conversation.findById(req.params.id));
    if (!conversation || !findParticipant(conversation, req.user.id)) {
      return next(errorHandler(404, 'Conversation not found!'));
    }

    const before = req.query.before ? new Date(req.query.before) : null;
    if (before && Number.isNaN(before.getTime())) {
      return next(errorHandler(400, 'Invalid before date!'));
    }

    const newestFirst = await Message.find({
      conversation: conversation._id,
      ...(before && { createdAt: { $lt: before } }),
    })
      .sort({ createdAt: -1 })
      .limit(PAGE_SIZE + 1);

    const hasMore = newestFirst.length > PAGE_SIZE;
    const messages = newestFirst.slice(0, PAGE_SIZE).reverse();

    if (!before) {
      await Conversation.updateOne(
        { _id: conversation._id, 'participants.user': req.user.id },
        { $set: { 'participants.$.lastReadAt': new Date() } }
      );
    }

    res.status(200).json({ conversation: summarize(conversation, req.user.id), messages, hasMore });
  } catch (error) {
    next(error);
  }
};

// Number of conversations with messages the user hasn't read yet.
export const getUnreadCount = async (req, res, next) => {
  try {
    const conversations = await Conversation.find(
      { 'participants.user': req.user.id, 'lastMessage.sender': { $ne: req.user.id } },
      { participants: 1, lastMessage: 1 }
    );
    const count = conversations.filter(
      (c) => c.lastMessage?.createdAt > findParticipant(c, req.user.id).lastReadAt
    ).length;
    res.status(200).json({ count });
  } catch (error) {
    next(error);
  }
};
