import mongoose from 'mongoose';

// A conversation between someone interested in a listing and its owner.
// There's at most one per (listing, interested user) pair.
const participantSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    // Messages from the other participant after this time are unread.
    lastReadAt: { type: Date, default: () => new Date(0) },
  },
  { _id: false }
);

const conversationSchema = new mongoose.Schema(
  {
    listing: { type: mongoose.Schema.Types.ObjectId, ref: 'Listing', required: true },
    // The user who started the conversation (not the owner).
    buyer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    participants: {
      type: [participantSchema],
      validate: (v) => v.length === 2,
    },
    lastMessage: {
      body: String,
      sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      createdAt: Date,
    },
  },
  { timestamps: true }
);

conversationSchema.index({ listing: 1, buyer: 1 }, { unique: true });
conversationSchema.index({ 'participants.user': 1, 'lastMessage.createdAt': -1 });

const Conversation = mongoose.model('Conversation', conversationSchema);

export default Conversation;
