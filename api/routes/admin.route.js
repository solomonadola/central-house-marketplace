import express from 'express';
import { getStats } from '../controllers/admin.controller.js';
import { verifyToken } from '../utils/verifyUser.js';
import { requireAdmin } from '../utils/requireAdmin.js';
import { validateObjectId } from '../utils/validateObjectId.js';

const router = express.Router();

router.param('id', validateObjectId);
router.use(verifyToken, requireAdmin);

router.get('/stats', getStats);

export default router;
