import prisma from '../../config/db.js';

export const createHardware = async (data, userId) => {
  const { category, brand, model, serial_no, mode, demirbas_no, specs } = data;

  return await prisma.$transaction(async (tx) => {
    let finalDemirbasNo = '';

    if (mode === 'new') {
      const year = new Date().getFullYear();
      const prefix = `DMB-${year}-`;

      // Find highest demirbas_no for the current year
      const highestItem = await tx.hardware.findFirst({
        where: {
          demirbasNo: {
            startsWith: prefix,
          },
        },
        orderBy: {
          demirbasNo: 'desc',
        },
      });

      let nextSequence = 1;
      if (highestItem && highestItem.demirbasNo) {
        const parts = highestItem.demirbasNo.split('-');
        const lastNumStr = parts[parts.length - 1];
        const lastNum = parseInt(lastNumStr, 10);
        if (!isNaN(lastNum)) {
          nextSequence = lastNum + 1;
        }
      }

      finalDemirbasNo = `${prefix}${String(nextSequence).padStart(4, '0')}`;
    } else {
      finalDemirbasNo = demirbas_no.trim();

      // Check if demirbas_no already exists
      const existing = await tx.hardware.findUnique({
        where: { demirbasNo: finalDemirbasNo },
      });

      if (existing) {
        const error = new Error('Bu demirbaş no zaten kayıtlı.');
        error.statusCode = 409;
        throw error;
      }
    }

    const newItem = await tx.hardware.create({
      data: {
        category,
        brand,
        model,
        serialNo: serial_no || '',
        demirbasNo: finalDemirbasNo,
        specs: specs || null,
        status: 'Hazir',
        createdById: userId,
      },
    });

    return newItem;
  });
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

  const updated = await prisma.hardware.update({
    where: { id },
    data: {
      category: data.category !== undefined ? data.category : existing.category,
      brand: data.brand !== undefined ? data.brand : existing.brand,
      model: data.model !== undefined ? data.model : existing.model,
      serialNo: data.serial_no !== undefined ? data.serial_no : existing.serialNo,
      status: data.status !== undefined ? data.status : existing.status,
      specs: data.specs !== undefined ? data.specs : existing.specs,
    },
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
