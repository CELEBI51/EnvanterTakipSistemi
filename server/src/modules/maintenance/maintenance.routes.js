import { Router } from 'express';
import { authMiddleware } from '../../middlewares/auth.middleware.js';
import { roleMiddleware } from '../../middlewares/role.middleware.js';
import * as maintenanceController from './maintenance.controller.js';

const router = Router();

router.use(authMiddleware);

router.get('/', maintenanceController.listMaintenance);
router.post('/', roleMiddleware(['admin', 'it_staff']), maintenanceController.createMaintenance);
router.get('/:id', maintenanceController.getMaintenanceDetail);
router.post('/:id/components', roleMiddleware(['admin', 'it_staff']), maintenanceController.addComponentToMaintenance);
router.put('/:id/complete', roleMiddleware(['admin', 'it_staff']), maintenanceController.completeMaintenance);

export default router;
