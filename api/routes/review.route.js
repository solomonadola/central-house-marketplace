import express from 'express';
import {
  deleteReview,
  getListingReviews,
  getOwnerRating,
  replyToReview,
  toggleHelpful,
  upsertReview,
} from '../controllers/review.controller.js';
import { optionalAuth, verifyToken } from '../utils/verifyUser.js';
import { validateObjectId } from '../utils/validateObjectId.js';
import { validate } from '../validation/validate.js';
import { reviewReplySchema, reviewSchema } from '../validation/schemas.js';

const router = express.Router();

router.param('id', validateObjectId);

router.get('/listing/:id', optionalAuth, getListingReviews);
router.post('/listing/:id', verifyToken, validate(reviewSchema), upsertReview);
router.get('/owner/:id', getOwnerRating);
router.post('/:id/helpful', verifyToken, toggleHelpful);
router.patch('/:id/reply', verifyToken, validate(reviewReplySchema), replyToReview);
router.delete('/:id', verifyToken, deleteReview);

export default router;
