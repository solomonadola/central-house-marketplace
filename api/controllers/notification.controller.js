import Notification from '../models/notification.model.js';
import { errorHandler } from '../utils/error.js';

const MAX_LIMIT = 100;
const toInt = (value, fallback, min, max) => {
  const n = Number.parseInt(value, 10);
  if (Number.isNaN(n)) return fallback;
  return Math.min(Math.max(n, min), max);
};

// The signed-in user's notifications, newest first. ?unread=true limits the
// list to unread ones; ?limit caps the page size.
export const listNotifications = async (req, res, next) => {
  try {
    const limit = toInt(req.query.limit, 30, 1, MAX_LIMIT);
    const filter = { recipient: req.user.id };
    if (req.query.unread === 'true') filter.read = false;

    const [notifications, total, unreadCount] = await Promise.all([
      Notification.find(filter).sort({ createdAt: -1, _id: -1 }).limit(limit),
      Notification.countDocuments(filter),
      Notification.countDocuments({ recipient: req.user.id, read: false }),
    ]);

    res.set('X-Total-Count', String(total));
    res.status(200).json({ notifications, unreadCount });
  } catch (error) {
    next(error);
  }
};

export const getUnreadCount = async (req, res, next) => {
  try {
    const count = await Notification.countDocuments({ recipient: req.user.id, read: false });
    res.status(200).json({ count });
  } catch (error) {
    next(error);
  }
};

export const markRead = async (req, res, next) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, recipient: req.user.id },
      { read: true, readAt: new Date() },
      { new: true }
    );
    if (!notification) return next(errorHandler(404, 'Notification not found!'));
    res.status(200).json(notification);
  } catch (error) {
    next(error);
  }
};

export const markUnread = async (req, res, next) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, recipient: req.user.id },
      { read: false, readAt: null },
      { new: true }
    );
    if (!notification) return next(errorHandler(404, 'Notification not found!'));
    res.status(200).json(notification);
  } catch (error) {
    next(error);
  }
};

export const markAllRead = async (req, res, next) => {
  try {
    const { modifiedCount } = await Notification.updateMany(
      { recipient: req.user.id, read: false },
      { read: true, readAt: new Date() }
    );
    res.status(200).json({ updated: modifiedCount });
  } catch (error) {
    next(error);
  }
};

export const deleteNotification = async (req, res, next) => {
  try {
    const notification = await Notification.findOneAndDelete({
      _id: req.params.id,
      recipient: req.user.id,
    });
    if (!notification) return next(errorHandler(404, 'Notification not found!'));
    res.status(200).json('Notification deleted!');
  } catch (error) {
    next(error);
  }
};

// Clears the user's whole inbox. ?read=true only removes ones already read.
export const clearNotifications = async (req, res, next) => {
  try {
    const filter = { recipient: req.user.id };
    if (req.query.read === 'true') filter.read = true;
    const { deletedCount } = await Notification.deleteMany(filter);
    res.status(200).json({ deleted: deletedCount });
  } catch (error) {
    next(error);
  }
};
