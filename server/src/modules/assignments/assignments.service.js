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

  if (!employee.isActive) {
    const error = new Error(`"${employee.fullName}" isimli personel işten çıkarıldığı (pasif) için zimmetleme yapılamaz.`);
    error.statusCode = 400;
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

  // 5. System Log Kaydı
  try {
    const { createLog } = await import('../../services/log.service.js');
    const kalemSayisi = hardwareItems.length + accessoryItems.length + consumableItems.length;
    await createLog({
      userId: createdById,
      userEmail: typeof currentUser === 'object' ? currentUser.email : null,
      action: 'CREATE',
      module: 'assignment',
      description: `${teslimEden} — ${employee.fullName} adlı personele zimmet oluşturdu (${kalemSayisi} kalem)`,
      entityId: assignment.id,
      statusCode: 201,
    });
  } catch (logErr) {
    console.error('Zimmet log hatası:', logErr);
  }

  // Otomatik PDF üretimi (Puppeteer)
  try {
    await generateAssignmentPdf(assignment.id);
  } catch (pdfErr) {
    console.error('PDF üretilirken hata oluştu (Zimmet kaydı oluşturuldu):', pdfErr);
  }

  // BİLDİRİM 4: Yeni Zimmet Bildirimi (Anlık - Zimmet Oluşturulunca)
  try {
    const fullAssignment = await prisma.assignment.findUnique({
      where: { id: assignment.id },
      include: {
        employee: {
          select: {
            fullName: true,
            unit: { select: { name: true } },
          },
        },
        items: {
          include: {
            hardware: {
              select: { demirbasNo: true, brand: true, model: true },
            },
          },
        },
        accessoryItems: {
          include: {
            accessory: { select: { name: true } },
          },
        },
        consumableItems: {
          include: {
            consumable: { select: { name: true } },
          },
        },
      },
    });

    if (fullAssignment) {
      const { sendMailToAdmins, getEmailTemplate } = await import('../../services/mail.service.js');

      const empName = fullAssignment.employee ? fullAssignment.employee.fullName : 'Bilinmiyor';
      const unitName = fullAssignment.employee && fullAssignment.employee.unit ? fullAssignment.employee.unit.name : 'Belirtilmedi';
      const teslimTarihiFormatted = new Date(fullAssignment.teslimTarihi).toLocaleDateString('tr-TR');

      const kalemler = [];
      fullAssignment.items.forEach((it) => {
        if (it.hardware) kalemler.push(`• 1 Adet ${it.hardware.brand} ${it.hardware.model || ''} (Demirbaş No: ${it.hardware.demirbasNo})`);
      });
      fullAssignment.accessoryItems.forEach((accItem) => {
        if (accItem.accessory) kalemler.push(`• ${accItem.quantityGiven} Adet ${accItem.accessory.name} (Aksesuar)`);
      });
      fullAssignment.consumableItems.forEach((conItem) => {
        if (conItem.consumable) kalemler.push(`• ${conItem.quantityGiven} Adet ${conItem.consumable.name} (Sarf Malzeme)`);
      });

      const rendered = await getEmailTemplate('new_assignment', {
        personelAdi: empName,
        birimAdi: unitName,
        tarih: teslimTarihiFormatted,
        teslimEden: fullAssignment.teslimEden || 'Bilgi Teknolojileri',
        kalemListesi: kalemler.join('\n'),
      });

      await sendMailToAdmins({
        subject: rendered.subject,
        text: rendered.bodyText,
        html: rendered.html,
      });

      // Zimmetleme sonrası kritik stok seviyesine düşen Aksesuar/Sarf Malzeme kontrolü
      const { checkAndNotifyItemInstantCriticalStock } = await import('../../jobs/criticalStock.job.js');
      
      for (const accItem of fullAssignment.accessoryItems) {
        if (accItem.accessory) {
          const freshAcc = await prisma.accessory.findUnique({ where: { id: accItem.accessoryId } });
          if (freshAcc) {
            await checkAndNotifyItemInstantCriticalStock({
              name: freshAcc.name,
              type: 'Aksesuar',
              availableQuantity: freshAcc.availableQuantity,
            });
          }
        }
      }

      for (const conItem of fullAssignment.consumableItems) {
        if (conItem.consumable) {
          const freshCon = await prisma.consumable.findUnique({ where: { id: conItem.consumableId } });
          if (freshCon) {
            await checkAndNotifyItemInstantCriticalStock({
              name: freshCon.name,
              type: 'Sarf Malzeme',
              availableQuantity: freshCon.availableQuantity,
            });
          }
        }
      }
    }
  } catch (mailErr) {
    console.error('[AssignmentService] Zimmet mail bildirimi gönderilirken hata (Zimmet kaydı etkilenmedi):', mailErr);
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

export const exportAssignments = async ({ employeeId, status, unitId, dateFrom, dateTo, q }, res) => {
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

  const assignments = await prisma.assignment.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: {
      employee: {
        select: {
          fullName: true,
          unit: { select: { name: true } },
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
      consumableItems: {
        include: {
          consumable: true,
        },
      },
    },
  });

  const columns = [
    { header: 'Zimmet No', key: 'assignmentNo', width: 16 },
    { header: 'Personel Ad Soyad', key: 'employeeName', width: 22 },
    { header: 'Personel Birimi', key: 'unitName', width: 18 },
    { header: 'Teslim Eden', key: 'teslimEden', width: 18 },
    { header: 'Zimmet Tarihi', key: 'teslimTarihi', width: 16 },
    { header: 'Zimmet Durumu', key: 'statusText', width: 15 },
    { header: 'Kalem Türü', key: 'itemType', width: 16 },
    { header: 'Ürün Adı / Marka-Model', key: 'productName', width: 25 },
    { header: 'Demirbaş No', key: 'demirbasNo', width: 18 },
    { header: 'Seri No', key: 'serialNo', width: 20 },
    { header: 'Miktar', key: 'quantity', width: 12 },
    { header: 'İade Durumu', key: 'itemReturnStatus', width: 15 },
  ];

  const STATUS_MAP = {
    Aktif: 'Aktif',
    KismiIade: 'Kısmi İade',
    IadeEdildi: 'İade Edildi',
  };

  const rows = [];

  for (const asgn of assignments) {
    const baseRow = {
      assignmentNo: asgn.id ? asgn.id.substring(0, 8) : '-',
      employeeName: asgn.employee ? asgn.employee.fullName : '-',
      unitName: asgn.employee && asgn.employee.unit ? asgn.employee.unit.name : '-',
      teslimEden: asgn.teslimEden || '-',
      teslimTarihi: asgn.teslimTarihi ? new Date(asgn.teslimTarihi).toLocaleDateString('tr-TR') : '-',
      statusText: STATUS_MAP[asgn.status] || asgn.status,
    };

    let hasAnyItems = false;

    // 1. Hardware Items
    if (asgn.items && asgn.items.length > 0) {
      hasAnyItems = true;
      for (const hwItem of asgn.items) {
        const brandModel = hwItem.hardware
          ? [hwItem.hardware.brand, hwItem.hardware.model].filter(Boolean).join(' ')
          : '-';

        let returnStat = 'Hayır';
        if (hwItem.returned) {
          returnStat = 'Evet';
        }

        rows.push({
          ...baseRow,
          itemType: 'Varlık',
          productName: brandModel || '-',
          demirbasNo: (hwItem.hardware && hwItem.hardware.demirbasNo) || '-',
          serialNo: (hwItem.hardware && hwItem.hardware.serialNo) || '-',
          quantity: 1,
          itemReturnStatus: returnStat,
        });
      }
    }

    // 2. Accessory Items
    if (asgn.accessoryItems && asgn.accessoryItems.length > 0) {
      hasAnyItems = true;
      for (const accItem of asgn.accessoryItems) {
        const accName = accItem.accessory ? accItem.accessory.name : '-';

        let returnStat = 'Hayır';
        if (accItem.quantityReturned >= accItem.quantityGiven) {
          returnStat = 'Evet';
        } else if (accItem.quantityReturned > 0) {
          returnStat = 'Kısmi';
        }

        rows.push({
          ...baseRow,
          itemType: 'Aksesuar',
          productName: accName,
          demirbasNo: '',
          serialNo: '',
          quantity: accItem.quantityGiven || 1,
          itemReturnStatus: returnStat,
        });

      }
    }

    // 3. Consumable Items
    if (asgn.consumableItems && asgn.consumableItems.length > 0) {
      hasAnyItems = true;
      for (const conItem of asgn.consumableItems) {
        const conName = conItem.consumable ? conItem.consumable.name : '-';
        rows.push({
          ...baseRow,
          itemType: 'Sarf Malzeme',
          productName: conName,
          demirbasNo: '',
          serialNo: '',
          quantity: conItem.quantity || 1,
          itemReturnStatus: 'N/A', // Consumables are not returned
        });
      }
    }

    // Fallback if assignment has no items
    if (!hasAnyItems) {
      rows.push({
        ...baseRow,
        itemType: '-',
        productName: '-',
        demirbasNo: '',
        serialNo: '',
        quantity: 0,
        itemReturnStatus: '-',
      });
    }
  }

  const { createExcelStream } = await import('../../services/excelExport.service.js');
  const todayStr = new Date().toISOString().split('T')[0];
  await createExcelStream('Zimmetler', columns, rows, res, `zimmet_${todayStr}.xlsx`);
};


