import fs from 'fs';
import prisma from '../../config/db.js';
import { generateAssignmentPdf } from '../documents/document.service.js';
import { saveAttachment } from '../attachments/attachments.service.js';

export const createAssignment = async (data, currentUser) => {
  const {
    employeeId,
    teslimTarihi,
    hardwareItems = [],
    accessoryItems = [],
    consumableItems = [],
  } = data;

  const createdById = typeof currentUser === 'object' ? currentUser.id : currentUser;
  const teslimEden = typeof currentUser === 'object' && currentUser.fullName ? currentUser.fullName : 'Sistem Kullanıcısı';

  const employee = await prisma.employee.findUnique({
    where: { id: employeeId },
  });

  if (!employee) {
    const error = new Error('Zimmetlenecek personel bulunamadı.');
    error.statusCode = 404;
    throw error;
  }

  const assignment = await prisma.$transaction(async (tx) => {
    // 1. Ana Assignment kaydını oluştur
    const newAssignment = await tx.assignment.create({
      data: {
        teslimEden,
        employeeId,
        teslimTarihi: new Date(teslimTarihi),
        status: 'Aktif',
        createdById,
      },
    });

    // 2. Hardware kalemlerini işle
    for (const item of hardwareItems) {
      const hw = await tx.hardware.findUnique({
        where: { id: item.hardwareId },
      });

      if (!hw) {
        const error = new Error('Zimmetlenecek varlık bulunamadı.');
        error.statusCode = 404;
        throw error;
      }

      if (hw.status !== 'Hazir') {
        const hwInfo = `${hw.brand}${hw.model ? ' ' + hw.model : ''} (${hw.demirbasNo})`;
        const error = new Error(`${hwInfo} şu an Hazır durumunda değil, zimmetlenemez.`);
        error.statusCode = 400;
        throw error;
      }

      // AssignmentItem ekle
      await tx.assignmentItem.create({
        data: {
          assignmentId: newAssignment.id,
          hardwareId: item.hardwareId,
          returned: false,
        },
      });

      // Hardware durumunu Kullanımda yap
      await tx.hardware.update({
        where: { id: item.hardwareId },
        data: { status: 'Kullanimda' },
      });
    }

    // 3. Accessory kalemlerini işle
    for (const item of accessoryItems) {
      const acc = await tx.accessory.findUnique({
        where: { id: item.accessoryId },
      });

      if (!acc) {
        const error = new Error('Zimmetlenecek aksesuar bulunamadı.');
        error.statusCode = 404;
        throw error;
      }

      if (acc.availableQuantity < item.quantity) {
        const error = new Error(`${acc.name} için yeterli stok yok, mevcut: ${acc.availableQuantity} adet`);
        error.statusCode = 400;
        throw error;
      }

      // AssignmentAccessoryItem ekle
      await tx.assignmentAccessoryItem.create({
        data: {
          assignmentId: newAssignment.id,
          accessoryId: item.accessoryId,
          quantityGiven: item.quantity,
        },
      });

      // Accessory stoğunu güncelle
      await tx.accessory.update({
        where: { id: item.accessoryId },
        data: {
          availableQuantity: acc.availableQuantity - item.quantity,
          assignedQuantity: acc.assignedQuantity + item.quantity,
        },
      });

      // StockMovement ortak tablosuna kayıt düş
      await tx.stockMovement.create({
        data: {
          entityType: 'accessory',
          entityId: item.accessoryId,
          type: 'assigned',
          quantity: item.quantity,
          note: `"${employee.fullName}" kişisine zimmetlendi`,
          createdById,
        },
      });
    }

    // 4. Consumable kalemlerini işle (BÖLÜM A)
    for (const item of consumableItems) {
      const con = await tx.consumable.findUnique({
        where: { id: item.consumableId },
      });

      if (!con) {
        const error = new Error('Zimmetlenecek sarf malzeme bulunamadı.');
        error.statusCode = 404;
        throw error;
      }

      if (con.availableQuantity < item.quantity) {
        const error = new Error(`${con.name} için yeterli stok yok, mevcut: ${con.availableQuantity} adet`);
        error.statusCode = 400;
        throw error;
      }

      // AssignmentConsumableItem ekle
      await tx.assignmentConsumableItem.create({
        data: {
          assignmentId: newAssignment.id,
          consumableId: item.consumableId,
          quantityGiven: item.quantity,
        },
      });

      // Consumable stoğunu güncelle
      await tx.consumable.update({
        where: { id: item.consumableId },
        data: {
          availableQuantity: con.availableQuantity - item.quantity,
          consumedQuantity: con.consumedQuantity + item.quantity,
        },
      });

      // StockMovement ortak tablosuna kayıt düş
      await tx.stockMovement.create({
        data: {
          entityType: 'consumable',
          entityId: item.consumableId,
          type: 'issued',
          quantity: item.quantity,
          issuedToEmployeeId: employeeId,
          note: `Zimmetleme kapsamında "${employee.fullName}" kişisine/departmanına verildi`,
          createdById,
        },
      });
    }

    return newAssignment;
  });

  // Otomatik PDF üretimi (Puppeteer)
  try {
    await generateAssignmentPdf(assignment.id);
  } catch (pdfErr) {
    console.error('PDF üretilirken hata oluştu (Zimmet kaydı oluşturuldu):', pdfErr);
  }

  return assignment;
};

export const listAssignments = async ({
  employeeId,
  status,
  unitId,
  dateFrom,
  dateTo,
  q,
  page = 1,
  pageSize = 10,
}) => {
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limit = Math.max(1, parseInt(pageSize, 10) || 10);
  const skip = (pageNum - 1) * limit;

  const where = {};

  if (employeeId) where.employeeId = employeeId;

  if (status) {
    if (status === 'Kısmi İade' || status === 'KismiIade') {
      where.status = 'KismiIade';
    } else if (status === 'İade Edildi' || status === 'IadeEdildi') {
      where.status = 'IadeEdildi';
    } else {
      where.status = status;
    }
  }

  if (unitId) {
    where.employee = {
      unitId: unitId,
    };
  }

  if (dateFrom || dateTo) {
    where.teslimTarihi = {};
    if (dateFrom) where.teslimTarihi.gte = new Date(dateFrom);
    if (dateTo) where.teslimTarihi.lte = new Date(dateTo);
  }

  if (q && q.trim() !== '') {
    const searchTerm = q.trim();
    where.AND = where.AND || [];
    where.AND.push({
      OR: [
        { employee: { fullName: { contains: searchTerm, mode: 'insensitive' } } },
        { employee: { tcNo: { contains: searchTerm, mode: 'insensitive' } } },
        { teslimEden: { contains: searchTerm, mode: 'insensitive' } },
        {
          items: {
            some: {
              hardware: {
                OR: [
                  { brand: { contains: searchTerm, mode: 'insensitive' } },
                  { model: { contains: searchTerm, mode: 'insensitive' } },
                  { serialNo: { contains: searchTerm, mode: 'insensitive' } },
                  { demirbasNo: { contains: searchTerm, mode: 'insensitive' } },
                ],
              },
            },
          },
        },
      ],
    });
  }

  const [items, totalCount] = await Promise.all([
    prisma.assignment.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        employee: {
          select: {
            id: true,
            fullName: true,
            unit: {
              select: { id: true, name: true },
            },
            tcNo: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
        items: {
          include: {
            hardware: {
              select: {
                id: true,
                demirbasNo: true,
                brand: true,
                model: true,
                status: true,
              },
            },
          },
        },
        accessoryItems: {
          include: {
            accessory: {
              select: {
                id: true,
                name: true,
                brand: true,
              },
            },
          },
        },
        consumableItems: {
          include: {
            consumable: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    }),
    prisma.assignment.count({ where }),
  ]);

  return {
    data: items,
    pagination: {
      totalCount,
      page: pageNum,
      pageSize: limit,
      totalPages: Math.ceil(totalCount / limit) || 1,
    },
  };
};

export const getAssignmentDetail = async (id) => {
  const assignment = await prisma.assignment.findUnique({
    where: { id },
    include: {
      employee: {
        select: {
          id: true,
          fullName: true,
          tcNo: true,
          unit: {
            select: { id: true, name: true },
          },
          phone: true,
          email: true,
        },
      },
      createdBy: {
        select: {
          id: true,
          fullName: true,
          email: true,
        },
      },
      signedFormAttachment: true,
      items: {
        include: {
          hardware: {
            select: {
              id: true,
              demirbasNo: true,
              brand: true,
              model: true,
              serialNo: true,
              status: true,
              category: { select: { name: true } },
            },
          },
        },
      },
      accessoryItems: {
        include: {
          accessory: {
            select: {
              id: true,
              name: true,
              brand: true,
              category: { select: { name: true } },
            },
          },
        },
      },
      consumableItems: {
        include: {
          consumable: {
            select: {
              id: true,
              name: true,
              category: { select: { name: true } },
            },
          },
        },
      },
    },
  });

  if (!assignment) {
    const error = new Error('Zimmet kaydı bulunamadı.');
    error.statusCode = 404;
    throw error;
  }

  return assignment;
};

export const getAssignmentPdfFile = async (id) => {
  const assignment = await prisma.assignment.findUnique({ where: { id } });
  if (!assignment) {
    const error = new Error('Zimmet kaydı bulunamadı.');
    error.statusCode = 404;
    throw error;
  }

  if (assignment.pdfPath && fs.existsSync(assignment.pdfPath)) {
    return assignment.pdfPath;
  }

  // Generate on the fly if not exists
  const newPdfPath = await generateAssignmentPdf(id);
  return newPdfPath;
};

export const uploadSignedForm = async (id, file, userId) => {
  const assignment = await prisma.assignment.findUnique({ where: { id } });
  if (!assignment) {
    const error = new Error('Zimmet kaydı bulunamadı.');
    error.statusCode = 404;
    throw error;
  }

  const attachment = await saveAttachment({
    entityType: 'assignment',
    entityId: id,
    fileType: 'signed_form',
    file,
    uploadedById: userId,
  });

  await prisma.assignment.update({
    where: { id },
    data: {
      signedFormAttachmentId: attachment.id,
    },
  });

  return attachment;
};

export const getSignedFormFile = async (id) => {
  const assignment = await prisma.assignment.findUnique({
    where: { id },
    include: { signedFormAttachment: true },
  });

  if (!assignment) {
    const error = new Error('Zimmet kaydı bulunamadı.');
    error.statusCode = 404;
    throw error;
  }

  if (!assignment.signedFormAttachmentId || !assignment.signedFormAttachment) {
    const error = new Error('Bu zimmet kaydına henüz imzalı belge yüklenmemiş.');
    error.statusCode = 404;
    throw error;
  }

  const fileFilePath = assignment.signedFormAttachment.filePath;
  if (!fs.existsSync(fileFilePath)) {
    const error = new Error('İmzalı belge fiziksel olarak sunucuda bulunamadı.');
    error.statusCode = 404;
    throw error;
  }

  return assignment.signedFormAttachment;
};

/**
 * Get Assignment Statistics Summary (total, active, partiallyReturned, fullyReturned).
 */
export const getAssignmentStats = async () => {
  const [total, active, partiallyReturned, fullyReturned] = await Promise.all([
    prisma.assignment.count(),
    prisma.assignment.count({ where: { status: 'Aktif' } }),
    prisma.assignment.count({ where: { status: 'KismiIade' } }),
    prisma.assignment.count({ where: { status: 'IadeEdildi' } }),
  ]);

  return {
    total,
    active,
    partiallyReturned,
    fullyReturned,
  };
};
