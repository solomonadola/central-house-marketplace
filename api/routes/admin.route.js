import express from 'express';
import { getStats, listReports, updateReport } from '../controllers/admin.controller.js';
import { validate } from '../validation/validate.js';
import { updateReportSchema } from '../validation/schemas.js';
import { verifyToken } from '../utils/verifyUser.js';
import { requireAdmin } from '../utils/requireAdmin.js';
import { validateObjectId } from '../utils/validateObjectId.js';

const router = express.Router();

router.param('id', validateObjectId);
router.use(verifyToken, requireAdmin);

router.get('/stats', getStats);
router.get('/reports', listReports);
router.patch('/reports/:id', validate(updateReportSchema), updateReport);

export default router;
