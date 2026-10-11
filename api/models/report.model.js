import mongoose from 'mongoose';

export const REPORT_REASONS = ['scam', 'inaccurate', 'inappropriate', 'unavailable', 'other'];

const reportSchema = new mongoose.Schema(
  {
    listing: { type: mongoose.Schema.Types.ObjectId, ref: 'Listing', required: true },
    reporter: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    reason: { type: String, enum: REPORT_REASONS, required: true },
    details: { type: String, trim: true, maxlength: 1000, default: '' },
    status: { type: String, enum: ['open', 'resolved', 'dismissed'], default: 'open' },
  },
  { timestamps: true }
);

reportSchema.index({ status: 1, createdAt: -1 });
// A user can have only one open report per listing.
reportSchema.index(
  { listing: 1, reporter: 1 },
  { unique: true, partialFilterExpression: { status: 'open' } }
);

const Report = mongoose.model('Report', reportSchema);

export default Report;
