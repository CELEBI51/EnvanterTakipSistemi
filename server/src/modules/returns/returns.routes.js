import { Router } from 'express';
import { authMiddleware } from '../../middlewares/auth.middleware.js';
import { roleMiddleware } from '../../middlewares/role.middleware.js';
import { uploadAttachmentMiddleware } from '../attachments/attachments.middleware.js';
import * as returnsController from './returns.controller.js';

const router = Router();

router.use(authMiddleware);

router.get('/export', returnsController.exportReturns);
router.get('/', returnsController.listReturns);

router.post('/', roleMiddleware(['admin', 'it_staff']), returnsController.createReturn);
router.get('/:id', returnsController.getReturnDetail);
router.get('/:id/pdf', returnsController.downloadReturnPdf);
router.post(
  '/:id/signed-form',
  roleMiddleware(['admin', 'it_staff']),
  uploadAttachmentMiddleware,
  returnsController.uploadSignedReturnForm
);
router.get('/:id/signed-form', returnsController.downloadSignedReturnForm);

export default router;
