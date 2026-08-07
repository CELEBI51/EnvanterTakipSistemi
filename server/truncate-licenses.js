import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function truncateLicenses() {
  await prisma.$executeRawUnsafe('TRUNCATE TABLE licenses CASCADE;');
  console.log('Old licenses table truncated successfully.');
  await prisma.$disconnect();
}

truncateLicenses();
