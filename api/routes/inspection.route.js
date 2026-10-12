import express from 'express';
import {
  createInspection,
  deleteInspection,
  disputeInspection,
  getInspection,
  listInspections,
  signInspection,
  submitInspection,
  updateInspection,
} from '../controllers/inspection.controller.js';
import { verifyToken } from '../utils/verifyUser.js';
import { validateObjectId } from '../utils/validateObjectId.js';
import { validate } from '../validation/validate.js';
import { createInspectionSchema, disputeInspectionSchema, updateInspectionSchema } from '../validation/schemas.js';

const router = express.Router();

router.param('id', validateObjectId);
router.use(verifyToken);

router.get('/', listInspections);
router.post('/', validate(createInspectionSchema), createInspection);
router.get('/:id', getInspection);
router.patch('/:id', validate(updateInspectionSchema), updateInspection);
router.delete('/:id', deleteInspection);
router.post('/:id/submit', submitInspection);
router.post('/:id/sign', signInspection);
router.post('/:id/dispute', validate(disputeInspectionSchema), disputeInspection);

export default router;
