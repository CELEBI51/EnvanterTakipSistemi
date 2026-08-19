import { Router } from 'express';
import { authMiddleware } from '../../middlewares/auth.middleware.js';
import { forgotPasswordLimiter } from '../../middlewares/rateLimit.middleware.js';
import * as authController from './auth.controller.js';

const router = Router();

router.post('/login', authController.login);
router.post('/logout', authMiddleware, authController.logout);
router.put('/change-password', authMiddleware, authController.changePassword);

router.post('/forgot-password', forgotPasswordLimiter, authController.forgotPassword);
router.post('/reset-password', authController.resetPassword);

export default router;
