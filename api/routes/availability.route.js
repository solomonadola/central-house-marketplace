import express from 'express';
import {
  clearSlots,
  createSlots,
  deleteSlot,
  listSlots,
} from '../controllers/availability.controller.js';
import { optionalAuth, verifyToken } from '../utils/verifyUser.js';
import { requireVerifiedEmail } from '../utils/requireVerifiedEmail.js';
import { validateObjectId } from '../utils/validateObjectId.js';
import { validate } from '../validation/validate.js';
import { createAvailabilitySchema } from '../validation/schemas.js';

const router = express.Router();

router.param('listingId', validateObjectId);
router.param('id', validateObjectId);

router.get('/:listingId', optionalAuth, listSlots);

router.use(verifyToken);
router.post('/:listingId', requireVerifiedEmail, validate(createAvailabilitySchema), createSlots);
router.delete('/slot/:id', deleteSlot);
router.delete('/:listingId', clearSlots);

export default router;
