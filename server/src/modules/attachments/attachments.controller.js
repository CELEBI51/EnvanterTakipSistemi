import fs from 'fs';
import path from 'path';
import { saveAttachmentSchema } from './attachments.schema.js';
import * as attachmentsService from './attachments.service.js';

export const uploadAttachment = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Lütfen yüklenecek bir dosya seçin.',
      });
    }

    const parsed = saveAttachmentSchema.parse(req.body);

    const attachment = await attachmentsService.saveAttachment({
      entityType: parsed.entityType,
      entityId: parsed.entityId,
      fileType: parsed.fileType,
      file: req.file,
      uploadedById: req.user?.id,
    });

    return res.status(201).json({
      success: true,
      data: attachment,
    });
  } catch (error) {
    if (req.file && req.file.path && fs.existsSync(req.file.path)) {
      try {
        await fs.promises.unlink(req.file.path);
      } catch (e) {
        // ignore
      }
    }

    if (error.name === 'ZodError') {
      return res.status(400).json({
        success: false,
        message: error.errors[0]?.message || 'Geçersiz parametreler.',
      });
    }

    if (error.statusCode) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
    }

    next(error);
  }
};

export const getAttachments = async (req, res, next) => {
  try {
    const { entityType, entityId } = req.query;

    if (!entityType || !entityId) {
      return res.status(400).json({
        success: false,
        message: 'entityType ve entityId sorgu parametreleri zorunludur.',
      });
    }

    const data = await attachmentsService.listAttachments(entityType, entityId);
    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
    }
    next(error);
  }
};

export const downloadAttachment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const attachment = await attachmentsService.getAttachmentForDownload(id);

    const fileName = attachment.originalName || path.basename(attachment.filePath);
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileName)}"`);

    const fileStream = fs.createReadStream(attachment.filePath);
    fileStream.pipe(res);
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
    }
    next(error);
  }
};

export const deleteAttachment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await attachmentsService.deleteAttachment(id);
    return res.status(200).json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
    }
    next(error);
  }
};
