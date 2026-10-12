import mongoose from 'mongoose';

export const LEASE_STATUSES = ['active', 'ended'];

// A tenancy an owner sets up after approving a rental application: who
// rents which home, for how much, and on which day of the month rent is due.
// Monthly charges are kept as RentCharge documents.
const leaseSchema = new mongoose.Schema(
  {
    listing: { type: mongoose.Schema.Types.ObjectId, ref: 'Listing', required: true },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    tenant: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    application: { type: mongoose.Schema.Types.ObjectId, ref: 'Application', required: true },
    monthlyRent: { type: Number, required: true, min: 1, max: 1_000_000 },
    currency: { type: String, default: 'USD', uppercase: true, maxlength: 3 },
    // Capped at 28 so the day exists in every month.
    dueDay: { type: Number, required: true, min: 1, max: 28 },
    startDate: { type: Date, required: true },
    endDate: { type: Date, default: null },
    status: { type: String, enum: LEASE_STATUSES, default: 'active' },
    endedAt: { type: Date, default: null },
    notes: { type: String, trim: true, maxlength: 1000, default: '' },
  },
  { timestamps: true }
);

leaseSchema.index({ owner: 1, status: 1, createdAt: -1 });
leaseSchema.index({ tenant: 1, status: 1, createdAt: -1 });
// One active lease per application.
leaseSchema.index({ application: 1 }, { unique: true, partialFilterExpression: { status: 'active' } });

const Lease = mongoose.model('Lease', leaseSchema);

export default Lease;
