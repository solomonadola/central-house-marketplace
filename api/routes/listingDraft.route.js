import express from 'express';
import {
  createDraft,
  deleteDraft,
  getDraft,
  listDrafts,
  publishDraft,
  updateDraft,
} from '../controllers/listingDraft.controller.js';
import { verifyToken } from '../utils/verifyUser.js';
import { requireVerifiedEmail } from '../utils/requireVerifiedEmail.js';
import { validateObjectId } from '../utils/validateObjectId.js';
import { validate } from '../validation/validate.js';
import { listingDraftSchema } from '../validation/schemas.js';

const router = express.Router();

router.param('id', validateObjectId);
router.use(verifyToken);

router.get('/', listDrafts);
router.post('/', validate(listingDraftSchema), createDraft);
router.get('/:id', getDraft);
router.put('/:id', validate(listingDraftSchema), updateDraft);
router.delete('/:id', deleteDraft);
// Publishing creates a real listing, which needs a confirmed email.
router.post('/:id/publish', requireVerifiedEmail, publishDraft);

export default router;
