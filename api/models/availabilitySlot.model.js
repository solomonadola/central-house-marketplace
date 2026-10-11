import mongoose from 'mongoose';

// A concrete window on which a listing's owner is willing to show the
// property. Buyers request viewings that match an open slot; accepting
// (or creating) a viewing marks the slot booked so it can't be double-booked.
const availabilitySlotSchema = new mongoose.Schema(
  {
    listing: { type: mongoose.Schema.Types.ObjectId, ref: 'Listing', required: true },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    startsAt: { type: Date, required: true },
    endsAt: { type: Date, required: true },
    status: { type: String, enum: ['open', 'booked'], default: 'open' },
    // The viewing that filled this slot, if any.
    viewing: { type: mongoose.Schema.Types.ObjectId, ref: 'Viewing', default: null },
  },
  { timestamps: true }
);

availabilitySlotSchema.pre('validate', function checkRange(next) {
  if (this.startsAt && this.endsAt && this.endsAt <= this.startsAt) {
    return next(new Error('A slot must end after it starts.'));
  }
  next();
});

availabilitySlotSchema.index({ listing: 1, status: 1 });
// One slot per listing per start time; also serves the plain lookup.
availabilitySlotSchema.index({ listing: 1, startsAt: 1 }, { unique: true });

const AvailabilitySlot = mongoose.model('AvailabilitySlot', availabilitySlotSchema);

export default AvailabilitySlot;
