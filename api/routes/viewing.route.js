import express from 'express';
import { createViewing, exportViewings, listViewings, updateViewing } from '../controllers/viewing.controller.js';
import { verifyToken } from '../utils/verifyUser.js';
import { validateObjectId } from '../utils/validateObjectId.js';
import { messageLimiter } from '../utils/rateLimit.js';
import { validate } from '../validation/validate.js';
import { createViewingSchema, updateViewingSchema } from '../validation/schemas.js';

const router = express.Router();

router.param('id', validateObjectId);
router.use(verifyToken);

router.get('/', listViewings);
router.get('/export', exportViewings);
router.post('/', messageLimiter, validate(createViewingSchema), createViewing);
router.patch('/:id', validate(updateViewingSchema), updateViewing);

export default router;
