import express from 'express';
import { validate } from '../validation/validate.js';
import { authLimiter } from '../utils/rateLimit.js';
import { signinSchema, signupSchema } from '../validation/schemas.js';
import { google, signOut, signin, signup } from '../controllers/auth.controller.js';

const router = express.Router();

router.post("/signup", authLimiter, validate(signupSchema), signup);
router.post("/signin", authLimiter, validate(signinSchema), signin);
router.post('/google', authLimiter, google);
router.get('/signout', signOut)

export default router;