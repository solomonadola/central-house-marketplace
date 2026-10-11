import express from 'express';
import { sendMessage, startConversation } from '../controllers/message.controller.js';
import { verifyToken } from '../utils/verifyUser.js';
import { validateObjectId } from '../utils/validateObjectId.js';
import { messageLimiter } from '../utils/rateLimit.js';
import { validate } from '../validation/validate.js';
import { sendMessageSchema, startConversationSchema } from '../validation/schemas.js';

const router = express.Router();

router.param('id', validateObjectId);
router.use(verifyToken);

router.post('/conversations', messageLimiter, validate(startConversationSchema), startConversation);
router.post('/conversations/:id/messages', messageLimiter, validate(sendMessageSchema), sendMessage);

export default router;
