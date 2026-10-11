import express from 'express';
import {
  cancelOpenHouse,
  cancelRsvp,
  createOpenHouse,
  listForListing,
  listMine,
  listUpcoming,
  rsvp,
} from '../controllers/openHouse.controller.js';
import { optionalAuth, verifyToken } from '../utils/verifyUser.js';
import { validateObjectId } from '../utils/validateObjectId.js';
import { validate } from '../validation/validate.js';
import { createOpenHouseSchema } from '../validation/schemas.js';

const router = express.Router();

router.param('id', validateObjectId);

router.get('/upcoming', optionalAuth, listUpcoming);
router.get('/mine', verifyToken, listMine);
router.get('/listing/:id', optionalAuth, listForListing);
router.post('/listing/:id', verifyToken, validate(createOpenHouseSchema), createOpenHouse);
router.post('/:id/rsvp', verifyToken, rsvp);
router.delete('/:id/rsvp', verifyToken, cancelRsvp);
router.post('/:id/cancel', verifyToken, cancelOpenHouse);

export default router;
