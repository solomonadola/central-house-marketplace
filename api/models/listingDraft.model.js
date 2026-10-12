import mongoose from 'mongoose';

// An unfinished listing an owner saved to come back to. Fields may be
// incomplete; they're fully validated only when the draft is published.
const listingDraftSchema = new mongoose.Schema(
  {
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    data: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true, minimize: false }
);

listingDraftSchema.index({ owner: 1, updatedAt: -1 });

const ListingDraft = mongoose.model('ListingDraft', listingDraftSchema);

export default ListingDraft;
