import { Router } from 'express';
import { authMiddleware } from '../../middlewares/auth.middleware.js';
import { roleMiddleware } from '../../middlewares/role.middleware.js';
import * as accessoryController from './accessories.controller.js';

const router = Router();

router.use(authMiddleware);

// GET routes (Admin, IT Staff, Viewer)
router.get('/', accessoryController.listAccessories);
router.get('/:id', accessoryController.getAccessoryById);
router.get('/:id/history', accessoryController.getAccessoryHistory);

// Mutation routes (Admin & IT Staff only)
router.post('/', roleMiddleware(['admin', 'it_staff']), accessoryController.createAccessory);
router.post('/:id/restock', roleMiddleware(['admin', 'it_staff']), accessoryController.restockAccessory);
router.post('/:id/mark-defective', roleMiddleware(['admin', 'it_staff']), accessoryController.markDefective);
router.delete('/:id', roleMiddleware(['admin', 'it_staff']), accessoryController.deleteAccessory);

export default router;
