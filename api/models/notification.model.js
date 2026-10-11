import mongoose from 'mongoose';

// Every kind of event a user can be told about. Kept in one list so the
// schema, the client icons and the tests all agree on the vocabulary.
export const NOTIFICATION_TYPES = [
  'message',
  'viewing_requested',
  'viewing_accepted',
  'viewing_declined',
  'viewing_cancelled',
  'review',
  'report_received',
  'report_resolved',
  'listing_hidden',
  'listing_unhidden',
  'account_suspended',
  'account_unsuspended',
  'saved_search_match',
  'listing_deleted',
  'application_received',
  'application_status',
  'payment_received',
  'payment_refunded',
  'price_drop',
];

const notificationSchema = new mongoose.Schema(
  {
    recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, enum: NOTIFICATION_TYPES, required: true },
    title: { type: String, trim: true, maxlength: 120, required: true },
    body: { type: String, trim: true, maxlength: 500, default: '' },
    // Client-side route to open when the notification is clicked.
    link: { type: String, trim: true, maxlength: 300, default: '' },
    // A small snapshot of the event (ids, names) so the client can render
    // without extra requests. Deliberately schema-less.
    meta: { type: mongoose.Schema.Types.Mixed, default: {} },
    read: { type: Boolean, default: false },
    readAt: { type: Date, default: null },
  },
  { timestamps: true }
);

// The inbox query (recipient, newest first) and the unread badge both walk
// this index.
notificationSchema.index({ recipient: 1, read: 1, createdAt: -1 });
// Old notifications don't need to live forever; a TTL keeps the collection
// tidy. 90 days is long enough to catch up after a break.
notificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });

const Notification = mongoose.model('Notification', notificationSchema);

export default Notification;
