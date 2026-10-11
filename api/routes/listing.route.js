import express from 'express';
import {
  createListing,
  deleteListing,
  updateListing,
  getListing,
  getListings,
  recordView,
} from '../controllers/listing.controller.js';
import { optionalAuth, verifyToken } from '../utils/verifyUser.js';
import { requireVerifiedEmail } from '../utils/requireVerifiedEmail.js';
import { viewLimiter } from '../utils/rateLimit.js';
import { validateObjectId } from '../utils/validateObjectId.js';
import { validate } from '../validation/validate.js';
import { createListingSchema, updateListingSchema } from '../validation/schemas.js';

const router = express.Router();

router.param('id', validateObjectId);

router.post('/create', verifyToken, requireVerifiedEmail, validate(createListingSchema), createListing);
router.delete('/delete/:id', verifyToken, deleteListing);
router.post('/update/:id', verifyToken, validate(updateListingSchema), updateListing);
router.get('/get/:id', optionalAuth, getListing);
router.post('/view/:id', viewLimiter, recordView);
router.get('/get', getListings);

export default router;
