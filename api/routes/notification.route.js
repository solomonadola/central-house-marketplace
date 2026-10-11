import express from 'express';
import {
  clearNotifications,
  deleteNotification,
  getUnreadCount,
  listNotifications,
  markAllRead,
  markRead,
  markUnread,
} from '../controllers/notification.controller.js';
import { verifyToken } from '../utils/verifyUser.js';
import { validateObjectId } from '../utils/validateObjectId.js';

const router = express.Router();

router.param('id', validateObjectId);
router.use(verifyToken);

router.get('/', listNotifications);
router.get('/unread-count', getUnreadCount);
router.post('/read-all', markAllRead);
router.patch('/:id/read', markRead);
router.patch('/:id/unread', markUnread);
router.delete('/', clearNotifications);
router.delete('/:id', deleteNotification);

export default router;
