import mongoose from 'mongoose';

// Views of a listing on one UTC day, for owner analytics. The listing's
// own `views` field keeps the all-time total.
const listingViewDaySchema = new mongoose.Schema({
  listing: { type: mongoose.Schema.Types.ObjectId, ref: 'Listing', required: true },
  // 'YYYY-MM-DD' in UTC.
  day: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
  count: { type: Number, default: 0, min: 0 },
});

listingViewDaySchema.index({ listing: 1, day: 1 }, { unique: true });

const ListingViewDay = mongoose.model('ListingViewDay', listingViewDaySchema);

export default ListingViewDay;

export const utcDay = (date = new Date()) => date.toISOString().slice(0, 10);
