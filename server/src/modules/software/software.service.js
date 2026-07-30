import prisma from '../../config/db.js';

export const calculateDaysRemaining = (endDateStr) => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const end = new Date(endDateStr);
  const target = new Date(end.getFullYear(), end.getMonth(), end.getDate());
  const diffTime = target.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

const formatSoftwareItem = (item) => {
  if (!item) return null;
  return {
    ...item,
    daysRemaining: calculateDaysRemaining(item.endDate),
  };
};

export const createSoftware = async (data) => {
  const { name, license_key, start_date, end_date, assigned_hardware_id, notes } = data;

  const hardwareId = assigned_hardware_id && assigned_hardware_id.trim() !== '' ? assigned_hardware_id : null;

  if (hardwareId) {
    const existingHardware = await prisma.hardware.findUnique({
      where: { id: hardwareId },
    });
    if (!existingHardware) {
      const error = new Error('Atanmak istenen donanım bulunamadı.');
      error.statusCode = 404;
      throw error;
    }
  }

  const newItem = await prisma.software.create({
    data: {
      name: name.trim(),
      licenseKey: license_key.trim(),
      startDate: new Date(start_date),
      endDate: new Date(end_date),
      assignedHardwareId: hardwareId,
      notes: notes ? notes.trim() : null,
    },
    include: {
      assignedHardware: {
        select: {
          id: true,
          brand: true,
          model: true,
          demirbasNo: true,
          category: true,
        },
      },
    },
  });

  return formatSoftwareItem(newItem);
};

export const listSoftware = async ({ page = 1, pageSize = 10, q, expiring }) => {
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const sizeNum = Math.max(1, parseInt(pageSize, 10) || 10);
  const skip = (pageNum - 1) * sizeNum;

  const where = {};

  if (q && q.trim() !== '') {
    const searchTerm = q.trim();
    where.OR = [
      { name: { contains: searchTerm, mode: 'insensitive' } },
      { licenseKey: { contains: searchTerm, mode: 'insensitive' } },
    ];
  }

  if (expiring === 'true' || expiring === true) {
    const now = new Date();
    const thresholdDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 15, 23, 59, 59, 999);
    where.endDate = {
      lte: thresholdDate,
    };
  }

  const [totalCount, items] = await Promise.all([
    prisma.software.count({ where }),
    prisma.software.findMany({
      where,
      skip,
      take: sizeNum,
      orderBy: { endDate: 'asc' }, // Varsayılan: en yakın bitecek en üstte
      include: {
        assignedHardware: {
          select: {
            id: true,
            brand: true,
            model: true,
            demirbasNo: true,
            category: true,
          },
        },
      },
    }),
  ]);

  const formattedItems = items.map(formatSoftwareItem);
  const totalPages = Math.ceil(totalCount / sizeNum) || 1;

  return {
    items: formattedItems,
    totalCount,
    totalPages,
    page: pageNum,
    pageSize: sizeNum,
  };
};

export const getSoftwareById = async (id) => {
  const item = await prisma.software.findUnique({
    where: { id },
    include: {
      assignedHardware: {
        select: {
          id: true,
          brand: true,
          model: true,
          demirbasNo: true,
          category: true,
        },
      },
    },
  });

  if (!item) {
    const error = new Error('Yazılım bulunamadı.');
    error.statusCode = 404;
    throw error;
  }

  return formatSoftwareItem(item);
};

export const updateSoftware = async (id, data) => {
  const existing = await prisma.software.findUnique({ where: { id } });
  if (!existing) {
    const error = new Error('Güncellenecek yazılım bulunamadı.');
    error.statusCode = 404;
    throw error;
  }

  const hardwareId = data.assigned_hardware_id !== undefined
    ? (data.assigned_hardware_id && data.assigned_hardware_id.trim() !== '' ? data.assigned_hardware_id : null)
    : existing.assignedHardwareId;

  if (hardwareId && hardwareId !== existing.assignedHardwareId) {
    const existingHardware = await prisma.hardware.findUnique({
      where: { id: hardwareId },
    });
    if (!existingHardware) {
      const error = new Error('Atanmak istenen donanım bulunamadı.');
      error.statusCode = 404;
      throw error;
    }
  }

  const updated = await prisma.software.update({
    where: { id },
    data: {
      name: data.name !== undefined ? data.name.trim() : existing.name,
      licenseKey: data.license_key !== undefined ? data.license_key.trim() : existing.licenseKey,
      startDate: data.start_date !== undefined ? new Date(data.start_date) : existing.startDate,
      endDate: data.end_date !== undefined ? new Date(data.end_date) : existing.endDate,
      assignedHardwareId: hardwareId,
      notes: data.notes !== undefined ? (data.notes ? data.notes.trim() : null) : existing.notes,
    },
    include: {
      assignedHardware: {
        select: {
          id: true,
          brand: true,
          model: true,
          demirbasNo: true,
          category: true,
        },
      },
    },
  });

  return formatSoftwareItem(updated);
};

export const deleteSoftware = async (id) => {
  const existing = await prisma.software.findUnique({ where: { id } });
  if (!existing) {
    const error = new Error('Silinecek yazılım bulunamadı.');
    error.statusCode = 404;
    throw error;
  }

  await prisma.software.delete({ where: { id } });
  return { message: 'Yazılım kaydı başarıyla silindi.' };
};

export const getExpiringSoftware = async (days = 15) => {
  const daysNum = parseInt(days, 10) || 15;
  const now = new Date();
  const targetDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + daysNum, 23, 59, 59, 999);

  const items = await prisma.software.findMany({
    where: {
      endDate: {
        lte: targetDate,
      },
    },
    orderBy: { endDate: 'asc' },
    include: {
      assignedHardware: {
        select: {
          id: true,
          brand: true,
          model: true,
          demirbasNo: true,
          category: true,
        },
      },
    },
  });

  return items.map(formatSoftwareItem);
};
