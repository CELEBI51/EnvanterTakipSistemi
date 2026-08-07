import { Router } from 'express';
import { authMiddleware } from '../../middlewares/auth.middleware.js';
import { roleMiddleware } from '../../middlewares/role.middleware.js';
import * as unitsController from './units.controller.js';

const router = Router();

router.use(authMiddleware);

router.get('/', unitsController.getUnits);
router.get('/:id', unitsController.getUnitById);

router.post('/', roleMiddleware(['admin']), unitsController.createUnit);
router.put('/:id', roleMiddleware(['admin']), unitsController.updateUnit);
router.delete('/:id', roleMiddleware(['admin']), unitsController.deleteUnit);

export default router;
