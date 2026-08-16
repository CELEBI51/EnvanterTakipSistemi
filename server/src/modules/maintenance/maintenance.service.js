import prisma from '../../config/db.js';

// Map string status (e.g. "Hazır", "Kullanımda") to Prisma Enum HardwareStatus
const MAP_STATUS_TO_ENUM = {
  'Hazır': 'Hazir',
  'Kullanımda': 'Kullanimda',
  'Arızalı': 'Arizali',
  'Serviste': 'Serviste',
  'Kullanım Dışı': 'KullanimDisi',
};

const MAP_ENUM_TO_STRING = {
  'Hazir': 'Hazır',
  'Kullanimda': 'Kullanımda',
  'Arizali': 'Arızalı',
  'Serviste': 'Serviste',
  'KullanimDisi': 'Kullanım Dışı',
};

export const createMaintenance = async (data, createdById) => {
  const { hardwareId, name, maintenanceType, customTypeNote, startDate, endDate, cost, notes } = data;

  const hardware = await prisma.hardware.findUnique({
    where: { id: hardwareId },
  });

  if (!hardware) {
    const error = new Error('Varlık bulunamadı.');
    error.statusCode = 404;
    throw error;
  }

  // Active maintenance check
  const activeMaintenance = await prisma.maintenanceRecord.findFirst({
    where: {
      hardwareId: hardwareId,
      status: 'Devam Ediyor',
    },
  });

  if (activeMaintenance) {
    const error = new Error(
      'Bu varlık için zaten devam eden bir bakım kaydı mevcut. Önce mevcut bakımı tamamlayın.'
    );
    error.statusCode = 409;
    throw error;
  }

  // Previous hardware status in plain Turkish string (e.g. "Hazır", "Kullanımda", "Arızalı")
  const previousHardwareStatus = MAP_ENUM_TO_STRING[hardware.status] || hardware.status;
  const isCompletedImmediately = !!endDate;

  return await prisma.$transaction(async (tx) => {
    const record = await tx.maintenanceRecord.create({
      data: {
        name,
        hardwareId,
        maintenanceType,
        customTypeNote: maintenanceType === 'Diğer' ? customTypeNote : null,
        startDate: new Date(startDate),
        endDate: isCompletedImmediately ? new Date(endDate) : null,
        cost: cost ? cost : null,
        notes: notes || null,
        status: isCompletedImmediately ? 'Tamamlandı' : 'Devam Ediyor',
        previousHardwareStatus,
        appliedResultStatus: isCompletedImmediately ? previousHardwareStatus : null,
        createdById,
      },
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
    });

    // Bakım devam ediyorsa (endDate boşsa), varlık durumunu Serviste yap
    if (!isCompletedImmediately) {
      await tx.hardware.update({
        where: { id: hardwareId },
        data: { status: 'Serviste' },
      });
    }

    return record;
  });
};

export const listMaintenance = async ({ hardwareId, status, page = 1, pageSize = 10 }) => {
  const pageNum = parseInt(page, 10) || 1;
  const limit = parseInt(pageSize, 10) || 10;
  const skip = (pageNum - 1) * limit;

  const where = {};
  if (hardwareId) where.hardwareId = hardwareId;
  if (status) where.status = status;

  const [items, totalCount] = await Promise.all([
    prisma.maintenanceRecord.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
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
        createdBy: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
        components: {
          include: {
            component: {
              select: {
                id: true,
                name: true,
                brand: true,
                model: true,
              },
            },
          },
        },
      },
    }),
    prisma.maintenanceRecord.count({ where }),
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

export const getMaintenanceDetail = async (id) => {
  const record = await prisma.maintenanceRecord.findUnique({
    where: { id },
    include: {
      hardware: {
        select: {
          id: true,
          demirbasNo: true,
          brand: true,
          model: true,
          status: true,
          location: true,
        },
      },
      createdBy: {
        select: {
          id: true,
          fullName: true,
          email: true,
        },
      },
      components: {
        include: {
          component: {
            select: {
              id: true,
              name: true,
              brand: true,
              model: true,
              location: true,
            },
          },
        },
        orderBy: { createdAt: 'asc' },
      },
    },
  });

  if (!record) {
    const error = new Error('Bakım kaydı bulunamadı.');
    error.statusCode = 404;
    throw error;
  }

  return record;
};

export const addComponentToMaintenance = async (maintenanceId, componentId, quantityUsed, createdById) => {
  return await prisma.$transaction(async (tx) => {
    const record = await tx.maintenanceRecord.findUnique({
      where: { id: maintenanceId },
      include: { hardware: true },
    });

    if (!record) {
      const error = new Error('Bakım kaydı bulunamadı.');
      error.statusCode = 404;
      throw error;
    }

    const component = await tx.component.findUnique({
      where: { id: componentId },
    });

    if (!component) {
      const error = new Error('Bileşen bulunamadı.');
      error.statusCode = 404;
      throw error;
    }

    if (component.availableQuantity < quantityUsed) {
      const error = new Error(`Yeterli bileşen stoğu yok, mevcut: ${component.availableQuantity} adet`);
      error.statusCode = 400;
      throw error;
    }

    // 1. Component stoğunu güncelle
    await tx.component.update({
      where: { id: componentId },
      data: {
        availableQuantity: component.availableQuantity - quantityUsed,
        usedQuantity: component.usedQuantity + quantityUsed,
      },
    });

    // 2. Stock movements ortak tablosuna kayıt ekle
    const hwInfo = `${record.hardware.brand}${record.hardware.model ? ' ' + record.hardware.model : ''} / ${record.hardware.demirbasNo}`;
    await tx.stockMovement.create({
      data: {
        entityType: 'component',
        entityId: componentId,
        type: 'used_in_maintenance',
        quantity: quantityUsed,
        note: `"${record.name}" bakımı için kullanıldı (${hwInfo})`,
        createdById,
      },
    });

    // 3. MaintenanceComponent satırını oluştur
    const item = await tx.maintenanceComponent.create({
      data: {
        maintenanceId,
        componentId,
        quantityUsed,
      },
      include: {
        component: {
          select: {
            id: true,
            name: true,
            brand: true,
            model: true,
          },
        },
      },
    });

    return item;
  });
};

export const completeMaintenance = async (id, endDate, resultStatus) => {
  const record = await prisma.maintenanceRecord.findUnique({
    where: { id },
  });

  if (!record) {
    const error = new Error('Bakım kaydı bulunamadı.');
    error.statusCode = 404;
    throw error;
  }

  if (record.status === 'Tamamlandı') {
    const error = new Error('Bu bakım kaydı zaten tamamlanmış.');
    error.statusCode = 400;
    throw error;
  }

  const { previousHardwareStatus } = record;
  let finalStatusString;

  if (previousHardwareStatus === 'Kullanımda') {
    // Durum sorma, otomatik 'Kullanımda'ya dön
    finalStatusString = 'Kullanımda';
  } else {
    // previousHardwareStatus === 'Hazır' VEYA 'Arızalı' ise durum sor
    if (!resultStatus || !resultStatus.trim()) {
      const error = new Error(
        previousHardwareStatus === 'Arızalı'
          ? 'Bu varlık arızalı durumdayken bakıma alınmıştı. Bakım sonucunda durumun ne olacağını seçmelisiniz.'
          : 'Bakım tamamlanınca varlığın yeni durumunu seçmelisiniz.'
      );
      error.statusCode = 400;
      throw error;
    }
    finalStatusString = resultStatus.trim();
  }

  const mappedEnumStatus = MAP_STATUS_TO_ENUM[finalStatusString];
  if (!mappedEnumStatus) {
    const error = new Error(`Geçersiz varlık durumu: ${finalStatusString}`);
    error.statusCode = 400;
    throw error;
  }

  return await prisma.$transaction(async (tx) => {
    // 1. Hardware status güncelle
    await tx.hardware.update({
      where: { id: record.hardwareId },
      data: { status: mappedEnumStatus },
    });

    // 2. MaintenanceRecord tamamlandı güncelle
    const updatedRecord = await tx.maintenanceRecord.update({
      where: { id },
      data: {
        endDate: new Date(endDate),
        status: 'Tamamlandı',
        appliedResultStatus: finalStatusString,
      },
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
    });

    return updatedRecord;
  });
};
