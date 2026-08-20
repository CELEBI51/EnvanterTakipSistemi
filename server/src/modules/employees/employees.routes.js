import { Router } from 'express';
import { authMiddleware } from '../../middlewares/auth.middleware.js';
import { roleMiddleware } from '../../middlewares/role.middleware.js';
import * as employeesController from './employees.controller.js';

const router = Router();

router.use(authMiddleware);

router.get('/export', employeesController.exportEmployees);
router.get('/stats', employeesController.getEmployeeStats);
router.get('/', employeesController.getEmployees);

router.post('/', roleMiddleware(['admin', 'it_staff']), employeesController.createEmployee);
router.get('/:id', employeesController.getEmployeeById);
router.put('/:id', roleMiddleware(['admin', 'it_staff']), employeesController.updateEmployee);
router.patch('/:id/status', roleMiddleware(['admin', 'it_staff']), employeesController.updateEmployeeStatus);

export default router;
