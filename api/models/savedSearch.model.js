import mongoose from 'mongoose';
import { AMENITIES, PROPERTY_TYPES } from '../constants/listing.js';

// The filter set a user wants to be alerted about. Mirrors the search page
// options so a saved search can reconstruct the same /search query.
const filterSchema = new mongoose.Schema(
  {
    searchTerm: { type: String, trim: true, maxlength: 100, default: '' },
    type: { type: String, enum: ['all', 'rent', 'sale'], default: 'all' },
    parking: { type: Boolean, default: false },
    furnished: { type: Boolean, default: false },
    offer: { type: Boolean, default: false },
    propertyType: { type: String, enum: [...PROPERTY_TYPES, null], default: null },
    amenities: { type: [{ type: String, enum: AMENITIES }], default: [] },
    minPrice: { type: Number, min: 0, default: null },
    maxPrice: { type: Number, min: 0, default: null },
    minBedrooms: { type: Number, min: 0, default: null },
    minBathrooms: { type: Number, min: 0, default: null },
  },
  { _id: false }
);

const savedSearchSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    // Optional label like "2-bed under 1500"; falls back to a summary.
    name: { type: String, trim: true, maxlength: 60, default: '' },
    filters: { type: filterSchema, default: () => ({}) },
    // Users can pause alerts without deleting the search.
    alertsEnabled: { type: Boolean, default: true },
    lastNotifiedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

savedSearchSchema.index({ user: 1, createdAt: -1 });
// Used when a new listing comes in: only enabled searches need checking.
savedSearchSchema.index({ alertsEnabled: 1 });

const SavedSearch = mongoose.model('SavedSearch', savedSearchSchema);

export default SavedSearch;
