import express from 'express';
import {
  createSavedSearch,
  deleteSavedSearch,
  listSavedSearches,
  updateSavedSearch,
} from '../controllers/savedSearch.controller.js';
import { verifyToken } from '../utils/verifyUser.js';
import { validateObjectId } from '../utils/validateObjectId.js';
import { validate } from '../validation/validate.js';
import { createSavedSearchSchema, updateSavedSearchSchema } from '../validation/schemas.js';

const router = express.Router();

router.param('id', validateObjectId);
router.use(verifyToken);

router.get('/', listSavedSearches);
router.post('/', validate(createSavedSearchSchema), createSavedSearch);
router.patch('/:id', validate(updateSavedSearchSchema), updateSavedSearch);
router.delete('/:id', deleteSavedSearch);

export default router;
