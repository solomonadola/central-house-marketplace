import mongoose from 'mongoose';

// A request from a prospective buyer or tenant to view a listing.
// pending -> accepted | declined (by the owner); pending | accepted ->
// cancelled (by either side).
const viewingSchema = new mongoose.Schema(
  {
    listing: { type: mongoose.Schema.Types.ObjectId, ref: 'Listing', required: true },
    requester: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    startsAt: { type: Date, required: true },
    note: { type: String, trim: true, maxlength: 500, default: '' },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'declined', 'cancelled'],
      default: 'pending',
    },
    // Optional message from whoever last changed the status.
    responseNote: { type: String, trim: true, maxlength: 500, default: '' },
  },
  { timestamps: true }
);

viewingSchema.index({ requester: 1, startsAt: -1 });
viewingSchema.index({ owner: 1, startsAt: -1 });
viewingSchema.index({ listing: 1, requester: 1, status: 1 });

const Viewing = mongoose.model('Viewing', viewingSchema);

export default Viewing;
