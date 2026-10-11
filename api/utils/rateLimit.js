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
