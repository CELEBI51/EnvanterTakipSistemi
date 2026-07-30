import { Router } from 'express';
import { authMiddleware } from '../../middlewares/auth.middleware.js';
import { roleMiddleware } from '../../middlewares/role.middleware.js';
import * as userController from './users.controller.js';

const router = Router();

// Tüm kullanıcı yönetimi route'ları SADECE admin rolüne açıktır!
router.use(authMiddleware);
router.use(roleMiddleware(['admin']));

router.get('/', userController.getUsers);
router.post('/', userController.createUser);
router.put('/:id', userController.updateUserRole);
router.put('/:id/reset-password', userController.resetPassword);
router.delete('/:id', userController.deleteUser);

export default router;
