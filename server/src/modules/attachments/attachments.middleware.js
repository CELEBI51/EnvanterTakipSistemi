import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const fileType = req.body.fileType || 'invoice';
    const subFolder = fileType === 'signed_form' ? 'signed-forms' : 'invoices';
    const destDir = path.join(process.cwd(), 'storage', subFolder);

    if (!fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, { recursive: true });
    }

    cb(null, destDir);
  },
  filename: (req, file, cb) => {
    const uuid = crypto.randomUUID();
    const sanitizedName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    cb(null, `${uuid}-${sanitizedName}`);
  },
});

const fileFilter = (req, file, cb) => {
  const allowedMimeTypes = [
    'application/pdf',
    'image/jpeg',
    'image/jpg',
    'image/png',
  ];

  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    const err = new Error('Sadece PDF ve resim (JPG, JPEG, PNG) dosyalarına izin verilir.');
    err.statusCode = 400;
    cb(err, false);
  }
};

export const uploadAttachmentMiddleware = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
}).single('file');
