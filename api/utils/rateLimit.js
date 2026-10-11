import rateLimit from 'express-rate-limit';

// Limits failed sign-in/sign-up attempts per IP to slow down password
// guessing. Successful requests don't count toward the limit.
// AUTH_RATE_LIMIT overrides the limit, e.g. for tests that make many
// failing requests on purpose.
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: Number(process.env.AUTH_RATE_LIMIT) || 10,
  skipSuccessfulRequests: true,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: (req, res, next, options) =>
    res.status(options.statusCode).json({
      success: false,
      statusCode: options.statusCode,
      message: 'Too many attempts, please try again in 15 minutes.',
    }),
});

// Caps how fast one IP can bump view counts, so a script can't inflate them.
export const viewLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: Number(process.env.VIEW_RATE_LIMIT) || 60,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: (req, res, next, options) =>
    res.status(options.statusCode).json({
      success: false,
      statusCode: options.statusCode,
      message: 'Too many requests, please try again later.',
    }),
});

// Slows down message spam from a single IP.
export const messageLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: Number(process.env.MESSAGE_RATE_LIMIT) || 30,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: (req, res, next, options) =>
    res.status(options.statusCode).json({
      success: false,
      statusCode: options.statusCode,
      message: 'You are sending messages too quickly. Please wait a moment.',
    }),
});

// Limits emails triggered from one IP (password resets, verification
// resends). Every request counts, since these always respond with success.
export const emailLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: Number(process.env.EMAIL_RATE_LIMIT) || 5,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: (req, res, next, options) =>
    res.status(options.statusCode).json({
      success: false,
      statusCode: options.statusCode,
      message: 'Too many requests, please try again in 15 minutes.',
    }),
});
