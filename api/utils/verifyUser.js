import jwt from 'jsonwebtoken';
import { errorHandler } from './error.js';
import { clearAuthCookie } from './authCookie.js';
import User from '../models/user.model.js';

export const suspendedError = () =>
  errorHandler(403, 'Your account has been suspended. Please contact support.', 'ACCOUNT_SUSPENDED');

// Checks the auth cookie and that the account is still allowed in: it
// exists, isn't suspended, and the session hasn't been revoked. Sets
// req.user = { id, role }.
export const verifyToken = (req, res, next) => {
  const token = req.cookies.access_token;

  if (!token) return next(errorHandler(401, 'Unauthorized', 'AUTH_REQUIRED'));

  jwt.verify(token, process.env.JWT_SECRET, async (err, payload) => {
    // Expired or tampered token: the session is no longer valid.
    if (err) return next(errorHandler(401, 'Session expired, please sign in again', 'AUTH_REQUIRED'));

    try {
      const user = await User.findById(payload.id, 'role suspended +tokenVersion').lean();
      if (!user || (payload.tv ?? 0) !== (user.tokenVersion ?? 0)) {
        return next(errorHandler(401, 'Session expired, please sign in again', 'AUTH_REQUIRED'));
      }
      if (user.suspended) {
        clearAuthCookie(res);
        return next(suspendedError());
      }
      req.user = { id: payload.id, role: user.role ?? 'user' };
      next();
    } catch (error) {
      next(error);
    }
  });
};

// For public routes that show extra info to signed-in users: sets req.user
// when a valid token is present, and carries on anonymously otherwise.
export const optionalAuth = (req, res, next) => {
  const token = req.cookies.access_token;
  if (!token) return next();

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (!err) req.user = user;
    next();
  });
};
