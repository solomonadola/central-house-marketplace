import ListingDraft from '../models/listingDraft.model.js';
import { errorHandler } from '../utils/error.js';
import { createListingSchema } from '../validation/schemas.js';
import { createListingFor } from './listing.controller.js';

export const MAX_DRAFTS = 10;

const findOwn = (req) => ListingDraft.findOne({ _id: req.params.id, owner: req.user.id });

export const listDrafts = async (req, res, next) => {
  try {
    const drafts = await ListingDraft.find({ owner: req.user.id }).sort({ updatedAt: -1, _id: -1 });
    res.status(200).json(drafts);
  } catch (error) {
    next(error);
  }
};

export const getDraft = async (req, res, next) => {
  try {
    const draft = await findOwn(req);
    if (!draft) return next(errorHandler(404, 'Draft not found!'));
    res.status(200).json(draft);
  } catch (error) {
    next(error);
  }
};

export const createDraft = async (req, res, next) => {
  try {
    const count = await ListingDraft.countDocuments({ owner: req.user.id });
    if (count >= MAX_DRAFTS) {
      return next(errorHandler(400, `You can keep at most ${MAX_DRAFTS} drafts. Publish or delete one first.`));
    }
    const draft = await ListingDraft.create({ owner: req.user.id, data: req.body.data });
    res.status(201).json(draft);
  } catch (error) {
    next(error);
  }
};

export const updateDraft = async (req, res, next) => {
  try {
    const draft = await ListingDraft.findOneAndUpdate(
      { _id: req.params.id, owner: req.user.id },
      { data: req.body.data },
      { new: true }
    );
    if (!draft) return next(errorHandler(404, 'Draft not found!'));
    res.status(200).json(draft);
  } catch (error) {
    next(error);
  }
};

export const deleteDraft = async (req, res, next) => {
  try {
    const result = await ListingDraft.deleteOne({ _id: req.params.id, owner: req.user.id });
    if (result.deletedCount === 0) return next(errorHandler(404, 'Draft not found!'));
    res.status(200).json('Draft deleted!');
  } catch (error) {
    next(error);
  }
};

// Validates the draft as a complete listing, creates it, and removes the
// draft. Validation errors name the first missing or invalid field.
export const publishDraft = async (req, res, next) => {
  try {
    const draft = await findOwn(req);
    if (!draft) return next(errorHandler(404, 'Draft not found!'));

    const result = createListingSchema.safeParse(draft.data ?? {});
    if (!result.success) {
      const issue = result.error.issues[0];
      const field = issue.path.join('.');
      const message = issue.message === 'Required' ? `${field} is required` : issue.message;
      return next(errorHandler(400, `This draft isn't ready to publish: ${message}`));
    }

    const listing = await createListingFor(req.user.id, result.data);
    await draft.deleteOne();
    res.status(201).json(listing);
  } catch (error) {
    next(error);
  }
};
