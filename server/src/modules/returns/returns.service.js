import fs from 'fs';
import prisma from '../../config/db.js';
import { generateReturnPdf } from '../documents/document.service.js';
import { saveAttachment } from '../attachments/attachments.service.js';

const HARDWARE_STATUS_MAP = {
  'Hazır': 'Hazir',
  'Arızalı': 'Arizali',
  'Serviste': 'Serviste',
  'Kullanım Dışı': 'KullanimDisi',
};

export const createReturn = async (data, createdById) => {
  const { assignmentId, teslimAlanIc, tarih, hardwareItems = [], accessoryItems = [] } = data;

  const assignment = await prisma.assignment.findUnique({
    where: { id: assignmentId },
    include: {
      employee: true,
      items: true,
      accessoryItems: true,
    },
  });

  if (!assignment) {
    const error = new Error('İade yapılacak zimmet kaydı bulunamadı.');
    error.statusCode = 404;
    throw error;
  }

  if (assignment.status === 'IadeEdildi') {
    const error = new Error('Bu zimmet kaydı zaten tamamen iade edilmiş.');
    error.statusCode = 400;
    throw error;
  }

  const newReturn = await prisma.$transaction(async (tx) => {
    // 1. Return kaydı oluştur
    const returnRecord = await tx.return.create({
      data: {
        assignmentId,
        teslimAlanIc,
        tarih: new Date(tarih),
      },
    });

    // 2. Hardware iadelerini işle
    for (const item of hardwareItems) {
      const assignHwItem = await tx.assignmentItem.findFirst({
        where: { assignmentId, hardwareId: item.hardwareId },
      });

      if (!assignHwItem) {
        const error = new Error('İade edilmek istenen varlık bu zimmette tanımlı değil.');
        error.statusCode = 400;
        throw error;
      }

      if (assignHwItem.returned) {
        const error = new Error('Bu varlık daha önce iade edilmiş.');
        error.statusCode = 400;
        throw error;
      }

      const enumStatus = HARDWARE_STATUS_MAP[item.resultStatus];
      if (!enumStatus) {
        const error = new Error(`Geçersiz varlık sonuç durumu: ${item.resultStatus}`);
        error.statusCode = 400;
        throw error;
      }

      // ReturnItem ekle
      await tx.returnItem.create({
        data: {
          returnId: returnRecord.id,
          hardwareId: item.hardwareId,
          resultStatus: enumStatus,
        },
      });

      // AssignmentItem durumunu iade edildi yap
      await tx.assignmentItem.update({
        where: { id: assignHwItem.id },
        data: {
          returned: true,
          returnDate: new Date(tarih),
        },
      });

      // Hardware durumunu güncelle
      await tx.hardware.update({
        where: { id: item.hardwareId },
        data: { status: enumStatus },
      });
    }

    // 3. Accessory iadelerini işle
    for (const item of accessoryItems) {
      const assignAccItem = await tx.assignmentAccessoryItem.findFirst({
        where: { assignmentId, accessoryId: item.accessoryId },
      });

      if (!assignAccItem) {
        const error = new Error('İade edilmek istenen aksesuar bu zimmette tanımlı değil.');
        error.statusCode = 400;
        throw error;
      }

      const remaining = assignAccItem.quantityGiven - assignAccItem.quantityReturned;
      if (item.quantity > remaining) {
        const acc = await tx.accessory.findUnique({ where: { id: item.accessoryId } });
        const name = acc?.name || 'Aksesuar';
        const error = new Error(`${name} için iade edilmek istenen miktar (${item.quantity}) verilen kalan miktarı (${remaining}) aşıyor.`);
        error.statusCode = 400;
        throw error;
      }

      // ReturnAccessoryItem ekle
      await tx.returnAccessoryItem.create({
        data: {
          returnId: returnRecord.id,
          accessoryId: item.accessoryId,
          quantityReturned: item.quantity,
          resultStatus: item.resultStatus || 'Hazır',
        },
      });

      // AssignmentAccessoryItem quantityReturned güncelle
      await tx.assignmentAccessoryItem.update({
        where: { id: assignAccItem.id },
        data: {
          quantityReturned: { increment: item.quantity },
        },
      });

      // Accessory stoğunu güncelle
      if (item.resultStatus === 'Arızalı') {
        await tx.accessory.update({
          where: { id: item.accessoryId },
          data: {
            assignedQuantity: { decrement: item.quantity },
            outOfUseQuantity: { increment: item.quantity },
          },
        });
      } else {
        await tx.accessory.update({
          where: { id: item.accessoryId },
          data: {
            assignedQuantity: { decrement: item.quantity },
            availableQuantity: { increment: item.quantity },
          },
        });
      }

      // StockMovement kaydı düş
      await tx.stockMovement.create({
        data: {
          entityType: 'accessory',
          entityId: item.accessoryId,
          type: 'returned',
          quantity: item.quantity,
          issuedToEmployeeId: assignment.employeeId,
          note: `"${assignment.employee.fullName}" kişisinden iade alındı`,
          createdById,
        },
      });
    }

    // 4. Assignment status güncellemesi (Aktif / Kısmi İade / İade Edildi)
    const allHwItems = await tx.assignmentItem.findMany({ where: { assignmentId } });
    const allAccItems = await tx.assignmentAccessoryItem.findMany({ where: { assignmentId } });

    const allHwReturned = allHwItems.every((i) => i.returned);
    const allAccReturned = allAccItems.every((i) => i.quantityReturned >= i.quantityGiven);

    const isFullyReturned = allHwReturned && allAccReturned;

    await tx.assignment.update({
      where: { id: assignmentId },
      data: {
        status: isFullyReturned ? 'IadeEdildi' : 'KismiIade',
      },
    });

    return tx.return.findUnique({
      where: { id: returnRecord.id },
      include: {
        assignment: {
          include: {
            employee: {
              select: { id: true, fullName: true, tcNo: true, unit: { select: { id: true, name: true } } },
            },
          },
        },
        items: true,
        accessoryItems: true,
      },
    });
  });

  // System Log Kaydı
  try {
    const { createLog } = await import('../../services/log.service.js');
    const personelAdi = assignment.employee?.fullName || 'Bilinmeyen Personel';
    await createLog({
      userId: createdById,
      userEmail: null,
      action: 'CREATE',
      module: 'return',
      description: `${personelAdi} adlı personelin zimmeti iade alındı`,
      entityId: newReturn.id,
      statusCode: 201,
    });
  } catch (logErr) {
    console.error('İade log hatası:', logErr);
  }

  return newReturn;
};

export const listReturns = async ({ assignmentId, employeeId, unitId, status, q, page = 1, pageSize = 10 }) => {
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limit = Math.max(1, parseInt(pageSize, 10) || 10);
  const skip = (pageNum - 1) * limit;

  const where = {};
  if (assignmentId) where.assignmentId = assignmentId;

  if (employeeId || unitId || status) {
    where.assignment = where.assignment || {};
    if (employeeId) where.assignment.employeeId = employeeId;
    if (unitId) {
      where.assignment.employee = { unitId };
    }
    if (status) {
      where.assignment.status = status;
    }
  }


  if (q && q.trim() !== '') {
    const searchTerm = q.trim();
    where.AND = where.AND || [];
    where.AND.push({
      OR: [
        { assignment: { employee: { fullName: { contains: searchTerm, mode: 'insensitive' } } } },
        { assignment: { employee: { tcNo: { contains: searchTerm, mode: 'insensitive' } } } },
        { teslimAlanIc: { contains: searchTerm, mode: 'insensitive' } },
        {
          items: {
            some: {
              hardware: {
                OR: [
                  { brand: { contains: searchTerm, mode: 'insensitive' } },
                  { model: { contains: searchTerm, mode: 'insensitive' } },
                  { serialNo: { contains: searchTerm, mode: 'insensitive' } },
                  { demirbasNo: { contains: searchTerm, mode: 'insensitive' } },
                  { category: { name: { contains: searchTerm, mode: 'insensitive' } } },
                ],
              },
            },
          },
        },
        {
          accessoryItems: {
            some: {
              accessory: {
                category: { name: { contains: searchTerm, mode: 'insensitive' } },
              },
            },
          },
        },
      ],
    });
  }

  const [items, totalCount] = await Promise.all([
    prisma.return.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        assignment: {
          include: {
            employee: {
              select: { id: true, fullName: true, unit: { select: { id: true, name: true } } },
            },
          },
        },
        items: {
          include: {
            hardware: {
              select: { id: true, demirbasNo: true, brand: true, model: true },
            },
          },
        },
        accessoryItems: {
          include: {
            accessory: {
              select: { id: true, name: true, brand: true },
            },
          },
        },
      },
    }),
    prisma.return.count({ where }),
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

export const getReturnDetail = async (id) => {
  const returnRecord = await prisma.return.findUnique({
    where: { id },
    include: {
      assignment: {
        include: {
          employee: {
            select: { id: true, fullName: true, tcNo: true, unit: { select: { id: true, name: true } }, phone: true, email: true },
          },
          createdBy: {
            select: { id: true, fullName: true, email: true },
          },
        },
      },
      signedFormAttachment: true,
      items: {
        include: {
          hardware: {
            select: { id: true, demirbasNo: true, brand: true, model: true, serialNo: true, category: { select: { name: true } } },
          },
        },
      },
      accessoryItems: {
        include: {
          accessory: {
            select: { id: true, name: true, brand: true, category: { select: { name: true } } },
          },
        },
      },
    },
  });

  if (!returnRecord) {
    const error = new Error('İade kaydı bulunamadı.');
    error.statusCode = 404;
    throw error;
  }

  return returnRecord;
};

export const getReturnPdfFile = async (id) => {
  const returnRecord = await prisma.return.findUnique({ where: { id } });
  if (!returnRecord) {
    const error = new Error('İade kaydı bulunamadı.');
    error.statusCode = 404;
    throw error;
  }

  // Return PDFs are generated from the current assignment/product relations.
  // Do not serve the previously persisted file: product edits must be visible
  // in the next download immediately.
  return generateReturnPdf(id);
};

export const uploadSignedReturnForm = async (id, file, userId) => {
  const returnRecord = await prisma.return.findUnique({ where: { id } });
  if (!returnRecord) {
    const error = new Error('İade kaydı bulunamadı.');
    error.statusCode = 404;
    throw error;
  }

  const attachment = await saveAttachment({
    entityType: 'return',
    entityId: id,
    fileType: 'signed_form',
    file,
    uploadedById: userId,
  });

  await prisma.return.update({
    where: { id },
    data: {
      signedFormAttachmentId: attachment.id,
    },
  });

  return attachment;
};

export const getSignedReturnFormFile = async (id) => {
  const returnRecord = await prisma.return.findUnique({
    where: { id },
    include: { signedFormAttachment: true },
  });

  if (!returnRecord) {
    const error = new Error('İade kaydı bulunamadı.');
    error.statusCode = 404;
    throw error;
  }

  if (!returnRecord.signedFormAttachmentId || !returnRecord.signedFormAttachment) {
    const error = new Error('Bu iade kaydına henüz imzalı belge yüklenmemiş.');
    error.statusCode = 404;
    throw error;
  }

  const fileFilePath = returnRecord.signedFormAttachment.filePath;
  if (!fs.existsSync(fileFilePath)) {
    const error = new Error('İmzalı iade belgesi fiziksel olarak sunucuda bulunamadı.');
    error.statusCode = 404;
    throw error;
  }

  return returnRecord.signedFormAttachment;
};

export const exportReturns = async ({ assignmentId, employeeId, unitId, q }, res) => {
  const where = {};
  if (assignmentId) where.assignmentId = assignmentId;

  if (employeeId || unitId) {
    where.assignment = where.assignment || {};
    if (employeeId) where.assignment.employeeId = employeeId;
    if (unitId) {
      where.assignment.employee = { unitId };
    }
  }

  if (q && q.trim() !== '') {
    const searchTerm = q.trim();
    where.AND = where.AND || [];
    where.AND.push({
      OR: [
        { assignment: { employee: { fullName: { contains: searchTerm, mode: 'insensitive' } } } },
        { assignment: { employee: { tcNo: { contains: searchTerm, mode: 'insensitive' } } } },
        { teslimAlanIc: { contains: searchTerm, mode: 'insensitive' } },
        {
          items: {
            some: {
              hardware: {
                OR: [
                  { brand: { contains: searchTerm, mode: 'insensitive' } },
                  { model: { contains: searchTerm, mode: 'insensitive' } },
                  { serialNo: { contains: searchTerm, mode: 'insensitive' } },
                  { demirbasNo: { contains: searchTerm, mode: 'insensitive' } },
                  { category: { name: { contains: searchTerm, mode: 'insensitive' } } },
                ],
              },
            },
          },
        },
        {
          accessoryItems: {
            some: {
              accessory: {
                category: { name: { contains: searchTerm, mode: 'insensitive' } },
              },
            },
          },
        },
      ],
    });
  }

  const returnsList = await prisma.return.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: {
      assignment: {
        include: {
          employee: {
            select: {
              fullName: true,
              unit: { select: { name: true } },
            },
          },
        },
      },
      items: {
        include: {
          hardware: true,
        },
      },
      accessoryItems: {
        include: {
          accessory: true,
        },
      },
    },
  });

  const columns = [
    { header: 'İade No', key: 'returnNo', width: 16 },
    { header: 'Bağlı Zimmet No', key: 'assignmentNo', width: 18 },
    { header: 'Personel Ad Soyad', key: 'employeeName', width: 22 },
    { header: 'Personel Birimi', key: 'unitName', width: 18 },
    { header: 'İade Tarihi', key: 'tarih', width: 16 },
    { header: 'Kalem Türü', key: 'itemType', width: 16 },
    { header: 'Ürün Adı / Marka-Model', key: 'productName', width: 25 },
    { header: 'Demirbaş No', key: 'demirbasNo', width: 18 },
    { header: 'İade Edilen Miktar', key: 'quantity', width: 16 },
    { header: 'İade Sonrası Durum', key: 'resultStatus', width: 18 },
  ];

  const STATUS_TEXT_MAP = {
    Hazir: 'Hazır',
    Arizali: 'Arızalı',
    Serviste: 'Serviste',
    KullanimDisi: 'Kullanım Dışı',
  };

  const rows = [];

  for (const ret of returnsList) {
    const baseRow = {
      returnNo: ret.id ? ret.id.substring(0, 8) : '-',
      assignmentNo: ret.assignmentId ? ret.assignmentId.substring(0, 8) : '-',
      employeeName: ret.assignment && ret.assignment.employee ? ret.assignment.employee.fullName : '-',
      unitName: ret.assignment && ret.assignment.employee && ret.assignment.employee.unit ? ret.assignment.employee.unit.name : '-',
      tarih: ret.tarih ? new Date(ret.tarih).toLocaleDateString('tr-TR') : '-',
    };

    let hasAnyItems = false;

    // 1. Hardware Return Items
    if (ret.items && ret.items.length > 0) {
      hasAnyItems = true;
      for (const hwItem of ret.items) {
        const brandModel = hwItem.hardware
          ? [hwItem.hardware.brand, hwItem.hardware.model].filter(Boolean).join(' ')
          : '-';

        rows.push({
          ...baseRow,
          itemType: 'Varlık',
          productName: brandModel || '-',
          demirbasNo: (hwItem.hardware && hwItem.hardware.demirbasNo) || '-',
          quantity: 1,
          resultStatus: STATUS_TEXT_MAP[hwItem.resultStatus] || hwItem.resultStatus || '-',
        });
      }
    }

    // 2. Accessory Return Items
    if (ret.accessoryItems && ret.accessoryItems.length > 0) {
      hasAnyItems = true;
      for (const accItem of ret.accessoryItems) {
        const accName = accItem.accessory ? accItem.accessory.name : '-';

        rows.push({
          ...baseRow,
          itemType: 'Aksesuar',
          productName: accName,
          demirbasNo: '',
          quantity: accItem.quantity || 1,
          resultStatus: 'Hazır', // Accessories returned to available stock
        });
      }
    }

    // Fallback if return record has no items
    if (!hasAnyItems) {
      rows.push({
        ...baseRow,
        itemType: '-',
        productName: '-',
        demirbasNo: '',
        quantity: 0,
        resultStatus: '-',
      });
    }
  }

  const { createExcelStream } = await import('../../services/excelExport.service.js');
  const todayStr = new Date().toISOString().split('T')[0];
  await createExcelStream('İadeler', columns, rows, res, `iade_${todayStr}.xlsx`);
};
