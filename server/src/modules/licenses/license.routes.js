import { Router } from 'express';
import { authMiddleware } from '../../middlewares/auth.middleware.js';
import { roleMiddleware } from '../../middlewares/role.middleware.js';
import * as licenseController from './license.controller.js';

const router = Router();

router.use(authMiddleware);

// GET /api/licenses/export (All authenticated roles)
router.get('/export', licenseController.exportLicenses);

// GET /api/licenses (All authenticated roles: admin, it_staff, viewer)
router.get('/', licenseController.getLicenses);


// GET /api/licenses/stats (All authenticated roles - statistics summary)
router.get('/stats', licenseController.getLicenseStats);

// GET /api/licenses/expiring (All authenticated roles - expiring list)
router.get('/expiring', licenseController.getExpiringLicenses);

// GET /api/licenses/:id (All authenticated roles)
router.get('/:id', licenseController.getLicenseById);

// POST /api/licenses (Admin & IT Staff only)
router.post('/', roleMiddleware(['admin', 'it_staff']), licenseController.createLicense);

// PUT /api/licenses/:id (Admin & IT Staff only)
router.put('/:id', roleMiddleware(['admin', 'it_staff']), licenseController.updateLicense);

// PATCH /api/licenses/:id/status (Admin & IT Staff only - status update)
router.patch('/:id/status', roleMiddleware(['admin', 'it_staff']), licenseController.updateLicenseStatus);

/**
 * HARD DELETE ROUTE INTENTIONALLY OMITTED:
 * License records CANNOT be hard deleted. Status must be updated to 'IPTAL_EDILDI' or 'YENILENMEYECEK'.
 */

export default router;
