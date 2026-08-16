import { Router } from 'express';
import { authMiddleware } from '../../middlewares/auth.middleware.js';
import { roleMiddleware } from '../../middlewares/role.middleware.js';
import * as componentController from './component.controller.js';

const router = Router();

router.use(authMiddleware);

router.get('/export', componentController.exportComponents);
router.get('/', componentController.getComponents);
router.get('/stats', componentController.getComponentStats);

router.post('/', roleMiddleware(['admin', 'it_staff']), componentController.createComponent);
router.get('/:id', componentController.getComponentById);
router.get('/:id/history', componentController.getComponentHistory);
router.post('/:id/restock', roleMiddleware(['admin', 'it_staff']), componentController.restockComponent);
router.delete('/:id', roleMiddleware(['admin', 'it_staff']), componentController.deleteComponent);

export default router;
