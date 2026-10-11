import mongoose from 'mongoose';

const reviewSchema = new mongoose.Schema(
  {
    listing: { type: mongoose.Schema.Types.ObjectId, ref: 'Listing', required: true },
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, trim: true, maxlength: 1000, default: '' },
  },
  { timestamps: true }
);

// One review per user per listing; posting again edits it.
reviewSchema.index({ listing: 1, author: 1 }, { unique: true });
reviewSchema.index({ listing: 1, createdAt: -1 });

const Review = mongoose.model('Review', reviewSchema);

export default Review;
