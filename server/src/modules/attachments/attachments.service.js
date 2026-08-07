import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

export const verifyEntityExists = async (entityType, entityId) => {
  try {
    switch (entityType) {
      case 'hardware': {
        const item = await prisma.hardware.findUnique({ where: { id: entityId } });
        return !!item;
      }
      case 'accessory': {
        const item = await prisma.accessory.findUnique({ where: { id: entityId } });
        return !!item;
      }
      case 'license': {
        const item = await prisma.license.findUnique({ where: { id: entityId } });
        return !!item;
      }
      case 'assignment': {
        const item = await prisma.assignment.findUnique({ where: { id: entityId } });
        return !!item;
      }
      case 'return': {
        const item = await prisma.return.findUnique({ where: { id: entityId } });
        return !!item;
      }
      case 'consumable':
      case 'component':
        return false; // Henüz bu modüller eklenmedi
      default:
        return false;
    }
  } catch (error) {
    return false;
  }
};

export const saveAttachment = async ({
  entityType,
  entityId,
  fileType,
  file,
  uploadedById,
}) => {
  const entityExists = await verifyEntityExists(entityType, entityId);

  if (!entityExists) {
    // Entity yoksa yüklenen geçici dosyayı siliyoruz
    if (file && file.path && fs.existsSync(file.path)) {
      try {
        await fs.promises.unlink(file.path);
      } catch (e) {
        // ignore disk cleanup error
      }
    }
    const err = new Error(`Belirtilen ${entityType} kaydı bulunamadı.`);
    err.statusCode = 404;
    throw err;
  }

  const attachment = await prisma.attachment.create({
    data: {
      entityType,
      entityId,
      fileType,
      filePath: file.path,
      originalName: file.originalname,
      uploadedById: uploadedById || null,
    },
    include: {
      uploadedBy: {
        select: { id: true, fullName: true, email: true },
      },
    },
  });

  return attachment;
};

export const listAttachments = async (entityType, entityId) => {
  const attachments = await prisma.attachment.findMany({
    where: {
      entityType,
      entityId,
    },
    include: {
      uploadedBy: {
        select: { id: true, fullName: true, email: true },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  return attachments;
};

export const getAttachmentForDownload = async (id) => {
  const attachment = await prisma.attachment.findUnique({
    where: { id },
  });

  if (!attachment) {
    const err = new Error('Dosya kaydı bulunamadı.');
    err.statusCode = 404;
    throw err;
  }

  if (!fs.existsSync(attachment.filePath)) {
    const err = new Error('Fiziksel dosya sunucu diskinde bulunamadı.');
    err.statusCode = 404;
    throw err;
  }

  return attachment;
};

export const deleteAttachment = async (id) => {
  const attachment = await prisma.attachment.findUnique({
    where: { id },
  });

  if (!attachment) {
    const err = new Error('Silinecek dosya kaydı bulunamadı.');
    err.statusCode = 404;
    throw err;
  }

  // Önce diskteki dosyayı sil
  if (fs.existsSync(attachment.filePath)) {
    try {
      await fs.promises.unlink(attachment.filePath);
    } catch (err) {
      const error = new Error('Disk üzerindeki dosya silinirken hata oluştu.');
      error.statusCode = 500;
      throw error;
    }
  }

  // Sonra DB kaydını sil
  await prisma.attachment.delete({
    where: { id },
  });

  return { message: 'Dosya başarıyla silindi.' };
};
