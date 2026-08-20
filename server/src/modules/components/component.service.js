import prisma from '../../config/db.js';

function formatComponent(item) {
  if (!item) return null;
  const { category, ...rest } = item;
  return {
    ...rest,
    category: category ? category.name : null,
    categoryId: item.categoryId,
  };
}

export const createComponent = async (data, userId) => {
  const {
    name,
    categoryId,
    initialQuantity,
    brand,
    model,
    location,
    supplier,
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

  const component = await prisma.$transaction(async (tx) => {
    const item = await tx.component.create({
      data: {
        name: name.trim(),
        categoryId,
        brand: brand && brand.trim() !== '' ? brand.trim() : null,
        model: model && model.trim() !== '' ? model.trim() : null,
        location: location && location.trim() !== '' ? location.trim() : null,
        supplier: supplier && supplier.trim() !== '' ? supplier.trim() : null,
        totalQuantity: initialQuantity,
        availableQuantity: initialQuantity,
        usedQuantity: 0,
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
        entityType: 'component',
        entityId: item.id,
        type: 'restock',
        quantity: initialQuantity,
        note: 'İlk stok girişi',
        createdById: userId,
      },
    });

    return item;
  });

  return formatComponent(component);
};

export const listComponents = async ({ page = 1, pageSize = 10, categoryId, q }) => {
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
      { brand: { contains: searchTerm, mode: 'insensitive' } },
      { model: { contains: searchTerm, mode: 'insensitive' } },
      { supplier: { contains: searchTerm, mode: 'insensitive' } },
      { location: { contains: searchTerm, mode: 'insensitive' } },
    ];
  }

  const [totalCount, items] = await Promise.all([
    prisma.component.count({ where }),
    prisma.component.findMany({
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
    items: items.map(formatComponent),
    totalCount,
    totalPages,
    currentPage: pageNum,
  };
};

export const getComponentById = async (id) => {
  const item = await prisma.component.findUnique({
    where: { id },
    include: {
      category: true,
      createdBy: {
        select: { id: true, fullName: true, email: true },
      },
    },
  });

  if (!item) {
    const error = new Error('Bileşen bulunamadı.');
    error.statusCode = 404;
    throw error;
  }

  return formatComponent(item);
};

export const restockComponent = async (id, { quantity, note }, userId) => {
  const existing = await prisma.component.findUnique({ where: { id } });
  if (!existing) {
    const error = new Error('Bileşen bulunamadı.');
    error.statusCode = 404;
    throw error;
  }

  const updatedComponent = await prisma.$transaction(async (tx) => {
    const item = await tx.component.update({
      where: { id },
      data: {
        totalQuantity: { increment: quantity },
        availableQuantity: { increment: quantity },
      },
      include: { category: true },
    });

    await tx.stockMovement.create({
      data: {
        entityType: 'component',
        entityId: id,
        type: 'restock',
        quantity,
        note: note ? note.trim() : null,
        createdById: userId,
      },
    });

    return item;
  });

  return formatComponent(updatedComponent);
};

export const getComponentHistory = async (id) => {
  const existing = await prisma.component.findUnique({ where: { id } });
  if (!existing) {
    const error = new Error('Bileşen bulunamadı.');
    error.statusCode = 404;
    throw error;
  }

  const movements = await prisma.stockMovement.findMany({
    where: { entityType: 'component', entityId: id },
    orderBy: { createdAt: 'desc' },
    include: {
      createdBy: {
        select: { id: true, fullName: true, email: true },
      },
    },
  });

  return movements;
};

export const deleteComponent = async (id) => {
  const existing = await prisma.component.findUnique({ where: { id } });
  if (!existing) {
    const error = new Error('Silinecek bileşen bulunamadı.');
    error.statusCode = 404;
    throw error;
  }

  if (existing.usedQuantity > 0) {
    const error = new Error('Kullanımda veya montajlanmış stoğu bulunan bileşen silinemez.');
    error.statusCode = 400;
    throw error;
  }

  const maintCount = await prisma.maintenanceComponent.count({
    where: { componentId: id },
  });

  if (maintCount > 0) {
    const error = new Error(
      'Bu bileşene ait geçmiş bakım / parça değişim kayıtları bulunduğu için silinemez.'
    );
    error.statusCode = 400;
    throw error;
  }

  await prisma.$transaction([
    prisma.stockMovement.deleteMany({
      where: { entityType: 'component', entityId: id },
    }),
    prisma.component.delete({ where: { id } }),
  ]);

  return { message: 'Bileşen başarıyla silindi.' };
};

export const updateComponent = async (id, data) => {
  const existing = await prisma.component.findUnique({ where: { id } });
  if (!existing) {
    const error = new Error('Güncellenecek bileşen bulunamadı.');
    error.statusCode = 404;
    throw error;
  }

  const updateData = {};
  if (data.categoryId || data.category) {
    updateData.categoryId = await resolveCategoryId(data.categoryId, data.category, 'BILESEN');
  }

  if (data.name !== undefined) updateData.name = data.name.trim();
  if (data.brand !== undefined) updateData.brand = data.brand ? data.brand.trim() : null;
  if (data.model !== undefined) updateData.model = data.model ? data.model.trim() : null;
  if (data.serialNo !== undefined) updateData.serialNo = data.serialNo ? data.serialNo.trim() : null;
  if (data.supplier !== undefined) updateData.supplier = data.supplier ? data.supplier.trim() : null;
  if (data.minThreshold !== undefined) updateData.minThreshold = parseInt(data.minThreshold, 10) || 0;
  if (data.specs !== undefined) updateData.specs = data.specs ? data.specs : null;
  if (data.notes !== undefined) updateData.notes = data.notes ? data.notes.trim() : null;

  if (data.totalQuantity !== undefined) {
    const newTotal = Math.max(0, parseInt(data.totalQuantity, 10) || 0);
    const diff = newTotal - existing.totalQuantity;
    updateData.totalQuantity = newTotal;
    updateData.availableQuantity = Math.max(0, existing.availableQuantity + diff);
  }

  const updated = await prisma.component.update({
    where: { id },
    data: updateData,
    include: { category: true },
  });

  return formatComponent(updated);
};

export const exportComponents = async ({ categoryId, q }, res) => {
  const where = {};

  if (categoryId) {
    where.categoryId = categoryId;
  }

  if (q && q.trim() !== '') {
    const searchTerm = q.trim();
    where.OR = [
      { name: { contains: searchTerm, mode: 'insensitive' } },
      { brand: { contains: searchTerm, mode: 'insensitive' } },
      { model: { contains: searchTerm, mode: 'insensitive' } },
      { location: { contains: searchTerm, mode: 'insensitive' } },
      { supplier: { contains: searchTerm, mode: 'insensitive' } },
    ];
  }

  const items = await prisma.component.findMany({
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
    { header: 'Kullanılan', key: 'usedQuantity', width: 15 },
  ];

  const rows = items.map((item) => ({
    name: item.name || '-',
    categoryName: item.category ? item.category.name : '-',
    totalQuantity: item.totalQuantity || 0,
    availableQuantity: item.availableQuantity || 0,
    usedQuantity: item.usedQuantity || 0,
  }));

  const { createExcelStream } = await import('../../services/excelExport.service.js');
  const todayStr = new Date().toISOString().split('T')[0];
  await createExcelStream('Bileşenler', columns, rows, res, `bilesen_${todayStr}.xlsx`);
};


/**
 * Get Component Statistics Summary (totalProducts, outOfStock, totalUsedQuantity).
 */
export const getComponentStats = async () => {
  const [totalProducts, outOfStock, sumResult] = await Promise.all([
    prisma.component.count(),
    prisma.component.count({ where: { availableQuantity: 0 } }),
    prisma.component.aggregate({ _sum: { usedQuantity: true } }),
  ]);

  return {
    totalProducts,
    outOfStock,
    totalUsedQuantity: sumResult._sum.usedQuantity || 0,
  };
};
