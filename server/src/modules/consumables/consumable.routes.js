import { Router } from 'express';
import { authMiddleware } from '../../middlewares/auth.middleware.js';
import { roleMiddleware } from '../../middlewares/role.middleware.js';
import * as consumableController from './consumable.controller.js';

const router = Router();

router.use(authMiddleware);

router.get('/', consumableController.getConsumables);
router.post('/', roleMiddleware(['admin', 'it_staff']), consumableController.createConsumable);
router.get('/:id', consumableController.getConsumableById);
router.get('/:id/history', consumableController.getConsumableHistory);
router.post('/:id/restock', roleMiddleware(['admin', 'it_staff']), consumableController.restockConsumable);
router.post('/:id/issue', roleMiddleware(['admin', 'it_staff']), consumableController.issueConsumable);
router.delete('/:id', roleMiddleware(['admin', 'it_staff']), consumableController.deleteConsumable);

export default router;
