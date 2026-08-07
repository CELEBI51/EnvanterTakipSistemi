import { Router } from 'express';
import { authMiddleware } from '../../middlewares/auth.middleware.js';
import * as notificationsController from './notifications.controller.js';

const router = Router();

router.use(authMiddleware);

// GET /api/notifications/summary (All authenticated roles)
router.get('/summary', notificationsController.getNotificationSummary);

export default router;
