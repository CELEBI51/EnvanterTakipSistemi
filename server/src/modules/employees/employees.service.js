import prisma from '../../config/db.js';

export const createEmployee = async (data) => {
  const { fullName, tcNo, unitId, phone, email, hireDate } = data;

  const existing = await prisma.employee.findUnique({
    where: { tcNo },
  });

  if (existing) {
    const error = new Error('Bu Sicil Numarası ile kayıtlı personel zaten mevcut.');
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
      hireDate: hireDate ? new Date(hireDate) : null,
    },
    include: {
      unit: {
        select: { id: true, name: true },
      },
    },
  });

  return employee;
};

export const listEmployees = async ({ page = 1, pageSize = 10, q, isActive }) => {
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const sizeNum = Math.max(1, parseInt(pageSize, 10) || 10);
  const skip = (pageNum - 1) * sizeNum;

  const where = {};

  if (isActive !== undefined && isActive !== null && isActive !== '') {
    where.isActive = String(isActive) === 'true';
  }

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
        assignments: {
          where: {
            status: { in: ['Aktif', 'KismiIade'] },
          },
          select: { id: true },
        },
      },
    }),
  ]);

  const formattedItems = items.map((emp) => {
    const { assignments, ...rest } = emp;
    return {
      ...rest,
      activeAssignmentCount: assignments.length,
    };
  });

  return {
    data: formattedItems,
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
      assignments: {
        orderBy: { teslimTarihi: 'desc' },
        select: {
          id: true,
          teslimTarihi: true,
          status: true,
          teslimEden: true,
          pdfUrl: true,
          _count: {
            select: {
              items: true,
              accessoryItems: true,
              consumableItems: true,
            },
          },
        },
      },
    },
  });

  if (!employee) {
    const error = new Error('Personel bulunamadı.');
    error.statusCode = 404;
    throw error;
  }

  const activeAssignments = employee.assignments.filter((a) =>
    ['Aktif', 'KismiIade'].includes(a.status)
  );

  return {
    ...employee,
    activeAssignmentCount: activeAssignments.length,
    assignmentHistory: employee.assignments,
  };
};

export const updateEmployeeStatus = async (id, { isActive, terminationDate }) => {
  const employee = await prisma.employee.findUnique({
    where: { id },
    include: {
      assignments: {
        where: {
          status: { in: ['Aktif', 'KismiIade'] },
        },
        select: { id: true },
      },
    },
  });

  if (!employee) {
    const error = new Error('Personel bulunamadı.');
    error.statusCode = 404;
    throw error;
  }

  const activeCount = employee.assignments.length;

  if (!isActive) {
    if (activeCount > 0) {
      const error = new Error(
        `Bu personelin zimmetinde henüz iade edilmemiş ${activeCount} adet zimmet kaydı var. İşten çıkarılmadan önce tüm zimmetlerin iade alınması gerekmektedir.`
      );
      error.statusCode = 400;
      error.activeAssignmentCount = activeCount;
      throw error;
    }

    const tDate = terminationDate ? new Date(terminationDate) : new Date();

    const updated = await prisma.employee.update({
      where: { id },
      data: {
        isActive: false,
        terminationDate: tDate,
      },
      include: {
        unit: { select: { id: true, name: true } },
      },
    });

    try {
      const { createLog } = await import('../../services/log.service.js');
      await createLog({
        action: 'UPDATE',
        module: 'employee',
        description: `${employee.fullName} adlı personel işten çıkarıldı`,
        entityId: id,
        statusCode: 200,
      });
    } catch (lErr) {}

    return updated;
  } else {
    return await prisma.employee.update({
      where: { id },
      data: {
        isActive: true,
        terminationDate: null,
      },
      include: {
        unit: { select: { id: true, name: true } },
      },
    });
  }
};

export const getEmployeeStats = async () => {
  const [total, active, inactive] = await Promise.all([
    prisma.employee.count(),
    prisma.employee.count({ where: { isActive: true } }),
    prisma.employee.count({ where: { isActive: false } }),
  ]);

  return {
    total,
    active,
    inactive,
  };
};

export const exportEmployees = async ({ q, isActive }, res) => {
  const where = {};

  if (isActive !== undefined && isActive !== null && isActive !== '') {
    where.isActive = String(isActive) === 'true';
  }

  if (q && q.trim() !== '') {
    const searchTerm = q.trim();
    where.OR = [
      { fullName: { contains: searchTerm, mode: 'insensitive' } },
      { tcNo: { contains: searchTerm, mode: 'insensitive' } },
      { unit: { name: { contains: searchTerm, mode: 'insensitive' } } },
    ];
  }

  const items = await prisma.employee.findMany({
    where,
    orderBy: { fullName: 'asc' },
    include: {
      unit: {
        select: { id: true, name: true },
      },
      assignments: {
        where: {
          status: { in: ['Aktif', 'KismiIade'] },
        },
        select: { id: true },
      },
    },
  });

  const columns = [
    { header: 'Ad Soyad', key: 'fullName', width: 22 },
    { header: 'TC No', key: 'tcNo', width: 16 },
    { header: 'Birim', key: 'unitName', width: 18 },
    { header: 'Telefon', key: 'phone', width: 16 },
    { header: 'Email', key: 'email', width: 22 },
    { header: 'İşe Başlama Tarihi', key: 'hireDate', width: 18 },
    { header: 'İşten Çıkış Tarihi', key: 'terminationDate', width: 18 },
    { header: 'Durum', key: 'statusText', width: 14 },
    { header: 'Aktif Zimmet Sayısı', key: 'activeAssignmentCount', width: 18 },
  ];

  const rows = items.map((emp) => ({
    fullName: emp.fullName || '-',
    tcNo: emp.tcNo || '-',
    unitName: emp.unit ? emp.unit.name : '-',
    phone: emp.phone || '-',
    email: emp.email || '-',
    hireDate: emp.hireDate ? new Date(emp.hireDate).toLocaleDateString('tr-TR') : '-',
    terminationDate: emp.terminationDate ? new Date(emp.terminationDate).toLocaleDateString('tr-TR') : '-',
    statusText: emp.isActive ? 'Aktif' : 'Pasif',
    activeAssignmentCount: emp.assignments ? emp.assignments.length : 0,
  }));

  const { createExcelStream } = await import('../../services/excelExport.service.js');
  const todayStr = new Date().toISOString().split('T')[0];
  await createExcelStream('Personeller', columns, rows, res, `personel_${todayStr}.xlsx`);
};

export const updateEmployee = async (id, data) => {
  const existing = await prisma.employee.findUnique({ where: { id } });
  if (!existing) {
    const error = new Error('Güncellenecek personel bulunamadı.');
    error.statusCode = 404;
    throw error;
  }

  const updateData = {};

  if (data.tcNo !== undefined && data.tcNo.trim() !== existing.tcNo) {
    const dup = await prisma.employee.findUnique({ where: { tcNo: data.tcNo.trim() } });
    if (dup) {
      const err = new Error('Bu Sicil Numarası başka bir personele kayıtlı.');
      err.statusCode = 409;
      throw err;
    }
    updateData.tcNo = data.tcNo.trim();
  }

  if (data.unitId) {
    const unit = await prisma.unit.findUnique({ where: { id: data.unitId } });
    if (!unit) {
      const err = new Error('Seçilen birim bulunamadı.');
      err.statusCode = 404;
      throw err;
    }
    updateData.unitId = data.unitId;
  }

  if (data.fullName !== undefined) updateData.fullName = data.fullName.trim();
  if (data.phone !== undefined) updateData.phone = data.phone && data.phone.trim() !== '' ? data.phone.trim() : null;
  if (data.email !== undefined) updateData.email = data.email && data.email.trim() !== '' ? data.email.trim() : null;
  if (data.hireDate !== undefined) updateData.hireDate = data.hireDate ? new Date(data.hireDate) : null;

  const updated = await prisma.employee.update({
    where: { id },
    data: updateData,
    include: {
      unit: {
        select: { id: true, name: true },
      },
    },
  });

  return updated;
};

