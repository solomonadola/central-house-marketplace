import express from 'express';
import {
  createLease,
  endLease,
  exportLedger,
  getLease,
  listLeaseCandidates,
  listLeases,
  payCharge,
  recordPayment,
  waiveCharge,
} from '../controllers/lease.controller.js';
import { verifyToken } from '../utils/verifyUser.js';
import { validateObjectId } from '../utils/validateObjectId.js';
import { validate } from '../validation/validate.js';
import { createLeaseSchema, endLeaseSchema, recordRentPaymentSchema, waiveRentSchema } from '../validation/schemas.js';

const router = express.Router();

router.param('id', validateObjectId);
router.param('chargeId', validateObjectId);
router.use(verifyToken);

router.get('/', listLeases);
router.get('/candidates', listLeaseCandidates);
router.post('/', validate(createLeaseSchema), createLease);
router.get('/:id', getLease);
router.get('/:id/export', exportLedger);
router.post('/:id/end', validate(endLeaseSchema), endLease);
router.post('/:id/charges/:chargeId/pay', payCharge);
router.post('/:id/charges/:chargeId/record', validate(recordRentPaymentSchema), recordPayment);
router.post('/:id/charges/:chargeId/waive', validate(waiveRentSchema), waiveCharge);

export default router;
