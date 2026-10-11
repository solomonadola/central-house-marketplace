import { randomBytes } from 'crypto';
import mongoose from 'mongoose';

// A refundable holding deposit an approved applicant pays to reserve a home.
// Payment is simulated: creating one is "pending" until the provider
// confirms it (see the payment controller). A real integration would drive
// the confirm/refund transitions from provider webhooks instead.
export const PAYMENT_STATUSES = ['pending', 'paid', 'refunded', 'cancelled'];

export const paymentReference = () => `DEP-${randomBytes(6).toString('hex').toUpperCase()}`;

const paymentSchema = new mongoose.Schema(
  {
    application: { type: mongoose.Schema.Types.ObjectId, ref: 'Application', required: true, unique: true },
    listing: { type: mongoose.Schema.Types.ObjectId, ref: 'Listing', required: true },
    payer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    payee: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    amount: { type: Number, required: true, min: 1, max: 10_000_000 },
    currency: { type: String, default: 'USD', uppercase: true, maxlength: 3 },
    status: { type: String, enum: PAYMENT_STATUSES, default: 'pending' },
    // Public-looking reference shown to both sides.
    reference: { type: String, required: true, unique: true },
    paidAt: { type: Date, default: null },
    refundedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

paymentSchema.index({ payer: 1, createdAt: -1 });
paymentSchema.index({ payee: 1, createdAt: -1 });
paymentSchema.index({ status: 1 });

const Payment = mongoose.model('Payment', paymentSchema);

export default Payment;
