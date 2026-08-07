import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const listUnits = async ({ includeInactive = false }) => {
  const showInactive = includeInactive === true || includeInactive === 'true';

  const where = showInactive ? {} : { isActive: true };

  const units = await prisma.unit.findMany({
    where,
    orderBy: { name: 'asc' },
  });

  return units;
};

export const getUnitById = async (id) => {
  const unit = await prisma.unit.findUnique({
    where: { id },
  });

  if (!unit) {
    const error = new Error('Birim bulunamadı.');
    error.statusCode = 404;
    throw error;
  }

  return unit;
};

export const createUnit = async (data) => {
  const existing = await prisma.unit.findUnique({
    where: { name: data.name },
  });

  if (existing) {
    const error = new Error('Bu birim adı zaten mevcut.');
    error.statusCode = 400;
    throw error;
  }

  const unit = await prisma.unit.create({
    data: {
      name: data.name,
      address: data.address || null,
      phone: data.phone || null,
      contactPerson: data.contactPerson || null,
      email: data.email || null,
    },
  });

  return unit;
};

export const updateUnit = async (id, data) => {
  await getUnitById(id);

  if (data.name) {
    const existing = await prisma.unit.findUnique({
      where: { name: data.name },
    });

    if (existing && existing.id !== id) {
      const error = new Error('Bu birim adı başka bir kayıtta kullanılıyor.');
      error.statusCode = 400;
      throw error;
    }
  }

  const updatedUnit = await prisma.unit.update({
    where: { id },
    data,
  });

  return updatedUnit;
};

export const deleteUnit = async (id) => {
  const unit = await getUnitById(id);

  // Soft delete: HARD DELETE IS FORBIDDEN. Set isActive = false.
  const softDeletedUnit = await prisma.unit.update({
    where: { id },
    data: { isActive: false },
  });

  return softDeletedUnit;
};
