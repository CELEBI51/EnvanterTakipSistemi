import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function migrateStatusToAktif() {
  console.log('=== MIGRATING EXISTING LICENSES WITH STATUS YENILENMEDI TO AKTIF ===');
  try {
    const result = await prisma.license.updateMany({
      where: {
        status: 'YENILENMEDI',
      },
      data: {
        status: 'AKTIF',
      },
    });

    console.log(`Successfully updated ${result.count} license record(s) to status 'AKTIF'.`);
  } catch (err) {
    console.error('Error updating existing license status:', err);
  } finally {
    await prisma.$disconnect();
  }
}

migrateStatusToAktif();
