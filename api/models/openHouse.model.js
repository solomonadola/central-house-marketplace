import mongoose from 'mongoose';

// A public viewing event for a listing that anyone can RSVP to, unlike
// one-to-one viewing requests.
const openHouseSchema = new mongoose.Schema(
  {
    listing: { type: mongoose.Schema.Types.ObjectId, ref: 'Listing', required: true },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    startsAt: { type: Date, required: true },
    endsAt: { type: Date, required: true },
    note: { type: String, trim: true, maxlength: 300, default: '' },
    // 0 means no limit.
    capacity: { type: Number, min: 0, max: 500, default: 0 },
    rsvps: {
      type: [
        new mongoose.Schema(
          {
            user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
            createdAt: { type: Date, default: Date.now },
          },
          { _id: false }
        ),
      ],
      default: [],
    },
    cancelled: { type: Boolean, default: false },
  },
  { timestamps: true }
);

openHouseSchema.index({ listing: 1, startsAt: 1 });
openHouseSchema.index({ startsAt: 1, cancelled: 1 });
openHouseSchema.index({ 'rsvps.user': 1 });

const OpenHouse = mongoose.model('OpenHouse', openHouseSchema);

export default OpenHouse;
