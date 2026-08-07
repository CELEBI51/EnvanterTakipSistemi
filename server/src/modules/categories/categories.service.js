import { PrismaClient } from '@prisma/client';
import { PARENT_TYPE_MAP, PARENT_TYPE_REVERSE_MAP } from './categories.schema.js';

const prisma = new PrismaClient();

function formatCategory(cat) {
  if (!cat) return null;
  return {
    id: cat.id,
    parentType: PARENT_TYPE_REVERSE_MAP[cat.parentType] || cat.parentType,
    name: cat.name,
    createdAt: cat.createdAt,
  };
}

export const listCategories = async (parentType) => {
  let where = {};
  if (parentType) {
    const dbEnum = PARENT_TYPE_MAP[parentType];
    if (dbEnum) {
      where.parentType = dbEnum;
    }
  }

  const categories = await prisma.category.findMany({
    where,
    orderBy: {
      name: 'asc',
    },
  });

  return categories.map(formatCategory);
};

export const createCategory = async (parentType, name) => {
  const dbEnum = PARENT_TYPE_MAP[parentType];
  if (!dbEnum) {
    const err = new Error('Geçersiz ana kategori tipi.');
    err.statusCode = 400;
    throw err;
  }

  const existing = await prisma.category.findUnique({
    where: {
      parentType_name: {
        parentType: dbEnum,
        name: name.trim(),
      },
    },
  });

  if (existing) {
    const err = new Error('Bu kategori zaten mevcut');
    err.statusCode = 409;
    throw err;
  }

  const category = await prisma.category.create({
    data: {
      parentType: dbEnum,
      name: name.trim(),
    },
  });

  return formatCategory(category);
};

export const deleteCategory = async (id) => {
  const category = await prisma.category.findUnique({
    where: { id },
  });

  if (!category) {
    const err = new Error('Kategori bulunamadı.');
    err.statusCode = 404;
    throw err;
  }

  // Check linked records in Hardware and Accessory
  const [hardwareCount, accessoryCount] = await Promise.all([
    prisma.hardware.count({ where: { categoryId: id } }),
    prisma.accessory.count({ where: { categoryId: id } }),
  ]);

  const totalLinked = hardwareCount + accessoryCount;

  if (totalLinked > 0) {
    const err = new Error(
      `Bu kategoriye bağlı ${totalLinked} kayıt var, önce bu kayıtları başka bir kategoriye taşıyın veya silin.`
    );
    err.statusCode = 400;
    throw err;
  }

  await prisma.category.delete({
    where: { id },
  });

  return { message: 'Kategori başarıyla silindi.' };
};
