import express from 'express';
import {
  createQuickReply,
  deleteQuickReply,
  listQuickReplies,
  updateQuickReply,
} from '../controllers/quickReply.controller.js';
import { verifyToken } from '../utils/verifyUser.js';
import { validateObjectId } from '../utils/validateObjectId.js';
import { validate } from '../validation/validate.js';
import { createQuickReplySchema, updateQuickReplySchema } from '../validation/schemas.js';

const router = express.Router();

router.param('id', validateObjectId);
router.use(verifyToken);

router.get('/', listQuickReplies);
router.post('/', validate(createQuickReplySchema), createQuickReply);
router.patch('/:id', validate(updateQuickReplySchema), updateQuickReply);
router.delete('/:id', deleteQuickReply);

export default router;
