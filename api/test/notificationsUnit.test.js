import { describe, expect, it, vi } from 'vitest';
import Notification from '../models/notification.model.js';
import User from '../models/user.model.js';
import {
  notifyAccountStatus,
  notifyAdmins,
  notifyNewMessage,
  notifyPaymentReceived,
  notifyViewingResponse,
} from '../utils/notifications.js';
import { createUser } from './helpers.js';

describe('notification builders', () => {
  it('builds a message notification with a conversation link', async () => {
    const recipient = await createUser();
    await notifyNewMessage({
      recipient: recipient._id,
      senderName: 'maria',
      listingName: 'Sunny Loft',
      conversationId: 'c1',
    });

    const note = await Notification.findOne({ recipient: recipient._id });
    expect(note).toMatchObject({ type: 'message', title: 'New message from maria', link: '/messages/c1' });
  });

  it('marks accepted viewings correctly', async () => {
    const recipient = await createUser();
    await notifyViewingResponse({ recipient: recipient._id, status: 'accepted', listingName: 'Loft' });

    const note = await Notification.findOne({ recipient: recipient._id });
    expect(note).toMatchObject({ type: 'viewing_accepted', title: 'Viewing accepted' });
  });

  it('formats a payment amount', async () => {
    const recipient = await createUser();
    await notifyPaymentReceived({ recipient: recipient._id, amount: 1500, currency: 'USD', listingName: 'Loft' });

    const note = await Notification.findOne({ recipient: recipient._id });
    expect(note.body).toContain('$1,500');
  });

  it('notifies every admin', async () => {
    const adminA = await createUser({ role: 'admin' });
    const adminB = await createUser({ role: 'admin' });
    await createUser({ role: 'user' });

    const created = await notifyAdmins({ type: 'report_received', title: 'Report' });

    expect(created).toHaveLength(2);
    expect(await Notification.countDocuments()).toBe(2);
    expect(await Notification.countDocuments({ recipient: adminA._id })).toBe(1);
    expect(await Notification.countDocuments({ recipient: adminB._id })).toBe(1);
  });

  it('records account status changes', async () => {
    const recipient = await createUser();
    await notifyAccountStatus({ recipient: recipient._id, suspended: true, reason: 'Spam' });

    const note = await Notification.findOne({ recipient: recipient._id });
    expect(note).toMatchObject({ type: 'account_suspended', body: 'Spam' });
  });

  it('reads recipients from the database for email preferences', async () => {
    const recipient = await createUser({ emailNotifications: false });
    const findById = vi.spyOn(User, 'findById');

    await notifyAccountStatus({ recipient: recipient._id, suspended: false });

    // email: true builder still looks up the user, but respects the opt-out.
    expect(findById).toHaveBeenCalled();
    expect(await Notification.countDocuments({ recipient: recipient._id })).toBe(1);
  });
});
