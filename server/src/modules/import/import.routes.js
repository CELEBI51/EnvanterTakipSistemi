import express from 'express';
import multer from 'multer';
import { authMiddleware as authenticateToken } from '../../middlewares/auth.middleware.js';
import { generateTemplate, parseAndValidate, commitImport, getModuleConfig } from './import.service.js';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// 1. GET /api/import/:moduleKey/template
router.get('/:moduleKey/template', authenticateToken, (req, res, next) => {
  try {
    const { moduleKey } = req.params;
    const config = getModuleConfig(moduleKey);
    const buffer = generateTemplate(moduleKey);

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${moduleKey}_import_template.xlsx"`);
    return res.send(buffer);
  } catch (error) {
    next(error);
  }
});

// 2. POST /api/import/:moduleKey/validate
router.post('/:moduleKey/validate', authenticateToken, upload.single('file'), async (req, res, next) => {
  try {
    const { moduleKey } = req.params;
    const updateExisting = req.query.updateExisting === 'true' || req.body.updateExisting === 'true';
    if (!req.file) {
      return res.status(400).json({ message: 'Lütfen bir Excel dosyası yükleyin.' });
    }

    const validationResult = await parseAndValidate(moduleKey, req.file.buffer, updateExisting);
    return res.json(validationResult);
  } catch (error) {
    next(error);
  }
});

// 3. POST /api/import/:moduleKey/commit
router.post('/:moduleKey/commit', authenticateToken, async (req, res, next) => {
  try {
    const { moduleKey } = req.params;
    const { rows } = req.body;

    if (!rows || !Array.isArray(rows) || rows.length === 0) {
      return res.status(400).json({ message: 'İçe aktarılacak geçerli satır bulunamadı.' });
    }

    const userId = req.user?.id;
    const result = await commitImport(moduleKey, rows, userId);
    return res.json(result);
  } catch (error) {
    next(error);
  }
});

export default router;
