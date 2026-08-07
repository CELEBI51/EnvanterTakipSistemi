import prisma from '../../config/db.js';

export const createEmployee = async (data) => {
  const { fullName, tcNo, unitId, phone, email } = data;

  const existing = await prisma.employee.findUnique({
    where: { tcNo },
  });

  if (existing) {
    const error = new Error('Bu T.C. Kimlik Numarası ile kayıtlı personel zaten mevcut.');
    error.statusCode = 409;
    throw error;
  }

  const unit = await prisma.unit.findUnique({
    where: { id: unitId },
  });

  if (!unit) {
    const error = new Error('Seçilen Birim bulunamadı.');
    error.statusCode = 404;
    throw error;
  }

  const employee = await prisma.employee.create({
    data: {
      fullName: fullName.trim(),
      tcNo: tcNo.trim(),
      unitId,
      phone: phone && phone.trim() !== '' ? phone.trim() : null,
      email: email && email.trim() !== '' ? email.trim() : null,
    },
    include: {
      unit: {
        select: { id: true, name: true },
      },
    },
  });

  return employee;
};

export const listEmployees = async ({ page = 1, pageSize = 10, q }) => {
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const sizeNum = Math.max(1, parseInt(pageSize, 10) || 10);
  const skip = (pageNum - 1) * sizeNum;

  const where = {};

  if (q && q.trim() !== '') {
    const searchTerm = q.trim();
    where.OR = [
      { fullName: { contains: searchTerm, mode: 'insensitive' } },
      { tcNo: { contains: searchTerm, mode: 'insensitive' } },
      { unit: { name: { contains: searchTerm, mode: 'insensitive' } } },
    ];
  }

  const [totalCount, items] = await Promise.all([
    prisma.employee.count({ where }),
    prisma.employee.findMany({
      where,
      skip,
      take: sizeNum,
      orderBy: { fullName: 'asc' },
      include: {
        unit: {
          select: { id: true, name: true },
        },
      },
    }),
  ]);

  return {
    data: items,
    pagination: {
      totalCount,
      totalPages: Math.ceil(totalCount / sizeNum) || 1,
      currentPage: pageNum,
      pageSize: sizeNum,
    },
  };
};

export const getEmployeeById = async (id) => {
  const employee = await prisma.employee.findUnique({
    where: { id },
    include: {
      unit: {
        select: { id: true, name: true },
      },
    },
  });

  if (!employee) {
    const error = new Error('Personel bulunamadı.');
    error.statusCode = 404;
    throw error;
  }

  return employee;
};
