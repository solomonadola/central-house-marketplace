import express from 'express';
import {
  getStats,
  hideListing,
  listHiddenListings,
  listReports,
  listUsers,
  suspendUser,
  unsuspendUser,
  unhideListing,
  updateReport,
} from '../controllers/admin.controller.js';
import { validate } from '../validation/validate.js';
import { moderationReasonSchema, updateReportSchema } from '../validation/schemas.js';
import { verifyToken } from '../utils/verifyUser.js';
import { requireAdmin } from '../utils/requireAdmin.js';
import { validateObjectId } from '../utils/validateObjectId.js';

const router = express.Router();

router.param('id', validateObjectId);
router.use(verifyToken, requireAdmin);

router.get('/stats', getStats);
router.get('/reports', listReports);
router.patch('/reports/:id', validate(updateReportSchema), updateReport);
router.get('/listings/hidden', listHiddenListings);
router.post('/listings/:id/hide', validate(moderationReasonSchema), hideListing);
router.post('/listings/:id/unhide', unhideListing);
router.get('/users', listUsers);
router.post('/users/:id/suspend', validate(moderationReasonSchema), suspendUser);
router.post('/users/:id/unsuspend', unsuspendUser);

export default router;
