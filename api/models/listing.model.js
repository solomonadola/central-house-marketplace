import mongoose from 'mongoose';
import { AMENITIES, PROPERTY_TYPES } from '../constants/listing.js';

const listingSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    address: {
      type: String,
      required: true,
    },
    regularPrice: {
      type: Number,
      required: true,
    },
    discountPrice: {
      type: Number,
      required: true,
    },
    bathrooms: {
      type: Number,
      required: true,
    },
    bedrooms: {
      type: Number,
      required: true,
    },
    furnished: {
      type: Boolean,
      required: true,
    },
    parking: {
      type: Boolean,
      required: true,
    },
    type: {
      type: String,
      required: true,
    },
    // The kind of property and its features, used for filtering and display.
    propertyType: { type: String, enum: PROPERTY_TYPES, default: 'apartment' },
    amenities: { type: [{ type: String, enum: AMENITIES }], default: [] },
    offer: {
      type: Boolean,
      required: true,
    },
    imageUrls: {
      type: Array,
      required: true,
    },
    userRef: {
      type: String,
      required: true,
    },
    // Set by geocoding the address; missing if it couldn't be found.
    location: {
      type: new mongoose.Schema(
        {
          lat: { type: Number, required: true, min: -90, max: 90 },
          lng: { type: Number, required: true, min: -180, max: 180 },
        },
        { _id: false }
      ),
      default: undefined,
    },
    // Kept in sync with the listing's reviews for cheap display and sorting.
    ratingAverage: { type: Number, default: 0, min: 0, max: 5 },
    ratingCount: { type: Number, default: 0, min: 0 },
    // Hidden listings are only visible to their owner and admins.
    hidden: { type: Boolean, default: false },
    hiddenReason: { type: String, default: '' },
    // 'moderation' when an admin hid it; 'suspension' when the owner was
    // suspended, so unsuspending only restores those.
    hiddenBy: { type: String, enum: ['moderation', 'suspension', null], default: null },
    // Owners can pause a listing without deleting it: it disappears from
    // search but stays on their dashboard.
    active: { type: Boolean, default: true },
    views: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  { timestamps: true }
);

const Listing = mongoose.model('Listing', listingSchema);

export default Listing;
