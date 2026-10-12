import mongoose from 'mongoose';

// One entry per price a listing has had, including the price it was first
// posted at. "Price" means what a buyer actually pays: the discounted price
// while an offer is running, otherwise the regular price.
const priceChangeSchema = new mongoose.Schema(
  {
    listing: { type: mongoose.Schema.Types.ObjectId, ref: 'Listing', required: true },
    price: { type: Number, required: true, min: 0 },
    previousPrice: { type: Number, default: null, min: 0 },
    regularPrice: { type: Number, required: true, min: 0 },
    offer: { type: Boolean, default: false },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

priceChangeSchema.index({ listing: 1, createdAt: -1 });

const PriceChange = mongoose.model('PriceChange', priceChangeSchema);

export default PriceChange;
