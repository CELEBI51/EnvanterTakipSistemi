import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function check() {
  const licenses = await prisma.license.findMany({
    select: { id: true, brand: true, productInfo: true, endDate: true, status: true }
  });
  const accessories = await prisma.accessory.findMany({
    select: { id: true, name: true, availableQuantity: true }
  });
  const consumables = await prisma.consumable.findMany({
    select: { id: true, name: true, availableQuantity: true }
  });
  
  console.log('--- ALL DB LICENSES ---');
  console.table(licenses);

  console.log('--- ALL DB ACCESSORIES ---');
  console.table(accessories);

  console.log('--- ALL DB CONSUMABLES ---');
  console.table(consumables);

  await prisma.$disconnect();
}

check();
