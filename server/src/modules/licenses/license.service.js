import prisma from '../../config/db.js';

/**
 * Calculates remaining days until license expiration.
 */
export const calculateDaysRemaining = (endDateStr) => {
  if (!endDateStr) return 0;
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const end = new Date(endDateStr);
  const target = new Date(end.getFullYear(), end.getMonth(), end.getDate());
  const diffTime = target.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

/**
 * Formats license response with calculated daysRemaining.
 */
function formatLicense(item) {
  if (!item) return null;
  return {
    ...item,
    daysRemaining: calculateDaysRemaining(item.endDate),
  };
}

/**
 * HARD DELETE RULE:
 * License records CANNOT be hard deleted from database to preserve audit log & historical integrity.
 * Hard delete is strictly prohibited. Use updateLicenseStatus to set status to 'IPTAL_EDILDI'.
 */

/**
 * Create a new License record. Automatic status: 'AKTIF'.
 */
export const createLicense = async (data, userId) => {
  const {
    unitId,
    brand,
    productInfo,
    licenseKey,
    startDate,
    endDate,
    paymentType,
    invoiceNumber,
    invoiceAmount,
    notes,
  } = data;

  // Verify Unit exists
  const unit = await prisma.unit.findUnique({ where: { id: unitId } });
  if (!unit) {
    const err = new Error('Seçilen birim bulunamadı.');
    err.statusCode = 404;
    throw err;
  }

  const newLicense = await prisma.license.create({
    data: {
      unitId,
      brand: brand.trim(),
      productInfo: productInfo.trim(),
      licenseKey: licenseKey && String(licenseKey).trim() !== '' ? String(licenseKey).trim() : null,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      paymentType,
      status: 'AKTIF', // Automatically assigned
      invoiceNumber: invoiceNumber && String(invoiceNumber).trim() !== '' ? String(invoiceNumber).trim() : null,
      invoiceAmount: invoiceAmount !== null && invoiceAmount !== undefined ? invoiceAmount : null,
      notes: notes && String(notes).trim() !== '' ? String(notes).trim() : null,
      createdById: userId,
    },
    include: {
      unit: {
        select: { id: true, name: true },
      },
      createdBy: {
        select: { id: true, fullName: true, email: true },
      },
    },
  });

  return formatLicense(newLicense);
};

/**
 * List Licenses with filters (unitId, status, paymentType, endDate range, search query q) and pagination.
 */
export const listLicenses = async ({
  page = 1,
  pageSize = 10,
  unitId,
  status,
  paymentType,
  endDateFrom,
  endDateTo,
  q,
}) => {
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const sizeNum = Math.max(1, parseInt(pageSize, 10) || 10);
  const skip = (pageNum - 1) * sizeNum;

  const where = {};

  if (unitId) {
    where.unitId = unitId;
  }

  if (status) {
    where.status = status;
  }

  if (paymentType) {
    where.paymentType = paymentType;
  }

  if (endDateFrom || endDateTo) {
    where.endDate = {};
    if (endDateFrom) where.endDate.gte = new Date(endDateFrom);
    if (endDateTo) where.endDate.lte = new Date(endDateTo);
  }

  if (q && q.trim() !== '') {
    const searchTerm = q.trim();
    where.OR = [
      { brand: { contains: searchTerm, mode: 'insensitive' } },
      { productInfo: { contains: searchTerm, mode: 'insensitive' } },
      { licenseKey: { contains: searchTerm, mode: 'insensitive' } },
      { invoiceNumber: { contains: searchTerm, mode: 'insensitive' } },
    ];
  }

  const [totalCount, items] = await Promise.all([
    prisma.license.count({ where }),
    prisma.license.findMany({
      where,
      skip,
      take: sizeNum,
      orderBy: { endDate: 'asc' },
      include: {
        unit: {
          select: { id: true, name: true },
        },
        createdBy: {
          select: { id: true, fullName: true, email: true },
        },
      },
    }),
  ]);

  const totalPages = Math.ceil(totalCount / sizeNum) || 1;

  return {
    data: items.map(formatLicense),
    pagination: {
      totalCount,
      totalPages,
      page: pageNum,
      pageSize: sizeNum,
    },
  };
};

/**
 * Get License Detail by ID (includes unit, createdBy, and attachments).
 */
export const getLicenseById = async (id) => {
  const item = await prisma.license.findUnique({
    where: { id },
    include: {
      unit: {
        select: { id: true, name: true, phone: true, contactPerson: true },
      },
      createdBy: {
        select: { id: true, fullName: true, email: true },
      },
    },
  });

  if (!item) {
    const error = new Error('Lisans kaydı bulunamadı.');
    error.statusCode = 404;
    throw error;
  }

  // Fetch polymorphic attachments for entityType: "license"
  const attachments = await prisma.attachment.findMany({
    where: {
      entityType: 'license',
      entityId: id,
    },
    orderBy: { createdAt: 'desc' },
  });

  return {
    ...formatLicense(item),
    attachments,
  };
};

/**
 * Update License record fields.
 */
export const updateLicense = async (id, data) => {
  const existing = await prisma.license.findUnique({ where: { id } });
  if (!existing) {
    const error = new Error('Güncellenecek lisans kaydı bulunamadı.');
    error.statusCode = 404;
    throw error;
  }

  const updateData = {};

  if (data.unitId) {
    const unit = await prisma.unit.findUnique({ where: { id: data.unitId } });
    if (!unit) {
      const err = new Error('Seçilen birim bulunamadı.');
      err.statusCode = 404;
      throw err;
    }
    updateData.unitId = data.unitId;
  }

  if (data.brand !== undefined) updateData.brand = data.brand.trim();
  if (data.productInfo !== undefined) updateData.productInfo = data.productInfo.trim();
  if (data.licenseKey !== undefined)
    updateData.licenseKey = data.licenseKey && String(data.licenseKey).trim() !== '' ? String(data.licenseKey).trim() : null;
  if (data.startDate !== undefined) updateData.startDate = new Date(data.startDate);
  if (data.endDate !== undefined) updateData.endDate = new Date(data.endDate);
  if (data.paymentType !== undefined) updateData.paymentType = data.paymentType;
  if (data.invoiceNumber !== undefined)
    updateData.invoiceNumber = data.invoiceNumber && String(data.invoiceNumber).trim() !== '' ? String(data.invoiceNumber).trim() : null;
  if (data.invoiceAmount !== undefined)
    updateData.invoiceAmount = data.invoiceAmount !== null ? data.invoiceAmount : null;
  if (data.notes !== undefined)
    updateData.notes = data.notes && String(data.notes).trim() !== '' ? String(data.notes).trim() : null;

  const updatedItem = await prisma.license.update({
    where: { id },
    data: updateData,
    include: {
      unit: {
        select: { id: true, name: true },
      },
      createdBy: {
        select: { id: true, fullName: true, email: true },
      },
    },
  });

  return formatLicense(updatedItem);
};

/**
 * Update License Status only (YENILENDI | IPTAL_EDILDI).
 * If YENILENDI, updates endDate to newEndDate.
 */
export const updateLicenseStatus = async (id, { status, newEndDate }) => {
  const existing = await prisma.license.findUnique({ where: { id } });
  if (!existing) {
    const error = new Error('Durumu güncellenecek lisans kaydı bulunamadı.');
    error.statusCode = 404;
    throw error;
  }

  const updateData = { status };

  if (status === 'YENILENDI') {
    if (!newEndDate) {
      const error = new Error("'YENILENDI' olarak işaretlemek için yeni bitiş tarihi (newEndDate) zorunludur.");
      error.statusCode = 400;
      throw error;
    }
    const newEnd = new Date(newEndDate);
    if (isNaN(newEnd.getTime())) {
      const error = new Error('Geçerli bir yeni bitiş tarihi girilmelidir.');
      error.statusCode = 400;
      throw error;
    }
    updateData.endDate = newEnd;
  }

  const updatedItem = await prisma.license.update({
    where: { id },
    data: updateData,
    include: {
      unit: {
        select: { id: true, name: true },
      },
      createdBy: {
        select: { id: true, fullName: true, email: true },
      },
    },
  });

  return formatLicense(updatedItem);
};

/**
 * Get License Statistics Summary (total, expiringSoon, cancelled).
 */
export const getLicenseStats = async () => {
  const now = new Date();
  const target15Days = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 15, 23, 59, 59, 999);

  const [total, expiringSoon, cancelled, expired] = await Promise.all([
    prisma.license.count(),
    prisma.license.count({
      where: {
        status: { not: 'IPTAL_EDILDI' },
        endDate: { lte: target15Days },
      },
    }),
    prisma.license.count({
      where: { status: 'IPTAL_EDILDI' },
    }),
    prisma.license.count({
      where: { status: 'SURESI_DOLDU' },
    }),
  ]);

  return {
    total,
    expiringSoon,
    cancelled,
    expired,
  };
};

export const exportLicenses = async ({ unitId, status, paymentType, endDateFrom, endDateTo, q }, res) => {
  const where = {};

  if (unitId) {
    where.unitId = unitId;
  }

  if (status) {
    where.status = status;
  }

  if (paymentType) {
    where.paymentType = paymentType;
  }

  if (endDateFrom || endDateTo) {
    where.endDate = {};
    if (endDateFrom) where.endDate.gte = new Date(endDateFrom);
    if (endDateTo) where.endDate.lte = new Date(endDateTo);
  }

  if (q && q.trim() !== '') {
    const searchTerm = q.trim();
    where.OR = [
      { brand: { contains: searchTerm, mode: 'insensitive' } },
      { productInfo: { contains: searchTerm, mode: 'insensitive' } },
      { licenseKey: { contains: searchTerm, mode: 'insensitive' } },
      { invoiceNumber: { contains: searchTerm, mode: 'insensitive' } },
    ];
  }

  const items = await prisma.license.findMany({
    where,
    orderBy: { endDate: 'asc' },
    include: {
      unit: {
        select: { id: true, name: true },
      },
    },
  });

  const columns = [
    { header: 'Marka', key: 'brand', width: 18 },
    { header: 'Ürün Bilgisi', key: 'productInfo', width: 22 },
    { header: 'Birim', key: 'unitName', width: 18 },
    { header: 'Lisans Anahtarı', key: 'licenseKey', width: 22 },
    { header: 'Başlangıç Tarihi', key: 'startDate', width: 16 },
    { header: 'Bitiş Tarihi', key: 'endDate', width: 16 },
    { header: 'Durum', key: 'statusText', width: 15 },
    { header: 'Ödeme Tipi', key: 'paymentTypeText', width: 15 },
    { header: 'Fatura No', key: 'invoiceNumber', width: 16 },
    { header: 'Fatura Tutarı', key: 'invoiceAmount', width: 16 },
  ];

  const STATUS_TEXT_MAP = {
    AKTIF: 'Aktif',
    YENILENDI: 'Yenilendi',
    YENILENMEDI: 'Yenilenmedi',
    YENILENMEYECEK: 'Yenilenmeyecek',
    IPTAL_EDILDI: 'İptal Edildi',
    SURESI_DOLDU: 'Süresi Doldu',
  };

  const PAYMENT_TYPE_MAP = {
    KREDI_KARTI: 'Kredi Kartı',
    NAKIT: 'Nakit',
    VADELI: 'Vadeli',
  };

  const rows = items.map((item) => ({
    brand: item.brand || '-',
    productInfo: item.productInfo || '-',
    unitName: item.unit ? item.unit.name : '-',
    licenseKey: item.licenseKey || '-',
    startDate: item.startDate ? new Date(item.startDate).toLocaleDateString('tr-TR') : '-',
    endDate: item.endDate ? new Date(item.endDate).toLocaleDateString('tr-TR') : '-',
    statusText: STATUS_TEXT_MAP[item.status] || item.status,
    paymentTypeText: PAYMENT_TYPE_MAP[item.paymentType] || item.paymentType,
    invoiceNumber: item.invoiceNumber || '-',
    invoiceAmount: item.invoiceAmount !== null && item.invoiceAmount !== undefined ? `${item.invoiceAmount} ₺` : '-',
  }));

  const { createExcelStream } = await import('../../services/excelExport.service.js');
  const todayStr = new Date().toISOString().split('T')[0];
  await createExcelStream('Lisanslar', columns, rows, res, `lisans_${todayStr}.xlsx`);
};

/**
 * Get Expiring Licenses list (for Dashboard and alerts).
 */
export const getExpiringLicenses = async (days = 15) => {
  const daysNum = parseInt(days, 10) || 15;
  const now = new Date();
  const threshold = new Date(now.getFullYear(), now.getMonth(), now.getDate() + daysNum, 23, 59, 59, 999);

  const items = await prisma.license.findMany({
    where: {
      status: { not: 'IPTAL_EDILDI' },
      endDate: { lte: threshold },
    },
    orderBy: { endDate: 'asc' },
    include: {
      unit: {
        select: { id: true, name: true },
      },
      createdBy: {
        select: { id: true, fullName: true, email: true },
      },
    },
  });

  return items.map(formatLicense);
};
