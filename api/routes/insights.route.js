import express from 'express';
import { getInsights } from '../controllers/analytics.controller.js';

const router = express.Router();

// Public aggregate stats about the marketplace.
router.get('/', getInsights);

export default router;
