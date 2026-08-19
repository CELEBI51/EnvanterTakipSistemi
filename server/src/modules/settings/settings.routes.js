import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { authMiddleware } from '../../middlewares/auth.middleware.js';
import { roleMiddleware } from '../../middlewares/role.middleware.js';
import * as settingsController from './settings.controller.js';

const router = Router();

// Multer storage config for company logo
const LOGO_DIR = path.join(process.cwd(), 'storage', 'logo');
if (!fs.existsSync(LOGO_DIR)) {
  fs.mkdirSync(LOGO_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, LOGO_DIR);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `company-logo${ext}`);
  },
});

const fileFilter = (req, file, cb) => {
  const allowedMimeTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml'];
  const ext = path.extname(file.originalname).toLowerCase();
  const allowedExts = ['.png', '.jpg', '.jpeg', '.svg'];

  if (allowedMimeTypes.includes(file.mimetype) || allowedExts.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error('Sadece PNG, JPG, JPEG veya SVG formatında logo yüklenebilir.'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 2 * 1024 * 1024, // 2MB
  },
});

// GET /api/settings/logo - Public (Login page / App branding)
router.get('/logo', settingsController.getLogo);

// All routes below require authentication
router.use(authMiddleware);

// GET /api/settings - All authenticated users
router.get('/', settingsController.getSettings);

// PUT /api/settings - Admin ONLY
router.put('/', roleMiddleware(['admin']), settingsController.updateSettings);

// POST /api/settings/logo - Admin ONLY
router.post(
  '/logo',
  roleMiddleware(['admin']),
  (req, res, next) => {
    upload.single('logo')(req, res, (err) => {
      if (err) {
        if (err instanceof multer.MulterError) {
          if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({
              success: false,
              message: 'Logo dosya boyutu maksimum 2MB olabilir.',
            });
          }
          return res.status(400).json({
            success: false,
            message: `Dosya yükleme hatası: ${err.message}`,
          });
        }
        return res.status(400).json({
          success: false,
          message: err.message,
        });
      }
      next();
    });
  },
  settingsController.uploadLogo
);

// Email Templates routes
router.get('/email-templates', settingsController.getEmailTemplates);
router.get('/email-templates/:type', settingsController.getEmailTemplateByType);
router.put('/email-templates/:type', roleMiddleware(['admin']), settingsController.updateEmailTemplate);
router.post('/email-templates/:type/test', roleMiddleware(['admin']), settingsController.sendTestEmail);

// Backup & Restore routes
const backupUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
});

router.get('/backup/counts', settingsController.getBackupCounts);
router.get('/backup', roleMiddleware(['admin']), settingsController.downloadBackup);
router.post('/restore', roleMiddleware(['admin']), backupUpload.single('backupFile'), settingsController.restoreBackup);

// System Logs routes
router.get('/logs', roleMiddleware(['admin']), settingsController.getSystemLogs);
router.get('/logs/export', roleMiddleware(['admin']), settingsController.exportSystemLogs);

export default router;
