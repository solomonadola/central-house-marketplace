import Notification from '../models/notification.model.js';
import User from '../models/user.model.js';
import { notificationEmail } from './emails.js';
import { appUrl, sendMail } from './mailer.js';

// Creates a notification for one user and, when asked, also emails them.
// This is called from controllers after the action has already succeeded,
// so it must never throw: a failed notification should not turn a
// successful request into an error. Failures are logged and swallowed.
export const notify = async ({ recipient, type, title, body = '', link = '', meta = {}, email = false }) => {
  if (!recipient) return null;
  try {
    const notification = await Notification.create({ recipient, type, title, body, link, meta });

    if (email) {
      const user = await User.findById(recipient, 'username email emailNotifications');
      if (user?.email && user.emailNotifications !== false) {
        const content = notificationEmail({
          username: user.username,
          title,
          body,
          url: link ? `${appUrl()}${link}` : appUrl(),
        });
        await sendMail({ to: user.email, ...content });
      }
    }

    return notification;
  } catch (error) {
    // Keep the request that triggered this from failing.
    console.error('Failed to create notification:', error.message);
    return null;
  }
};

// Fans a notification out to several recipients at once.
export const notifyMany = (recipients, payload) =>
  Promise.all(
    [...new Set(recipients.map((r) => String(r)))].map((recipient) =>
      notify({ ...payload, recipient })
    )
  );

// Sends a notification to every admin, e.g. when a listing is reported.
export const notifyAdmins = async (payload) => {
  try {
    const admins = await User.find({ role: 'admin' }, '_id');
    return notifyMany(admins.map((a) => a._id), payload);
  } catch (error) {
    console.error('Failed to notify admins:', error.message);
    return [];
  }
};

// --- Event-specific builders -------------------------------------------
// These keep controllers readable and make sure every notification of a
// given type has a consistent title, body and destination.

export const notifyNewMessage = ({ recipient, senderName, listingName, conversationId }) =>
  notify({
    recipient,
    type: 'message',
    title: `New message from ${senderName}`,
    body: listingName ? `About "${listingName}"` : '',
    link: `/messages/${conversationId}`,
    meta: { conversationId },
  });

export const notifyViewingRequested = ({ recipient, requesterName, listingName, viewingId }) =>
  notify({
    recipient,
    type: 'viewing_requested',
    title: `${requesterName} requested a viewing`,
    body: listingName ? `For "${listingName}"` : '',
    link: '/viewings?as=owner',
    meta: { viewingId },
    email: true,
  });

export const notifyViewingResponse = ({ recipient, status, listingName, viewingId }) => {
  const verb = { accepted: 'accepted', declined: 'declined', cancelled: 'cancelled' }[status] ?? status;
  const type =
    status === 'accepted'
      ? 'viewing_accepted'
      : status === 'declined'
        ? 'viewing_declined'
        : 'viewing_cancelled';
  return notify({
    recipient,
    type,
    title: `Viewing ${verb}`,
    body: listingName ? `For "${listingName}"` : '',
    link: '/viewings',
    meta: { viewingId },
    email: true,
  });
};

export const notifyNewReview = ({ recipient, authorName, rating, listingName, listingId }) =>
  notify({
    recipient,
    type: 'review',
    title: `${authorName} left a ${rating}-star review`,
    body: listingName ? `On "${listingName}"` : '',
    link: listingId ? `/listing/${listingId}` : '',
    meta: { listingId, rating },
  });

export const notifyReportReceived = ({ listingName, listingId }) =>
  notifyAdmins({
    type: 'report_received',
    title: 'New listing report',
    body: listingName ? `"${listingName}" was reported.` : 'A listing was reported.',
    link: '/admin',
    meta: { listingId },
  });

export const notifyListingModerated = ({ recipient, hidden, listingName, listingId, reason }) =>
  notify({
    recipient,
    type: hidden ? 'listing_hidden' : 'listing_unhidden',
    title: hidden ? 'Your listing was hidden' : 'Your listing was restored',
    body: reason ? `"${listingName}": ${reason}` : listingName ? `"${listingName}"` : '',
    link: listingId ? `/listing/${listingId}` : '/analytics',
    meta: { listingId, reason },
    email: true,
  });

export const notifyAccountStatus = ({ recipient, suspended, reason }) =>
  notify({
    recipient,
    type: suspended ? 'account_suspended' : 'account_unsuspended',
    title: suspended ? 'Your account was suspended' : 'Your account was reinstated',
    body: reason || (suspended ? 'Contact support if you think this is a mistake.' : 'Welcome back.'),
    email: true,
  });

export const notifySavedSearchMatch = ({ recipients, listingId, listingName, savedSearchId }) =>
  notifyMany(recipients, {
    type: 'saved_search_match',
    title: `New match: ${listingName}`,
    body: 'A new listing matches one of your saved searches.',
    link: `/listing/${listingId}`,
    meta: { listingId, savedSearchId },
  });

export const notifyListingDeleted = ({ recipient, listingName }) =>
  notify({
    recipient,
    type: 'listing_deleted',
    title: 'A saved listing was removed',
    body: listingName ? `"${listingName}" is no longer available.` : '',
  });

export const notifyApplicationReceived = ({ recipient, applicantName, listingName, listingId }) =>
  notify({
    recipient,
    type: 'application_received',
    title: `${applicantName} applied`,
    body: listingName ? `For "${listingName}"` : '',
    link: '/applications?role=owner',
    meta: { listingId },
    email: true,
  });

export const notifyApplicationStatus = ({ recipient, status, listingName, listingId }) => {
  const verb =
    { under_review: 'is under review', approved: 'was approved', rejected: 'was declined' }[status] ?? status;
  return notify({
    recipient,
    type: 'application_status',
    title: `Your application ${verb}`,
    body: listingName ? `For "${listingName}"` : '',
    link: '/applications',
    meta: { listingId, status },
    email: true,
  });
};

const money = (amount, currency = 'USD') =>
  `${currency === 'USD' ? '$' : ''}${Number(amount).toLocaleString('en-US')}${currency === 'USD' ? '' : ` ${currency}`}`;

export const notifyPaymentReceived = ({ recipient, amount, currency, listingName }) =>
  notify({
    recipient,
    type: 'payment_received',
    title: 'A holding deposit was paid',
    body: `${money(amount, currency)}${listingName ? ` for "${listingName}"` : ''}`,
    link: '/payments?role=payee',
    email: true,
  });

export const notifyPaymentRefunded = ({ recipient, amount, currency, listingName }) =>
  notify({
    recipient,
    type: 'payment_refunded',
    title: 'Your deposit was refunded',
    body: `${money(amount, currency)}${listingName ? ` for "${listingName}"` : ''}`,
    link: '/payments',
    email: true,
  });


export const notifyPriceDrop = ({ recipient, listingId, listingName, oldPrice, newPrice, perMonth }) =>
  notify({
    recipient,
    type: 'price_drop',
    title: `Price drop on "${listingName}"`,
    body: `Now ${money(newPrice)}${perMonth ? ' / month' : ''}, down from ${money(oldPrice)}.`,
    link: `/listing/${listingId}`,
    meta: { listingId, oldPrice, newPrice },
    email: true,
  });

export const notifyQuestionAsked = ({ recipient, askerName, listingId, listingName }) =>
  notify({
    recipient,
    type: 'question_asked',
    title: `${askerName} asked a question`,
    body: `About "${listingName}"`,
    link: `/listing/${listingId}#questions`,
    meta: { listingId },
    email: true,
  });

export const notifyQuestionAnswered = ({ recipient, listingId, listingName }) =>
  notify({
    recipient,
    type: 'question_answered',
    title: 'Your question was answered',
    body: `About "${listingName}"`,
    link: `/listing/${listingId}#questions`,
    meta: { listingId },
  });

export const notifyOpenHouseCancelled = ({ recipients, listingId, listingName, when }) =>
  notifyMany(recipients, {
    type: 'open_house_cancelled',
    title: 'An open house you planned to attend was cancelled',
    body: `"${listingName}" on ${when}`,
    link: `/listing/${listingId}`,
    meta: { listingId },
    email: true,
  });

export const notifyMaintenanceRequested = ({ recipient, tenantName, title, urgency, requestId }) =>
  notify({
    recipient,
    type: 'maintenance_request',
    title: `${urgency === 'urgent' ? 'Urgent: ' : ''}${tenantName} reported a problem`,
    body: title,
    link: `/maintenance/${requestId}`,
    meta: { requestId },
    email: true,
  });

const STATUS_WORDS = { open: 'reopened', in_progress: 'in progress', resolved: 'resolved', closed: 'closed' };

export const notifyMaintenanceUpdated = ({ recipient, authorName, title, status, requestId }) =>
  notify({
    recipient,
    type: 'maintenance_update',
    title: status ? `"${title}" is now ${STATUS_WORDS[status]}` : `${authorName} replied about "${title}"`,
    body: status ? `Updated by ${authorName}` : '',
    link: `/maintenance/${requestId}`,
    meta: { requestId, status: status ?? null },
  });

export const notifyLeaseCreated = ({ recipient, ownerName, listingName, monthlyRent, currency, leaseId }) =>
  notify({
    recipient,
    type: 'lease_created',
    title: `${ownerName} set up your lease`,
    body: `"${listingName}" at ${money(monthlyRent, currency)} / month`,
    link: `/leases/${leaseId}`,
    meta: { leaseId },
    email: true,
  });

export const notifyLeaseEnded = ({ recipient, listingName, endDate, leaseId }) =>
  notify({
    recipient,
    type: 'lease_ended',
    title: `Your lease for "${listingName}" has ended`,
    body: `Last day: ${new Date(endDate).toLocaleDateString('en-US', { dateStyle: 'medium', timeZone: 'UTC' })}`,
    link: `/leases/${leaseId}`,
    meta: { leaseId },
    email: true,
  });

export const notifyRentPaid = ({ recipient, tenantName, amount, currency, periodLabel, leaseId }) =>
  notify({
    recipient,
    type: 'rent_paid',
    title: `${tenantName} paid rent for ${periodLabel}`,
    body: money(amount, currency),
    link: `/leases/${leaseId}`,
    meta: { leaseId },
  });

export const notifyRentWaived = ({ recipient, amount, currency, periodLabel, leaseId }) =>
  notify({
    recipient,
    type: 'rent_waived',
    title: `Rent for ${periodLabel} was waived`,
    body: `${money(amount, currency)} no longer owed`,
    link: `/leases/${leaseId}`,
    meta: { leaseId },
  });
