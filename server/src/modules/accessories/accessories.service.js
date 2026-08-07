import prisma from '../../config/db.js';

async function resolveCategoryId(categoryId, categoryName, parentType = 'AKSESUAR') {
  if (categoryId) return categoryId;
  const name = (categoryName || 'Diğer').trim();

  let cat = await prisma.category.findUnique({
    where: {
      parentType_name: {
        parentType,
        name,
      },
    },
  });

  if (!cat) {
    cat = await prisma.category.create({
      data: {
        parentType,
        name,
      },
    });
  }

  return cat.id;
}

function formatAccessory(item) {
  if (!item) return null;
  const { category, ...rest } = item;
  return {
    ...rest,
    category: category ? category.name : null,
    categoryId: item.categoryId,
  };
}

export const createAccessory = async (data, userId) => {
  const {
    name,
    category,
    categoryId,
    brand,
    supplier,
    invoice_no,
    invoiceNo,
    purchase_date,
    purchaseDate,
    purchase_amount,
    purchaseAmount,
    initialQuantity,
    minThreshold,
    notes,
  } = data;

  const resolvedCatId = await resolveCategoryId(categoryId, category, 'AKSESUAR');

  const invoiceNoVal = invoice_no !== undefined ? invoice_no : invoiceNo;
  const purchaseDateVal = purchase_date !== undefined ? purchase_date : purchaseDate;
  const purchaseAmountVal = purchase_amount !== undefined ? purchase_amount : purchaseAmount;

  const accessory = await prisma.$transaction(async (tx) => {
    const acc = await tx.accessory.create({
      data: {
        name: name.trim(),
        categoryId: resolvedCatId,
        brand: brand && brand.trim() !== '' ? brand.trim() : null,
        supplier: supplier && supplier.trim() !== '' ? supplier.trim() : null,
        invoiceNo: invoiceNoVal && invoiceNoVal.trim() !== '' ? invoiceNoVal.trim() : null,
        purchaseDate: purchaseDateVal && String(purchaseDateVal).trim() !== '' ? new Date(purchaseDateVal) : null,
        purchaseAmount: purchaseAmountVal !== null && purchaseAmountVal !== undefined ? purchaseAmountVal : null,
        totalQuantity: initialQuantity,
        availableQuantity: initialQuantity,
        assignedQuantity: 0,
        outOfUseQuantity: 0,
        minThreshold: minThreshold !== undefined && minThreshold !== null ? minThreshold : null,
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
        entityType: 'accessory',
        entityId: acc.id,
        type: 'restock',
        quantity: initialQuantity,
        note: 'Başlangıç stoğu eklendi',
        createdById: userId,
      },
    });

    return acc;
  });

  return formatAccessory(accessory);
};

export const listAccessories = async ({ page = 1, category, q }) => {
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const sizeNum = 10;
  const skip = (pageNum - 1) * sizeNum;

  const where = {};

  if (category) {
    where.category = {
      name: category,
    };
  }

  if (q && q.trim() !== '') {
    const searchTerm = q.trim();
    where.OR = [
      { name: { contains: searchTerm, mode: 'insensitive' } },
      { brand: { contains: searchTerm, mode: 'insensitive' } },
      { supplier: { contains: searchTerm, mode: 'insensitive' } },
      { invoiceNo: { contains: searchTerm, mode: 'insensitive' } },
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
        category: true,
        createdBy: {
          select: { id: true, fullName: true, email: true },
        },
      },
    }),
  ]);

  const totalPages = Math.ceil(totalCount / sizeNum) || 1;

  return {
    items: items.map(formatAccessory),
    totalCount,
    totalPages,
    currentPage: pageNum,
  };
};

export const getAccessoryById = async (id) => {
  const item = await prisma.accessory.findUnique({
    where: { id },
    include: {
      category: true,
      createdBy: {
        select: { id: true, fullName: true, email: true },
      },
    },
  });

  if (!item) {
    const error = new Error('Aksesuar bulunamadı.');
    error.statusCode = 404;
    throw error;
  }

  return formatAccessory(item);
};

export const restockAccessory = async (id, { quantity, note }, userId) => {
  const existing = await prisma.accessory.findUnique({ where: { id } });
  if (!existing) {
    const error = new Error('Aksesuar bulunamadı.');
    error.statusCode = 404;
    throw error;
  }

  const updatedAccessory = await prisma.$transaction(async (tx) => {
    const acc = await tx.accessory.update({
      where: { id },
      data: {
        totalQuantity: { increment: quantity },
        availableQuantity: { increment: quantity },
      },
      include: { category: true },
    });

    await tx.stockMovement.create({
      data: {
        entityType: 'accessory',
        entityId: id,
        type: 'restock',
        quantity,
        note: note ? note.trim() : null,
        createdById: userId,
      },
    });

    return acc;
  });

  return formatAccessory(updatedAccessory);
};

export const markDefective = async (id, { quantity, note }, userId) => {
  const existing = await prisma.accessory.findUnique({ where: { id } });
  if (!existing) {
    const error = new Error('Aksesuar bulunamadı.');
    error.statusCode = 404;
    throw error;
  }

  if (existing.availableQuantity < quantity) {
    const error = new Error(
      `Yeterli hazır stok bulunmuyor. Mevcut hazır stok: ${existing.availableQuantity}`
    );
    error.statusCode = 400;
    throw error;
  }

  const updatedAccessory = await prisma.$transaction(async (tx) => {
    const acc = await tx.accessory.update({
      where: { id },
      data: {
        availableQuantity: { decrement: quantity },
        outOfUseQuantity: { increment: quantity },
      },
      include: { category: true },
    });

    await tx.stockMovement.create({
      data: {
        entityType: 'accessory',
        entityId: id,
        type: 'mark_defective',
        quantity,
        note: note ? note.trim() : null,
        createdById: userId,
      },
    });

    return acc;
  });

  return formatAccessory(updatedAccessory);
};

export const getAccessoryHistory = async (id) => {
  const existing = await prisma.accessory.findUnique({ where: { id } });
  if (!existing) {
    const error = new Error('Aksesuar bulunamadı.');
    error.statusCode = 404;
    throw error;
  }

  const movements = await prisma.stockMovement.findMany({
    where: { entityType: 'accessory', entityId: id },
    orderBy: { createdAt: 'desc' },
    include: {
      createdBy: {
        select: { id: true, fullName: true, email: true },
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
    const error = new Error(
      'Zimmetli veya kullanım dışı olarak ayrılmış stok adeti bulunan aksesuar silinemez.'
    );
    error.statusCode = 400;
    throw error;
  }

  await prisma.accessory.delete({ where: { id } });
  return { message: 'Aksesuar başarıyla silindi.' };
};

/**
 * Get Accessory Statistics Summary (totalProducts, outOfStock, totalAssignedQuantity).
 */
export const getAccessoryStats = async () => {
  const [totalProducts, outOfStock, sumResult] = await Promise.all([
    prisma.accessory.count(),
    prisma.accessory.count({ where: { availableQuantity: 0 } }),
    prisma.accessory.aggregate({ _sum: { assignedQuantity: true } }),
  ]);

  return {
    totalProducts,
    outOfStock,
    totalAssignedQuantity: sumResult._sum.assignedQuantity || 0,
  };
};
