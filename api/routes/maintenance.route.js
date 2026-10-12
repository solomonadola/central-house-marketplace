import express from 'express';
import {
  addUpdate,
  createRequest,
  getRequest,
  getSummary,
  listEligibleListings,
  listRequests,
} from '../controllers/maintenance.controller.js';
import { verifyToken } from '../utils/verifyUser.js';
import { validateObjectId } from '../utils/validateObjectId.js';
import { messageLimiter } from '../utils/rateLimit.js';
import { validate } from '../validation/validate.js';
import { createMaintenanceSchema, maintenanceUpdateSchema } from '../validation/schemas.js';

const router = express.Router();

router.param('id', validateObjectId);
router.use(verifyToken);

router.get('/', listRequests);
router.get('/eligible', listEligibleListings);
router.get('/summary', getSummary);
router.post('/', messageLimiter, validate(createMaintenanceSchema), createRequest);
router.get('/:id', getRequest);
router.post('/:id/updates', messageLimiter, validate(maintenanceUpdateSchema), addUpdate);

export default router;
