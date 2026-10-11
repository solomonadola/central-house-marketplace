import express from 'express';
import { validate } from '../validation/validate.js';
import { verifyToken } from '../utils/verifyUser.js';
import { authLimiter, emailLimiter } from '../utils/rateLimit.js';
import {
  forgotPasswordSchema,
  resetPasswordSchema,
  verifyEmailSchema,
  signinSchema,
  signupSchema,
} from '../validation/schemas.js';
import {
  forgotPassword,
  google,
  resendVerification,
  verifyEmail,
  resetPassword,
  signOut,
  signin,
  signup,
} from '../controllers/auth.controller.js';

const router = express.Router();

router.post("/signup", authLimiter, validate(signupSchema), signup);
router.post("/signin", authLimiter, validate(signinSchema), signin);
router.post('/google', authLimiter, google);
router.get('/signout', signOut)
router.post('/forgot-password', emailLimiter, validate(forgotPasswordSchema), forgotPassword);
router.post('/reset-password', authLimiter, validate(resetPasswordSchema), resetPassword);
router.post('/verify-email', authLimiter, validate(verifyEmailSchema), verifyEmail);
router.post('/resend-verification', verifyToken, emailLimiter, resendVerification);

export default router;