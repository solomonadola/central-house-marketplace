import express from 'express';
import {
  createApplication,
  deleteApplication,
  exportApplications,
  getApplication,
  listApplications,
  updateApplication,
} from '../controllers/application.controller.js';
import { verifyToken } from '../utils/verifyUser.js';
import { requireVerifiedEmail } from '../utils/requireVerifiedEmail.js';
import { validateObjectId } from '../utils/validateObjectId.js';
import { validate } from '../validation/validate.js';
import { createApplicationSchema, updateApplicationSchema } from '../validation/schemas.js';

const router = express.Router();

router.param('id', validateObjectId);
router.use(verifyToken);

router.get('/', listApplications);
router.get('/export', exportApplications);
router.post('/', requireVerifiedEmail, validate(createApplicationSchema), createApplication);
router.get('/:id', getApplication);
router.patch('/:id', validate(updateApplicationSchema), updateApplication);
router.delete('/:id', deleteApplication);

export default router;
