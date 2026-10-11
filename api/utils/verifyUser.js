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
