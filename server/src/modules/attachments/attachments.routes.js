import { Router } from 'express';
import { authMiddleware } from '../../middlewares/auth.middleware.js';
import { roleMiddleware } from '../../middlewares/role.middleware.js';
import { uploadAttachmentMiddleware } from './attachments.middleware.js';
import * as attachmentsController from './attachments.controller.js';

const router = Router();

router.use(authMiddleware);

// GET /api/attachments?entityType=hardware&entityId=xxx (All roles)
router.get('/', attachmentsController.getAttachments);

// GET /api/attachments/:id/download (All roles)
router.get('/:id/download', attachmentsController.downloadAttachment);

// POST /api/attachments (Admin / IT Staff)
router.post(
  '/',
  roleMiddleware(['admin', 'it_staff']),
  uploadAttachmentMiddleware,
  attachmentsController.uploadAttachment
);

// DELETE /api/attachments/:id (Admin / IT Staff)
router.delete('/:id', roleMiddleware(['admin', 'it_staff']), attachmentsController.deleteAttachment);

export default router;
