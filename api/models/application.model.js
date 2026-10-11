import mongoose from 'mongoose';

// A prospective tenant or buyer formally applying for a listing. Owners
// review applications and move them through the statuses below.
export const APPLICATION_STATUSES = ['submitted', 'under_review', 'approved', 'rejected', 'withdrawn'];

// A single applicant may only have one active application per listing;
// rejected or withdrawn ones can be replaced.
const ACTIVE_STATUSES = ['submitted', 'under_review', 'approved'];

const applicationSchema = new mongoose.Schema(
  {
    listing: { type: mongoose.Schema.Types.ObjectId, ref: 'Listing', required: true },
    applicant: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    fullName: { type: String, trim: true, maxlength: 80, required: true },
    email: { type: String, trim: true, maxlength: 120, required: true },
    phone: { type: String, trim: true, maxlength: 40, default: '' },
    message: { type: String, trim: true, maxlength: 1000, default: '' },
    // When the applicant would like to move in / complete the purchase.
    moveInDate: { type: Date, default: null },
    occupants: { type: Number, min: 1, max: 20, default: 1 },
    // Annual income, optional, used by owners to shortlist.
    income: { type: Number, min: 0, default: null },
    status: { type: String, enum: APPLICATION_STATUSES, default: 'submitted' },
    // Owner's note on approval/rejection.
    responseNote: { type: String, trim: true, maxlength: 500, default: '' },
    statusChangedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

applicationSchema.index({ applicant: 1, createdAt: -1 });
applicationSchema.index({ owner: 1, createdAt: -1 });
applicationSchema.index({ listing: 1, status: 1 });
// One active application per applicant per listing.
applicationSchema.index(
  { listing: 1, applicant: 1 },
  { unique: true, partialFilterExpression: { status: { $in: ACTIVE_STATUSES } } }
);

const Application = mongoose.model('Application', applicationSchema);

export default Application;
