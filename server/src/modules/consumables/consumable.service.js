import prisma from '../../config/db.js';

function formatConsumable(item) {
  if (!item) return null;
  const { category, ...rest } = item;
  return {
    ...rest,
    category: category ? category.name : null,
    categoryId: item.categoryId,
  };
}

export const createConsumable = async (data, userId) => {
  const {
    name,
    categoryId,
    initialQuantity,
    manufacturer,
    supplier,
    location,
    invoiceNo,
    purchaseDate,
    purchaseAmount,
    notes,
  } = data;

  const category = await prisma.category.findUnique({ where: { id: categoryId } });
  if (!category) {
    const error = new Error('Kategori bulunamadı.');
    error.statusCode = 404;
    throw error;
  }

  const consumable = await prisma.$transaction(async (tx) => {
    const item = await tx.consumable.create({
      data: {
        name: name.trim(),
        categoryId,
        manufacturer: manufacturer && manufacturer.trim() !== '' ? manufacturer.trim() : null,
        supplier: supplier && supplier.trim() !== '' ? supplier.trim() : null,
        location: location && location.trim() !== '' ? location.trim() : null,
        totalQuantity: initialQuantity,
        availableQuantity: initialQuantity,
        consumedQuantity: 0,
        invoiceNo: invoiceNo && invoiceNo.trim() !== '' ? invoiceNo.trim() : null,
        purchaseDate: purchaseDate && String(purchaseDate).trim() !== '' ? new Date(purchaseDate) : null,
        purchaseAmount: purchaseAmount !== null && purchaseAmount !== undefined ? purchaseAmount : null,
        notes: notes && notes.trim() !== '' ? notes.trim() : null,
        createdById: userId,
      },
      include: {
        category: true,
        createdBy: {
          select: { id: true, fullName: true, email: true },
        },
      },
    });

    await tx.stockMovement.create({
      data: {
        entityType: 'consumable',
        entityId: item.id,
        type: 'restock',
        quantity: initialQuantity,
        note: 'İlk stok girişi',
        createdById: userId,
      },
    });

    return item;
  });

  return formatConsumable(consumable);
};

export const listConsumables = async ({ page = 1, pageSize = 10, categoryId, q }) => {
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const sizeNum = Math.max(1, parseInt(pageSize, 10) || 10);
  const skip = (pageNum - 1) * sizeNum;

  const where = {};

  if (categoryId) {
    where.categoryId = categoryId;
  }

  if (q && q.trim() !== '') {
    const searchTerm = q.trim();
    where.OR = [
      { name: { contains: searchTerm, mode: 'insensitive' } },
      { manufacturer: { contains: searchTerm, mode: 'insensitive' } },
      { supplier: { contains: searchTerm, mode: 'insensitive' } },
      { location: { contains: searchTerm, mode: 'insensitive' } },
    ];
  }

  const [totalCount, items] = await Promise.all([
    prisma.consumable.count({ where }),
    prisma.consumable.findMany({
      where,
      skip,
      take: sizeNum,
      orderBy: { createdAt: 'desc' },
      include: {
        category: true,
        createdBy: {
          select: { id: true, fullName: true, email: true },
        },
      },
    }),
  ]);

  const totalPages = Math.ceil(totalCount / sizeNum) || 1;

  return {
    items: items.map(formatConsumable),
    totalCount,
    totalPages,
    currentPage: pageNum,
  };
};

export const getConsumableById = async (id) => {
  const item = await prisma.consumable.findUnique({
    where: { id },
    include: {
      category: true,
      createdBy: {
        select: { id: true, fullName: true, email: true },
      },
    },
  });

  if (!item) {
    const error = new Error('Sarf malzeme bulunamadı.');
    error.statusCode = 404;
    throw error;
  }

  return formatConsumable(item);
};

export const restockConsumable = async (id, { quantity, note }, userId) => {
  const existing = await prisma.consumable.findUnique({ where: { id } });
  if (!existing) {
    const error = new Error('Sarf malzeme bulunamadı.');
    error.statusCode = 404;
    throw error;
  }

  const updatedConsumable = await prisma.$transaction(async (tx) => {
    const item = await tx.consumable.update({
      where: { id },
      data: {
        totalQuantity: { increment: quantity },
        availableQuantity: { increment: quantity },
      },
      include: { category: true },
    });

    await tx.stockMovement.create({
      data: {
        entityType: 'consumable',
        entityId: id,
        type: 'restock',
        quantity,
        note: note ? note.trim() : null,
        createdById: userId,
      },
    });

    return item;
  });

  return formatConsumable(updatedConsumable);
};

export const issueConsumable = async (id, { quantity, employeeId, note }, userId) => {
  const existing = await prisma.consumable.findUnique({ where: { id } });
  if (!existing) {
    const error = new Error('Sarf malzeme bulunamadı.');
    error.statusCode = 404;
    throw error;
  }

  if (existing.availableQuantity < quantity) {
    const error = new Error(`${existing.name} için yeterli stok yok, mevcut: ${existing.availableQuantity} adet`);
    error.statusCode = 400;
    throw error;
  }

  let employeeName = '';
  if (employeeId) {
    const emp = await prisma.employee.findUnique({ where: { id: employeeId } });
    if (emp) employeeName = emp.fullName;
  }

  const updatedConsumable = await prisma.$transaction(async (tx) => {
    const item = await tx.consumable.update({
      where: { id },
      data: {
        availableQuantity: { decrement: quantity },
        consumedQuantity: { increment: quantity },
      },
      include: { category: true },
    });

    const noteText = note && note.trim() !== ''
      ? note.trim()
      : (employeeName ? `"${employeeName}" kişisine verildi` : 'Doğrudan sarf/düşüm yapıldı');

    await tx.stockMovement.create({
      data: {
        entityType: 'consumable',
        entityId: id,
        type: 'issued',
        quantity,
        issuedToEmployeeId: employeeId || null,
        note: noteText,
        createdById: userId,
      },
    });

    return item;
  });

  // Anlık Kritik Stok Kontrolü
  try {
    const { checkAndNotifyItemInstantCriticalStock } = await import('../../jobs/criticalStock.job.js');
    await checkAndNotifyItemInstantCriticalStock({
      name: updatedConsumable.name,
      type: 'Sarf Malzeme',
      availableQuantity: updatedConsumable.availableQuantity,
      oldAvailableQuantity: existing.availableQuantity,
    });
  } catch (err) {
    console.error('Kritik stok mail kontrolü yapılırken hata:', err);
  }

  return formatConsumable(updatedConsumable);
};


export const getConsumableHistory = async (id) => {
  const existing = await prisma.consumable.findUnique({ where: { id } });
  if (!existing) {
    const error = new Error('Sarf malzeme bulunamadı.');
    error.statusCode = 404;
    throw error;
  }

  const movements = await prisma.stockMovement.findMany({
    where: { entityType: 'consumable', entityId: id },
    orderBy: { createdAt: 'desc' },
    include: {
      createdBy: {
        select: { id: true, fullName: true, email: true },
      },
      issuedToEmployee: {
        select: { id: true, fullName: true, unit: { select: { id: true, name: true } } },
      },
    },
  });

  return movements;
};

export const deleteConsumable = async (id) => {
  const existing = await prisma.consumable.findUnique({ where: { id } });
  if (!existing) {
    const error = new Error('Silinecek sarf malzeme bulunamadı.');
    error.statusCode = 404;
    throw error;
  }

  if (existing.consumedQuantity > 0) {
    const error = new Error('Tüketilmiş stoğu bulunan sarf malzeme silinemez.');
    error.statusCode = 400;
    throw error;
  }

  const assignCount = await prisma.assignmentConsumableItem.count({
    where: { consumableId: id },
  });

  if (assignCount > 0) {
    const error = new Error(
      'Bu sarf malzemeye ait geçmiş zimmet veya düşüm kayıtları bulunduğu için silinemez.'
    );
    error.statusCode = 400;
    throw error;
  }

  await prisma.$transaction([
    prisma.stockMovement.deleteMany({
      where: { entityType: 'consumable', entityId: id },
    }),
    prisma.consumable.delete({ where: { id } }),
  ]);

  return { message: 'Sarf malzeme başarıyla silindi.' };
};

export const exportConsumables = async ({ categoryId, q }, res) => {
  const where = {};

  if (categoryId) {
    where.categoryId = categoryId;
  }

  if (q && q.trim() !== '') {
    const searchTerm = q.trim();
    where.OR = [
      { name: { contains: searchTerm, mode: 'insensitive' } },
      { manufacturer: { contains: searchTerm, mode: 'insensitive' } },
      { supplier: { contains: searchTerm, mode: 'insensitive' } },
      { location: { contains: searchTerm, mode: 'insensitive' } },
    ];
  }

  const items = await prisma.consumable.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: {
      category: true,
    },
  });

  const columns = [
    { header: 'Ürün Adı', key: 'name', width: 22 },
    { header: 'Kategori', key: 'categoryName', width: 18 },
    { header: 'Toplam Miktar', key: 'totalQuantity', width: 15 },
    { header: 'Kullanılabilir', key: 'availableQuantity', width: 15 },
    { header: 'Tüketilen', key: 'consumedQuantity', width: 15 },
  ];

  const rows = items.map((item) => ({
    name: item.name || '-',
    categoryName: item.category ? item.category.name : '-',
    totalQuantity: item.totalQuantity || 0,
    availableQuantity: item.availableQuantity || 0,
    consumedQuantity: item.consumedQuantity || 0,
  }));

  const { createExcelStream } = await import('../../services/excelExport.service.js');
  const todayStr = new Date().toISOString().split('T')[0];
  await createExcelStream('Sarf Malzemeler', columns, rows, res, `sarf_malzeme_${todayStr}.xlsx`);
};

