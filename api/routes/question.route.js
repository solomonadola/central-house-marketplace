import express from 'express';
import { answerQuestion, askQuestion, deleteQuestion, listQuestions } from '../controllers/question.controller.js';
import { optionalAuth, verifyToken } from '../utils/verifyUser.js';
import { validateObjectId } from '../utils/validateObjectId.js';
import { messageLimiter } from '../utils/rateLimit.js';
import { validate } from '../validation/validate.js';
import { answerQuestionSchema, askQuestionSchema } from '../validation/schemas.js';

const router = express.Router();

router.param('id', validateObjectId);

router.get('/listing/:id', optionalAuth, listQuestions);
router.post('/listing/:id', verifyToken, messageLimiter, validate(askQuestionSchema), askQuestion);
router.post('/:id/answer', verifyToken, validate(answerQuestionSchema), answerQuestion);
router.delete('/:id', verifyToken, deleteQuestion);

export default router;
