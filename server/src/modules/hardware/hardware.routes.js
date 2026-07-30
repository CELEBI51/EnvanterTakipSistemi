import { Router } from 'express';
import { authMiddleware } from '../../middlewares/auth.middleware.js';
import { roleMiddleware } from '../../middlewares/role.middleware.js';
import * as hardwareController from './hardware.controller.js';

const router = Router();

router.use(authMiddleware);

// Public for authenticated users (including viewer)
router.get('/', hardwareController.listHardware);
router.get('/:id', hardwareController.getHardwareById);
router.get('/:id/history', hardwareController.getHardwareHistory);

// Admin & IT Staff only operations
router.post('/', roleMiddleware(['admin', 'it_staff']), hardwareController.createHardware);
router.put('/:id', roleMiddleware(['admin', 'it_staff']), hardwareController.updateHardware);
router.delete('/:id', roleMiddleware(['admin', 'it_staff']), hardwareController.deleteHardware);

export default router;
