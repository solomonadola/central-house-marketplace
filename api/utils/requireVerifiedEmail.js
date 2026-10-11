import User from '../models/user.model.js';
import { errorHandler } from './error.js';

// Use after verifyToken on actions that need a confirmed email address.
export const requireVerifiedEmail = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id, 'emailVerified');
    if (!user) return next(errorHandler(401, 'Unauthorized', 'AUTH_REQUIRED'));
    if (!user.emailVerified) {
      return next(
        errorHandler(403, 'Please confirm your email address before posting listings.', 'EMAIL_NOT_VERIFIED')
      );
    }
    next();
  } catch (error) {
    next(error);
  }
};
