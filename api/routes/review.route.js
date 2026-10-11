import express from 'express';
import {
  deleteReview,
  getListingReviews,
  getOwnerRating,
  upsertReview,
} from '../controllers/review.controller.js';
import { optionalAuth, verifyToken } from '../utils/verifyUser.js';
import { validateObjectId } from '../utils/validateObjectId.js';
import { validate } from '../validation/validate.js';
import { reviewSchema } from '../validation/schemas.js';

const router = express.Router();

router.param('id', validateObjectId);

router.get('/listing/:id', optionalAuth, getListingReviews);
router.post('/listing/:id', verifyToken, validate(reviewSchema), upsertReview);
router.get('/owner/:id', getOwnerRating);
router.delete('/:id', verifyToken, deleteReview);

export default router;
