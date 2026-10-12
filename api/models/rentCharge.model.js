import { randomBytes } from 'crypto';
import mongoose from 'mongoose';

export const RENT_CHARGE_STATUSES = ['unpaid', 'paid', 'waived'];
// 'online' is a payment the tenant made in the app; the others are payments
// the owner received outside it and recorded by hand.
export const RENT_PAYMENT_METHODS = ['online', 'bank_transfer', 'cash', 'check', 'other'];

export const rentReference = () => `RENT-${randomBytes(5).toString('hex').toUpperCase()}`;

// One month's rent on a lease. Created on demand for every month the lease
// has run (see syncCharges in the lease controller), never for future months.
const rentChargeSchema = new mongoose.Schema(
  {
    lease: { type: mongoose.Schema.Types.ObjectId, ref: 'Lease', required: true },
    // 'YYYY-MM'
    period: { type: String, required: true, match: /^\d{4}-\d{2}$/ },
    amount: { type: Number, required: true, min: 0 },
    dueDate: { type: Date, required: true },
    status: { type: String, enum: RENT_CHARGE_STATUSES, default: 'unpaid' },
    method: { type: String, enum: [...RENT_PAYMENT_METHODS, null], default: null },
    reference: { type: String, default: null },
    paidAt: { type: Date, default: null },
    note: { type: String, trim: true, maxlength: 300, default: '' },
    // Who marked it paid or waived.
    settledBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true }
);

rentChargeSchema.index({ lease: 1, period: 1 }, { unique: true });

const RentCharge = mongoose.model('RentCharge', rentChargeSchema);

export default RentCharge;
