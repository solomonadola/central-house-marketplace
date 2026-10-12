import mongoose from 'mongoose';

// A public question about a listing. Once the owner answers it, everyone
// viewing the listing sees the question and the answer.
const listingQuestionSchema = new mongoose.Schema(
  {
    listing: { type: mongoose.Schema.Types.ObjectId, ref: 'Listing', required: true },
    asker: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    question: { type: String, required: true, trim: true, minlength: 5, maxlength: 500 },
    answer: {
      body: { type: String, trim: true, maxlength: 1000 },
      answeredAt: Date,
    },
    // Set when an admin removes it after it was flagged. Removed content is
    // kept (so it can be restored) but no longer shown or counted.
    removed: { type: Boolean, default: false },
    removedReason: { type: String, trim: true, maxlength: 500, default: '' },
    removedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

listingQuestionSchema.index({ listing: 1, createdAt: -1 });
listingQuestionSchema.index({ asker: 1 });

const ListingQuestion = mongoose.model('ListingQuestion', listingQuestionSchema);

export default ListingQuestion;
