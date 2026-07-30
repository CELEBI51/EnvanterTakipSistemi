import { Router } from 'express';
import { authMiddleware } from '../../middlewares/auth.middleware.js';
import { roleMiddleware } from '../../middlewares/role.middleware.js';
import * as softwareController from './software.controller.js';

const router = Router();

router.use(authMiddleware);

// Public for authenticated users (viewer included)
router.get('/', softwareController.listSoftware);
router.get('/expiring', softwareController.getExpiringSoftware);
router.get('/:id', softwareController.getSoftwareById);

// Admin & IT Staff only operations
router.post('/', roleMiddleware(['admin', 'it_staff']), softwareController.createSoftware);
router.put('/:id', roleMiddleware(['admin', 'it_staff']), softwareController.updateSoftware);
router.delete('/:id', roleMiddleware(['admin', 'it_staff']), softwareController.deleteSoftware);

export default router;
