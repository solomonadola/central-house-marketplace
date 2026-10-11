import mongoose from 'mongoose';

// A saved message a user can insert into a conversation with one click,
// e.g. an owner's standard answer about viewing times.
const quickReplySchema = new mongoose.Schema(
  {
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true, trim: true, maxlength: 40 },
    body: { type: String, required: true, trim: true, maxlength: 1000 },
  },
  { timestamps: true }
);

quickReplySchema.index({ owner: 1, title: 1 });

const QuickReply = mongoose.model('QuickReply', quickReplySchema);

export default QuickReply;
