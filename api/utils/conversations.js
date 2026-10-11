import Conversation from '../models/conversation.model.js';
import Message from '../models/message.model.js';

export const findParticipant = (conversation, userId) =>
  conversation.participants.find((p) => p.user.toString() === String(userId));

// Returns the conversation between a listing's owner and an interested
// user, creating it if needed (safe against concurrent creation).
export const getOrCreateConversation = async (listing, buyerId) => {
  const filter = { listing: listing._id, buyer: buyerId };
  const existing = await Conversation.findOne(filter);
  if (existing) return existing;

  try {
    return await Conversation.create({
      ...filter,
      owner: listing.userRef,
      participants: [{ user: buyerId }, { user: listing.userRef }],
    });
  } catch (error) {
    // Two requests raced to create it; use the one that won.
    if (error.code !== 11000) throw error;
    return Conversation.findOne(filter);
  }
};

// Saves a message and updates the conversation's preview. Sending a
// message also counts as having read the conversation.
export const addMessage = async (conversation, senderId, body) => {
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
