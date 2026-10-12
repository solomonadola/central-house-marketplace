import mongoose from 'mongoose';

export const FLAG_TARGET_TYPES = ['review', 'question'];
export const FLAG_REASONS = ['spam', 'offensive', 'off_topic', 'personal_info', 'other'];
// open until an admin looks at it; 'actioned' when the content was removed,
// 'dismissed' when it was left up.
export const FLAG_STATUSES = ['open', 'actioned', 'dismissed'];

// A user's report that a review or question breaks the rules. Several users
// can flag the same content; admins handle all flags on it at once.
const contentFlagSchema = new mongoose.Schema(
  {
    targetType: { type: String, enum: FLAG_TARGET_TYPES, required: true },
    target: { type: mongoose.Schema.Types.ObjectId, required: true },
    // The listing it was posted on, so admins can open it in context.
    listing: { type: mongoose.Schema.Types.ObjectId, ref: 'Listing', required: true },
    reporter: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    reason: { type: String, enum: FLAG_REASONS, required: true },
    details: { type: String, trim: true, maxlength: 500, default: '' },
    status: { type: String, enum: FLAG_STATUSES, default: 'open' },
    handledAt: { type: Date, default: null },
  },
  { timestamps: true }
);

// One open flag per person per piece of content.
contentFlagSchema.index(
  { targetType: 1, target: 1, reporter: 1 },
  { unique: true, partialFilterExpression: { status: 'open' } }
);
contentFlagSchema.index({ status: 1, createdAt: -1 });

const ContentFlag = mongoose.model('ContentFlag', contentFlagSchema);

export default ContentFlag;
