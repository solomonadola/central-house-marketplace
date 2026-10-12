import express from 'express';
import { flagContent } from '../controllers/contentFlag.controller.js';
import { verifyToken } from '../utils/verifyUser.js';
import { messageLimiter } from '../utils/rateLimit.js';
import { validate } from '../validation/validate.js';
import { flagContentSchema } from '../validation/schemas.js';

const router = express.Router();

router.post('/', verifyToken, messageLimiter, validate(flagContentSchema), flagContent);

export default router;
