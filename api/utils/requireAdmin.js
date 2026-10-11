import { errorHandler } from './error.js';

// Use after verifyToken, which loads the role fresh from the database, so
// removing someone's admin rights takes effect immediately.
export const requireAdmin = (req, res, next) => {
  if (req.user?.role !== 'admin') return next(errorHandler(403, 'Admins only!'));
  next();
};
