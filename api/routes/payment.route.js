import express from 'express';
import {
  cancelPayment,
  confirmPayment,
  createPayment,
  exportPayments,
  getPayment,
  listPayments,
  refundPayment,
} from '../controllers/payment.controller.js';
import { verifyToken } from '../utils/verifyUser.js';
import { validateObjectId } from '../utils/validateObjectId.js';
import { validate } from '../validation/validate.js';
import { createPaymentSchema } from '../validation/schemas.js';

const router = express.Router();

router.param('id', validateObjectId);
router.use(verifyToken);

router.get('/', listPayments);
router.get('/export', exportPayments);
router.post('/', validate(createPaymentSchema), createPayment);
router.get('/:id', getPayment);
router.post('/:id/confirm', confirmPayment);
router.post('/:id/cancel', cancelPayment);
router.post('/:id/refund', refundPayment);

export default router;
