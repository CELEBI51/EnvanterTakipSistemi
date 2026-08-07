import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function updateStatus() {
  await prisma.license.update({
    where: { id: '035d3b41-6991-422f-a5a8-4591c91009e5' },
    data: { status: 'AKTIF' },
  });
  console.log('Autodesk status updated to AKTIF successfully.');
  await prisma.$disconnect();
}

updateStatus();
