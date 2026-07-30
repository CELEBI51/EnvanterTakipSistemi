import { Router } from 'express';
import { authMiddleware } from '../../middlewares/auth.middleware.js';
import * as reportsController from './reports.controller.js';

const router = Router();

router.use(authMiddleware);
router.get('/dashboard-stats', reportsController.getDashboardStats);

export default router;
