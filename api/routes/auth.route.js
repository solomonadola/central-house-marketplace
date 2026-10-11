import express from 'express';
import { validate } from '../validation/validate.js';
import { signinSchema, signupSchema } from '../validation/schemas.js';
import { google, signOut, signin, signup } from '../controllers/auth.controller.js';

const router = express.Router();

router.post("/signup", validate(signupSchema), signup);
router.post("/signin", validate(signinSchema), signin);
router.post('/google', google);
router.get('/signout', signOut)

export default router;