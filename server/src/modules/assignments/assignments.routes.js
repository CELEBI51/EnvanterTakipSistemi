import { Router } from 'express';
import { authMiddleware } from '../../middlewares/auth.middleware.js';
import { roleMiddleware } from '../../middlewares/role.middleware.js';
import { uploadAttachmentMiddleware } from '../attachments/attachments.middleware.js';
import * as assignmentsController from './assignments.controller.js';

const router = Router();

router.use(authMiddleware);

router.get('/', assignmentsController.listAssignments);
router.get('/stats', assignmentsController.getAssignmentStats);
router.post('/', roleMiddleware(['admin', 'it_staff']), assignmentsController.createAssignment);
router.get('/:id', assignmentsController.getAssignmentDetail);
router.get('/:id/pdf', assignmentsController.downloadAssignmentPdf);
router.post(
  '/:id/signed-form',
  roleMiddleware(['admin', 'it_staff']),
  uploadAttachmentMiddleware,
  assignmentsController.uploadSignedForm
);
router.get('/:id/signed-form', assignmentsController.downloadSignedForm);

export default router;
