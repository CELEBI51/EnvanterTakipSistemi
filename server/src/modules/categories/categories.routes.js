import { Router } from 'express';
import { authMiddleware } from '../../middlewares/auth.middleware.js';
import { roleMiddleware } from '../../middlewares/role.middleware.js';
import * as categoriesController from './categories.controller.js';

const router = Router();

router.use(authMiddleware);

// GET /api/categories?parentType=Varlık (All roles: admin, it_staff, viewer)
router.get('/', categoriesController.getCategories);

// POST /api/categories (Admin ONLY)
router.post('/', roleMiddleware(['admin']), categoriesController.createCategory);

// DELETE /api/categories/:id (Admin ONLY)
router.delete('/:id', roleMiddleware(['admin']), categoriesController.deleteCategory);

export default router;
