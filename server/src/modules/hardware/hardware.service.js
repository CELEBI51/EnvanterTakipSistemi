import prisma from '../../config/db.js';

export const createHardware = async (data, userId) => {
  const {
    category,
    brand,
    model,
    serial_no,
    demirbas_no,
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

  // 1. Veritabanına gitmeden önce demirbaş no mükerrerlik ön-kontrolü
  const existing = await prisma.hardware.findUnique({
    where: { demirbasNo: finalDemirbasNo },
  });

  if (existing) {
    const error = new Error(`Bu demirbaş numarası (${finalDemirbasNo}) zaten kayıtlı, lütfen farklı bir numara girin.`);
    error.statusCode = 409;
    throw error;
  }

  const startDateVal = warranty_start_date !== undefined ? warranty_start_date : warrantyStartDate;
  const endDateVal = warranty_end_date !== undefined ? warranty_end_date : warrantyEndDate;

  try {
    const newItem = await prisma.hardware.create({
      data: {
        category,
        brand: brand.trim(),
        model: model && model.trim() !== '' ? model.trim() : null,
        serialNo: serial_no ? serial_no.trim() : '',
        demirbasNo: finalDemirbasNo,
        specs: specs || null,
        status: 'Hazir',
        warrantyStartDate: startDateVal && startDateVal.trim() !== '' ? new Date(startDateVal) : null,
        warrantyEndDate: endDateVal && endDateVal.trim() !== '' ? new Date(endDateVal) : null,
        createdById: userId,
      },
    });

    return newItem;
  } catch (err) {
    // 2. Çift güvence: Veritabanı seviyesindeki unique constraint yakalama (P2002)
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
  const sizeNum = 10; // Sabit 10 kayıt/sayfa
  const skip = (pageNum - 1) * sizeNum;

  const where = {};

  if (category) {
    where.category = category;
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

export const getHardwareById = async (id) => {
  const item = await prisma.hardware.findUnique({
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
    const error = new Error('Ürün bulunamadı.');
    error.statusCode = 404;
    throw error;
  }

  return item;
};

export const updateHardware = async (id, data) => {
  const existing = await prisma.hardware.findUnique({ where: { id } });
  if (!existing) {
    const error = new Error('Güncellenecek ürün bulunamadı.');
    error.statusCode = 404;
    throw error;
  }

  const startDateVal = data.warranty_start_date !== undefined ? data.warranty_start_date : data.warrantyStartDate;
  const endDateVal = data.warranty_end_date !== undefined ? data.warranty_end_date : data.warrantyEndDate;

  const updateData = {};

  if (data.category !== undefined) updateData.category = data.category;
  if (data.brand !== undefined) updateData.brand = data.brand.trim();
  if (data.model !== undefined) updateData.model = data.model && data.model.trim() !== '' ? data.model.trim() : null;
  if (data.serial_no !== undefined) updateData.serialNo = data.serial_no ? data.serial_no.trim() : '';
  if (data.status !== undefined) updateData.status = data.status;
  if (data.specs !== undefined) updateData.specs = data.specs;

  if (startDateVal !== undefined) {
    updateData.warrantyStartDate = startDateVal && startDateVal.trim() !== '' ? new Date(startDateVal) : null;
  }
  if (endDateVal !== undefined) {
    updateData.warrantyEndDate = endDateVal && endDateVal.trim() !== '' ? new Date(endDateVal) : null;
  }

  const updated = await prisma.hardware.update({
    where: { id },
    data: updateData,
  });

  return updated;
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

export const getHardwareHistory = async (id) => {
  const item = await prisma.hardware.findUnique({
    where: { id },
    include: {
      assignmentItems: {
        include: {
          assignment: {
            include: {
              employee: true,
            },
          },
        },
      },
      returnItems: {
        include: {
          return: true,
        },
      },
    },
  });

  if (!item) {
    const error = new Error('Ürün bulunamadı.');
    error.statusCode = 404;
    throw error;
  }

  // Combine assignments and returns into a history timeline
  const history = [];

  if (item.assignmentItems) {
    item.assignmentItems.forEach((ai) => {
      history.push({
        type: 'assignment',
        id: ai.id,
        date: ai.assignment.teslimTarihi,
        employeeName: ai.assignment.employee.fullName,
        department: ai.assignment.employee.department,
        status: ai.returned ? 'İade Edildi' : 'Aktif Zimmet',
        pdfUrl: ai.assignment.pdfUrl,
      });
    });
  }

  if (item.returnItems) {
    item.returnItems.forEach((ri) => {
      history.push({
        type: 'return',
        id: ri.id,
        date: ri.return.tarih,
        notes: ri.return.notes,
        resultStatus: ri.resultStatus,
      });
    });
  }

  // Sort history descending by date
  history.sort((a, b) => new Date(b.date) - new Date(a.date));

  return history;
};
