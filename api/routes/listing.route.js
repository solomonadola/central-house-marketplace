import express from 'express';
import {
  createListing,
  deleteListing,
  duplicateListing,
  updateListing,
  getListing,
  getListings,
  getListingsByIds,
  getListingsByRecentIds,
  getSimilarListings,
  getPriceHistory,
  getPriceComparison,
  recordView,
  setListingActive,
} from '../controllers/listing.controller.js';
import { optionalAuth, verifyToken } from '../utils/verifyUser.js';
import { requireVerifiedEmail } from '../utils/requireVerifiedEmail.js';
import { viewLimiter } from '../utils/rateLimit.js';
import { validateObjectId } from '../utils/validateObjectId.js';
import { validate } from '../validation/validate.js';
import {
  createListingSchema,
  setListingActiveSchema,
  updateListingSchema,
} from '../validation/schemas.js';

const router = express.Router();

router.param('id', validateObjectId);

router.post('/create', verifyToken, requireVerifiedEmail, validate(createListingSchema), createListing);
router.delete('/delete/:id', verifyToken, deleteListing);
router.post('/update/:id', verifyToken, validate(updateListingSchema), updateListing);
router.post('/:id/active', verifyToken, validate(setListingActiveSchema), setListingActive);
router.post('/:id/duplicate', verifyToken, duplicateListing);
router.get('/get/:id', optionalAuth, getListing);
router.get('/:id/similar', getSimilarListings);
router.get('/:id/price-history', optionalAuth, getPriceHistory);
router.get('/:id/price-comparison', optionalAuth, getPriceComparison);
router.post('/view/:id', viewLimiter, recordView);
router.get('/compare', getListingsByIds);
router.get('/by-ids', getListingsByRecentIds);
router.get('/get', getListings);

export default router;
