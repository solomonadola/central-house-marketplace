import jwt from 'jsonwebtoken';
import { errorHandler } from './error.js';

export const verifyToken = (req, res, next) => {
  const token = req.cookies.access_token;

  if (!token) return next(errorHandler(401, 'Unauthorized', 'AUTH_REQUIRED'));

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    // Expired or tampered token: the session is no longer valid.
    if (err) return next(errorHandler(401, 'Session expired, please sign in again', 'AUTH_REQUIRED'));

    req.user = user;
    next();
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
