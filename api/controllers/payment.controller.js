import Payment, { paymentReference } from '../models/payment.model.js';
import Application from '../models/application.model.js';
import Listing from '../models/listing.model.js';
import { errorHandler } from '../utils/error.js';
import { sendCsv, toCsv } from '../utils/csv.js';
import { notifyPaymentReceived, notifyPaymentRefunded } from '../utils/notifications.js';

const populatePayment = (query) =>
  query
    .populate('listing', 'name imageUrls type regularPrice discountPrice')
    .populate('payer', 'username avatar')
    .populate('payee', 'username avatar');

const isParticipant = (payment, userId) =>
  payment.payer.toString() === userId || payment.payee.toString() === userId;

// Starts a holding-deposit payment for an approved application. With a real
// provider this would create a checkout session and return its URL; here we
// create a pending record the provider would later confirm.
export const createPayment = async (req, res, next) => {
  try {
    const { applicationId, amount, currency } = req.body;
    const application = await Application.findById(applicationId, 'applicant owner listing status');
    if (!application) return next(errorHandler(404, 'Application not found!'));
    if (application.applicant.toString() !== req.user.id) {
      return next(errorHandler(403, 'You can only pay a deposit for your own application.'));
    }
    if (application.status !== 'approved') {
      return next(errorHandler(409, 'You can pay a deposit once your application is approved.'));
    }

    const existing = await Payment.exists({ application: application._id });
    if (existing) return next(errorHandler(409, 'A deposit already exists for this application.'));

    const payment = await Payment.create({
      application: application._id,
      listing: application.listing,
      payer: req.user.id,
      payee: application.owner,
      amount,
      currency,
      reference: paymentReference(),
    });

    res.status(201).json(await populatePayment(Payment.findById(payment._id)));
  } catch (error) {
    if (error.code === 11000) return next(errorHandler(409, 'A deposit already exists for this application.'));
    next(error);
  }
};

// Simulates the provider confirming the charge (a webhook in production).
export const confirmPayment = async (req, res, next) => {
  try {
    const payment = await Payment.findById(req.params.id);
    if (!payment || payment.payer.toString() !== req.user.id) {
      return next(errorHandler(404, 'Payment not found!'));
    }
    if (payment.status !== 'pending') return next(errorHandler(409, `This payment is already ${payment.status}.`));

    payment.status = 'paid';
    payment.paidAt = new Date();
    await payment.save();

    const listing = await Listing.findById(payment.listing, 'name');
    await notifyPaymentReceived({
      recipient: payment.payee,
      amount: payment.amount,
      currency: payment.currency,
      listingName: listing?.name,
    });

    res.status(200).json(await populatePayment(Payment.findById(payment._id)));
  } catch (error) {
    next(error);
  }
};

export const cancelPayment = async (req, res, next) => {
  try {
    const payment = await Payment.findById(req.params.id);
    if (!payment || payment.payer.toString() !== req.user.id) {
      return next(errorHandler(404, 'Payment not found!'));
    }
    if (payment.status !== 'pending') return next(errorHandler(409, `This payment is already ${payment.status}.`));

    payment.status = 'cancelled';
    await payment.save();
    res.status(200).json(await populatePayment(Payment.findById(payment._id)));
  } catch (error) {
    next(error);
  }
};

// Only the owner receiving the deposit may refund it.
export const refundPayment = async (req, res, next) => {
  try {
    const payment = await Payment.findById(req.params.id);
    if (!payment || payment.payee.toString() !== req.user.id) {
      return next(errorHandler(404, 'Payment not found!'));
    }
    if (payment.status !== 'paid') return next(errorHandler(409, 'Only a paid deposit can be refunded.'));

    payment.status = 'refunded';
    payment.refundedAt = new Date();
    await payment.save();

    const listing = await Listing.findById(payment.listing, 'name');
    await notifyPaymentRefunded({
      recipient: payment.payer,
      amount: payment.amount,
      currency: payment.currency,
      listingName: listing?.name,
    });

    res.status(200).json(await populatePayment(Payment.findById(payment._id)));
  } catch (error) {
    next(error);
  }
};

// Deposits the user paid (?role=payer, default) or received (?role=payee).
export const listPayments = async (req, res, next) => {
  try {
    const field = req.query.role === 'payee' ? 'payee' : 'payer';
    const payments = await populatePayment(
      Payment.find({ [field]: req.user.id }).sort({ createdAt: -1, _id: -1 }).limit(100)
    );
    res.status(200).json(payments);
  } catch (error) {
    next(error);
  }
};

export const getPayment = async (req, res, next) => {
  try {
    const payment = await populatePayment(Payment.findById(req.params.id));
    if (!payment || !isParticipant(payment, req.user.id)) {
      return next(errorHandler(404, 'Payment not found!'));
    }
    res.status(200).json(payment);
  } catch (error) {
    next(error);
  }
};

const CSV_COLUMNS = [
  { label: 'Reference', value: (p) => p.reference },
  { label: 'Listing', value: (p) => p.listing?.name ?? '' },
  { label: 'Counterparty', value: (p) => p.payer?.username ?? p.payee?.username ?? '' },
  { label: 'Amount', value: (p) => p.amount },
  { label: 'Currency', value: (p) => p.currency },
  { label: 'Status', value: (p) => p.status },
  { label: 'Created', value: (p) => p.createdAt.toISOString() },
  { label: 'Paid at', value: (p) => (p.paidAt ? p.paidAt.toISOString() : '') },
  { label: 'Refunded at', value: (p) => (p.refundedAt ? p.refundedAt.toISOString() : '') },
];

// A CSV of the deposits the caller paid (?role=payee for those received).
export const exportPayments = async (req, res, next) => {
  try {
    const field = req.query.role === 'payee' ? 'payee' : 'payer';
    const payments = await Payment.find({ [field]: req.user.id })
      .sort({ createdAt: -1 })
      .limit(1000)
      .populate('listing', 'name')
      .populate('payer', 'username')
      .populate('payee', 'username');

    sendCsv(res, `central-house-payments-${new Date().toISOString().slice(0, 10)}.csv`, toCsv(CSV_COLUMNS, payments));
  } catch (error) {
    next(error);
  }
};
