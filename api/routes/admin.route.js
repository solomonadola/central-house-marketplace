import express from 'express';
import {
  exportReports,
  getStats,
  getUserDetail,
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
import { getAuditSummary, listAuditLogs } from '../controllers/auditLog.controller.js';
import {
  dismissFlags,
  listFlaggedContent,
  listRemovedContent,
  removeContent,
  restoreContent,
} from '../controllers/contentFlag.controller.js';
import { verifyToken } from '../utils/verifyUser.js';
import { requireAdmin } from '../utils/requireAdmin.js';
import { validateObjectId } from '../utils/validateObjectId.js';

const router = express.Router();

router.param('id', validateObjectId);
router.use(verifyToken, requireAdmin);

router.get('/stats', getStats);
router.get('/reports', listReports);
router.get('/reports/export', exportReports);
router.patch('/reports/:id', validate(updateReportSchema), updateReport);
router.get('/listings/hidden', listHiddenListings);
router.post('/listings/:id/hide', validate(moderationReasonSchema), hideListing);
router.post('/listings/:id/unhide', unhideListing);
router.get('/users', listUsers);
router.get('/users/:id', getUserDetail);
router.post('/users/:id/suspend', validate(moderationReasonSchema), suspendUser);
router.post('/users/:id/unsuspend', unsuspendUser);

router.get('/content/flagged', listFlaggedContent);
router.get('/content/removed', listRemovedContent);
router.post('/content/:type/:id/remove', validate(moderationReasonSchema), removeContent);
router.post('/content/:type/:id/restore', restoreContent);
router.post('/content/:type/:id/dismiss', dismissFlags);

router.get('/audit', listAuditLogs);
router.get('/audit/summary', getAuditSummary);

export default router;
