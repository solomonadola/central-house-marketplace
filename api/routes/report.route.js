import express from 'express';
import { createReport } from '../controllers/report.controller.js';
import { verifyToken } from '../utils/verifyUser.js';
import { validate } from '../validation/validate.js';
import { reportSchema } from '../validation/schemas.js';

const router = express.Router();

router.post('/', verifyToken, validate(reportSchema), createReport);

export default router;
