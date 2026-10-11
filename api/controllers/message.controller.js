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
    if (!listing) return next(errorHandler(404, 'Listing not found!'));
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
