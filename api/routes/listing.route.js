import express from 'express';
import { createListing, deleteListing, updateListing, getListing, getListings } from '../controllers/listing.controller.js';
import { verifyToken } from '../utils/verifyUser.js';
import { validateObjectId } from '../utils/validateObjectId.js';
import { validate } from '../validation/validate.js';
import { createListingSchema, updateListingSchema } from '../validation/schemas.js';

const router = express.Router();

router.param('id', validateObjectId);

router.post('/create', verifyToken, validate(createListingSchema), createListing);
router.delete('/delete/:id', verifyToken, deleteListing);
router.post('/update/:id', verifyToken, validate(updateListingSchema), updateListing);
router.get('/get/:id', getListing);
router.get('/get', getListings);

export default router;
