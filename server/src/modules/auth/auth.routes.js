import { Router } from 'express';
import { authMiddleware } from '../../middlewares/auth.middleware.js';
import * as authController from './auth.controller.js';

const router = Router();

router.post('/login', authController.login);
router.put('/change-password', authMiddleware, authController.changePassword);

export default router;
