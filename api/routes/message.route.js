import express from 'express';
import {
  getConversation,
  getUnreadCount,
  listConversations,
  sendMessage,
  startConversation,
} from '../controllers/message.controller.js';
import { verifyToken } from '../utils/verifyUser.js';
import { validateObjectId } from '../utils/validateObjectId.js';
import { messageLimiter } from '../utils/rateLimit.js';
import { validate } from '../validation/validate.js';
import { sendMessageSchema, startConversationSchema } from '../validation/schemas.js';

const router = express.Router();

router.param('id', validateObjectId);
router.use(verifyToken);

router.get('/conversations', listConversations);
router.get('/conversations/:id', getConversation);
router.get('/unread-count', getUnreadCount);
router.post('/conversations', messageLimiter, validate(startConversationSchema), startConversation);
router.post('/conversations/:id/messages', messageLimiter, validate(sendMessageSchema), sendMessage);

export default router;
