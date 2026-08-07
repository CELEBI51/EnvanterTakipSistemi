import prisma from '../../config/db.js';

async function resolveCategoryId(categoryId, categoryName, parentType = 'VARLIK') {
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

function formatHardware(item) {
  if (!item) return null;
  const { category, ...rest } = item;
  return {
    ...rest,
    category: category ? category.name : null,
    categoryId: item.categoryId,
  };
}

export const createHardware = async (data, userId) => {
  const {
    category,
    categoryId,
    brand,
    model,
    serial_no,
    serialNo,
    demirbas_no,
    wifi_mac_address,
    wifiMacAddress,
    location,
    supplier,
    invoice_no,
    invoiceNo,
    purchase_date,
    purchaseDate,
    purchase_amount,
    purchaseAmount,
    warranty_start_date,
    warranty_end_date,
    warrantyStartDate,
    warrantyEndDate,
    specs,
  } = data;

  const finalDemirbasNo = demirbas_no ? demirbas_no.trim() : '';

  if (!finalDemirbasNo) {
    const error = new Error('Demirbaş numarası zorunludur.');
    error.statusCode = 400;
    throw error;
  }

  const existing = await prisma.hardware.findUnique({
    where: { demirbasNo: finalDemirbasNo },
  });

  if (existing) {
    const error = new Error(`Bu demirbaş numarası (${finalDemirbasNo}) zaten kayıtlı, lütfen farklı bir numara girin.`);
    error.statusCode = 409;
    throw error;
  }

  const resolvedCatId = await resolveCategoryId(categoryId, category, 'VARLIK');

  const startDateVal = warranty_start_date !== undefined ? warranty_start_date : warrantyStartDate;
  const endDateVal = warranty_end_date !== undefined ? warranty_end_date : warrantyEndDate;

  const serialNoVal = serial_no !== undefined ? serial_no : serialNo;
  const wifiMacVal = wifi_mac_address !== undefined ? wifi_mac_address : wifiMacAddress;
  const invoiceNoVal = invoice_no !== undefined ? invoice_no : invoiceNo;
  const purchaseDateVal = purchase_date !== undefined ? purchase_date : purchaseDate;
  const purchaseAmountVal = purchase_amount !== undefined ? purchase_amount : purchaseAmount;

  try {
    const newItem = await prisma.hardware.create({
      data: {
        categoryId: resolvedCatId,
        brand: brand.trim(),
        model: model && model.trim() !== '' ? model.trim() : null,
        serialNo: serialNoVal ? serialNoVal.trim() : '',
        demirbasNo: finalDemirbasNo,
        wifiMacAddress: wifiMacVal && wifiMacVal.trim() !== '' ? wifiMacVal.trim() : null,
        location: location && location.trim() !== '' ? location.trim() : null,
        supplier: supplier && supplier.trim() !== '' ? supplier.trim() : null,
        invoiceNo: invoiceNoVal && invoiceNoVal.trim() !== '' ? invoiceNoVal.trim() : null,
        purchaseDate: purchaseDateVal && String(purchaseDateVal).trim() !== '' ? new Date(purchaseDateVal) : null,
        purchaseAmount: purchaseAmountVal !== null && purchaseAmountVal !== undefined ? purchaseAmountVal : null,
        specs: specs || null,
        status: 'Hazir',
        warrantyStartDate: startDateVal && String(startDateVal).trim() !== '' ? new Date(startDateVal) : null,
        warrantyEndDate: endDateVal && String(endDateVal).trim() !== '' ? new Date(endDateVal) : null,
        createdById: userId,
      },
      include: {
        category: true,
        createdBy: {
          select: { id: true, fullName: true, email: true },
        },
      },
    });

    return formatHardware(newItem);
  } catch (err) {
    if (err.code === 'P2002') {
      const error = new Error(`Bu demirbaş numarası (${finalDemirbasNo}) zaten kayıtlı, lütfen farklı bir numara girin.`);
      error.statusCode = 409;
      throw error;
    }
    throw err;
  }
};

export const listHardware = async ({ page = 1, pageSize = 10, category, status, q }) => {
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const sizeNum = 10;
  const skip = (pageNum - 1) * sizeNum;

  const where = {};

  if (category) {
    where.category = {
      name: category,
    };
  }

  if (status) {
    where.status = status;
  }

  if (q && q.trim() !== '') {
    const searchTerm = q.trim();
    where.OR = [
      { brand: { contains: searchTerm, mode: 'insensitive' } },
      { model: { contains: searchTerm, mode: 'insensitive' } },
      { serialNo: { contains: searchTerm, mode: 'insensitive' } },
      { demirbasNo: { contains: searchTerm, mode: 'insensitive' } },
      { location: { contains: searchTerm, mode: 'insensitive' } },
      { supplier: { contains: searchTerm, mode: 'insensitive' } },
      { invoiceNo: { contains: searchTerm, mode: 'insensitive' } },
    ];
  }

  const [totalCount, items] = await Promise.all([
    prisma.hardware.count({ where }),
    prisma.hardware.findMany({
      where,
      skip,
      take: sizeNum,
      orderBy: { createdAt: 'desc' },
      include: {
        category: true,
        createdBy: {
          select: { id: true, fullName: true, email: true, role: true },
        },
      },
    }),
  ]);

  const totalPages = Math.ceil(totalCount / sizeNum) || 1;

  return {
    items: items.map(formatHardware),
    totalCount,
    totalPages,
    currentPage: pageNum,
  };
};

export const getHardwareById = async (id) => {
  const item = await prisma.hardware.findUnique({
    where: { id },
    include: {
      category: true,
      createdBy: {
        select: { id: true, fullName: true, email: true, role: true },
      },
    },
  });

  if (!item) {
    const error = new Error('Ürün bulunamadı.');
    error.statusCode = 404;
    throw error;
  }

  return formatHardware(item);
};

export const updateHardware = async (id, data) => {
  const existing = await prisma.hardware.findUnique({ where: { id } });
  if (!existing) {
    const error = new Error('Güncellenecek ürün bulunamadı.');
    error.statusCode = 404;
    throw error;
  }

  const updateData = {};

  if (data.categoryId || data.category) {
    updateData.categoryId = await resolveCategoryId(data.categoryId, data.category, 'VARLIK');
  }

  if (data.brand !== undefined) updateData.brand = data.brand.trim();
  if (data.model !== undefined) updateData.model = data.model && data.model.trim() !== '' ? data.model.trim() : null;

  const serialNoVal = data.serial_no !== undefined ? data.serial_no : data.serialNo;
  if (serialNoVal !== undefined) updateData.serialNo = serialNoVal ? serialNoVal.trim() : '';

  const wifiMacVal = data.wifi_mac_address !== undefined ? data.wifi_mac_address : data.wifiMacAddress;
  if (wifiMacVal !== undefined) updateData.wifiMacAddress = wifiMacVal && wifiMacVal.trim() !== '' ? wifiMacVal.trim() : null;

  if (data.location !== undefined) updateData.location = data.location && data.location.trim() !== '' ? data.location.trim() : null;
  if (data.supplier !== undefined) updateData.supplier = data.supplier && data.supplier.trim() !== '' ? data.supplier.trim() : null;

  const invoiceNoVal = data.invoice_no !== undefined ? data.invoice_no : data.invoiceNo;
  if (invoiceNoVal !== undefined) updateData.invoiceNo = invoiceNoVal && invoiceNoVal.trim() !== '' ? invoiceNoVal.trim() : null;

  const purchaseDateVal = data.purchase_date !== undefined ? data.purchase_date : data.purchaseDate;
  if (purchaseDateVal !== undefined) {
    updateData.purchaseDate = purchaseDateVal && String(purchaseDateVal).trim() !== '' ? new Date(purchaseDateVal) : null;
  }

  const purchaseAmountVal = data.purchase_amount !== undefined ? data.purchase_amount : data.purchaseAmount;
  if (purchaseAmountVal !== undefined) {
    updateData.purchaseAmount = purchaseAmountVal !== null ? purchaseAmountVal : null;
  }

  if (data.status !== undefined) updateData.status = data.status;
  if (data.specs !== undefined) updateData.specs = data.specs;

  const startDateVal = data.warranty_start_date !== undefined ? data.warranty_start_date : data.warrantyStartDate;
  const endDateVal = data.warranty_end_date !== undefined ? data.warranty_end_date : data.warrantyEndDate;

  if (startDateVal !== undefined) {
    updateData.warrantyStartDate = startDateVal && String(startDateVal).trim() !== '' ? new Date(startDateVal) : null;
  }
  if (endDateVal !== undefined) {
    updateData.warrantyEndDate = endDateVal && String(endDateVal).trim() !== '' ? new Date(endDateVal) : null;
  }

  const updatedItem = await prisma.hardware.update({
    where: { id },
    data: updateData,
    include: {
      category: true,
      createdBy: {
        select: { id: true, fullName: true, email: true, role: true },
      },
    },
  });

  return formatHardware(updatedItem);
};

export const deleteHardware = async (id) => {
  const existing = await prisma.hardware.findUnique({ where: { id } });
  if (!existing) {
    const error = new Error('Silinecek ürün bulunamadı.');
    error.statusCode = 404;
    throw error;
  }

  await prisma.hardware.delete({ where: { id } });
  return { message: 'Ürün başarıyla silindi.' };
};

/**
 * Get Hardware Statistics Summary (total, inUse, ready, needsAttention).
 */
export const getHardwareStats = async () => {
  const [total, inUse, ready, needsAttention] = await Promise.all([
    prisma.hardware.count(),
    prisma.hardware.count({ where: { status: 'Kullanimda' } }),
    prisma.hardware.count({ where: { status: 'Hazir' } }),
    prisma.hardware.count({ where: { status: { in: ['Arizali', 'Serviste', 'KullanimDisi'] } } }),
  ]);

  return {
    total,
    inUse,
    ready,
    needsAttention,
  };
};

/**
 * Get assignment history for a specific hardware item.
 * Returns ONE record per assignment — if returned, return info is merged into the same record.
 */
export const getHardwareHistory = async (hardwareId) => {
  // 1. Get all AssignmentItems for this hardware, with return info
  const assignmentItems = await prisma.assignmentItem.findMany({
    where: { hardwareId },
    include: {
      assignment: {
        include: {
          employee: {
            select: {
              id: true,
              fullName: true,
              unit: { select: { name: true } },
            },
          },
          createdBy: {
            select: { id: true, fullName: true },
          },
          returns: {
            include: {
              items: {
                where: { hardwareId },
                select: { resultStatus: true },
              },
            },
            orderBy: { tarih: 'desc' },
            take: 1,
          },
        },
      },
    },
    orderBy: { assignment: { teslimTarihi: 'desc' } },
  });

  // 2. Build one card per assignment
  const history = assignmentItems.map((ai) => {
    const a = ai.assignment;
    const returnRecord = a.returns?.[0] || null;
    const returnItemForHw = returnRecord?.items?.[0] || null;

    return {
      id: ai.id,
      assignmentId: a.id,
      employeeName: a.employee?.fullName || '-',
      employeeUnit: a.employee?.unit?.name || null,
      teslimEden: a.teslimEden,
      teslimTarihi: a.teslimTarihi,
      createdBy: a.createdBy?.fullName || null,
      // Return info (merged into same record)
      returned: ai.returned,
      returnDate: ai.returnDate || (returnRecord?.tarih ?? null),
      teslimAlanIc: returnRecord?.teslimAlanIc || null,
      resultStatus: returnItemForHw?.resultStatus || null,
      returnNotes: returnRecord?.notes || null,
    };
  });

  return history;
};

