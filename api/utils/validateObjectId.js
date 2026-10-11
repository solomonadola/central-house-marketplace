import mongoose from 'mongoose';
import { errorHandler } from './error.js';

// For use with router.param('id', ...): rejects malformed ids with a 400
// instead of letting Mongoose throw a CastError deeper in the handler.
export const validateObjectId = (req, res, next, id) => {
  if (!mongoose.isValidObjectId(id)) {
    return next(errorHandler(400, 'Invalid id!'));
  }
  next();
};
