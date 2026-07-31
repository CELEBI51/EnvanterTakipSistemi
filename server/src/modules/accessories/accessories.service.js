import prisma from '../../config/db.js';

export const createAccessory = async (data, userId) => {
  const { name, category, brand, initialQuantity, minThreshold, notes } = data;

  return await prisma.$transaction(async (tx) => {
    const newAccessory = await tx.accessory.create({
      data: {
        name: name.trim(),
        category,
        brand: brand && brand.trim() !== '' ? brand.trim() : null,
        totalQuantity: initialQuantity,
        availableQuantity: initialQuantity,
        assignedQuantity: 0,
        outOfUseQuantity: 0,
        minThreshold: minThreshold !== undefined && minThreshold !== null ? minThreshold : null,
        notes: notes && notes.trim() !== '' ? notes.trim() : null,
        createdById: userId,
      },
    });

    await tx.accessoryStockMovement.create({
      data: {
        accessoryId: newAccessory.id,
        type: 'restock',
        quantity: initialQuantity,
        note: 'İlk stok girişi',
        createdById: userId,
      },
    });

    return newAccessory;
  });
};

export const listAccessories = async ({ page = 1, pageSize = 10, category, q }) => {
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const sizeNum = 10;
  const skip = (pageNum - 1) * sizeNum;

  const where = {};

  if (category) {
    where.category = category;
  }

  if (q && q.trim() !== '') {
    const searchTerm = q.trim();
    where.OR = [
      { name: { contains: searchTerm, mode: 'insensitive' } },
      { brand: { contains: searchTerm, mode: 'insensitive' } },
    ];
  }

  const [totalCount, items] = await Promise.all([
    prisma.accessory.count({ where }),
    prisma.accessory.findMany({
      where,
      skip,
      take: sizeNum,
      orderBy: { createdAt: 'desc' },
      include: {
        createdBy: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
      },
    }),
  ]);

  const totalPages = Math.ceil(totalCount / sizeNum) || 1;

  return {
    items,
    totalCount,
    totalPages,
    page: pageNum,
    pageSize: sizeNum,
  };
};

export const getAccessoryById = async (id) => {
  const item = await prisma.accessory.findUnique({
    where: { id },
    include: {
      createdBy: {
        select: {
          id: true,
          fullName: true,
          email: true,
        },
      },
    },
  });

  if (!item) {
    const error = new Error('Aksesuar bulunamadı.');
    error.statusCode = 404;
    throw error;
  }

  return item;
};

export const restockAccessory = async (id, data, userId) => {
  const { quantity, note } = data;

  const existing = await prisma.accessory.findUnique({ where: { id } });
  if (!existing) {
    const error = new Error('Aksesuar bulunamadı.');
    error.statusCode = 404;
    throw error;
  }

  return await prisma.$transaction(async (tx) => {
    const updated = await tx.accessory.update({
      where: { id },
      data: {
        totalQuantity: { increment: quantity },
        availableQuantity: { increment: quantity },
      },
    });

    await tx.accessoryStockMovement.create({
      data: {
        accessoryId: id,
        type: 'restock',
        quantity,
        note: note && note.trim() !== '' ? note.trim() : 'Stok takviyesi',
        createdById: userId,
      },
    });

    return updated;
  });
};

export const markDefective = async (id, data, userId) => {
  const { quantity, note } = data;

  const existing = await prisma.accessory.findUnique({ where: { id } });
  if (!existing) {
    const error = new Error('Aksesuar bulunamadı.');
    error.statusCode = 404;
    throw error;
  }

  if (existing.availableQuantity < quantity) {
    const error = new Error(`Yeterli hazır stok yok, mevcut: ${existing.availableQuantity} adet`);
    error.statusCode = 400;
    throw error;
  }

  return await prisma.$transaction(async (tx) => {
    const updated = await tx.accessory.update({
      where: { id },
      data: {
        availableQuantity: { decrement: quantity },
        outOfUseQuantity: { increment: quantity },
      },
    });

    await tx.accessoryStockMovement.create({
      data: {
        accessoryId: id,
        type: 'mark_defective',
        quantity,
        note: note && note.trim() !== '' ? note.trim() : 'Arızalı/Kullanım dışı stok ayrıldı',
        createdById: userId,
      },
    });

    return updated;
  });
};

export const getAccessoryHistory = async (id) => {
  const existing = await prisma.accessory.findUnique({ where: { id } });
  if (!existing) {
    const error = new Error('Aksesuar bulunamadı.');
    error.statusCode = 404;
    throw error;
  }

  const movements = await prisma.accessoryStockMovement.findMany({
    where: { accessoryId: id },
    orderBy: { createdAt: 'desc' },
    include: {
      createdBy: {
        select: {
          id: true,
          fullName: true,
          email: true,
        },
      },
    },
  });

  return movements;
};

export const deleteAccessory = async (id) => {
  const existing = await prisma.accessory.findUnique({ where: { id } });
  if (!existing) {
    const error = new Error('Silinecek aksesuar bulunamadı.');
    error.statusCode = 404;
    throw error;
  }

  if (existing.assignedQuantity > 0 || existing.outOfUseQuantity > 0) {
    const error = new Error('Aktif zimmetli veya arızalı adeti bulunan aksesuar silinemez.');
    error.statusCode = 400;
    throw error;
  }

  await prisma.accessory.delete({ where: { id } });
  return { message: 'Aksesuar başarıyla silindi.' };
};
