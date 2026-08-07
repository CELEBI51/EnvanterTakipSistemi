import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seedSampleLicenses() {
  console.log('=== SEEDING SAMPLE LICENSES FOR TESTING ===');

  try {
    const units = await prisma.unit.findMany();
    const user = await prisma.user.findFirst();

    if (!units.length || !user) {
      console.log('No units or user found, skipping sample licenses seed.');
      return;
    }

    const unitArge = units.find((u) => u.name.includes('Ar-Ge')) || units[0];
    const unitBilgi = units.find((u) => u.name.includes('Bilgi')) || units[0];
    const unitSatis = units.find((u) => u.name.includes('Satış')) || units[0];

    // License 1: JetBrains WebStorm (YENILENDI, 1 year left)
    await prisma.license.create({
      data: {
        unitId: unitBilgi.id,
        brand: 'JetBrains',
        productInfo: 'WebStorm IDE All Products Pack',
        licenseKey: 'JB-WS-2026-X89',
        startDate: new Date('2026-01-01'),
        endDate: new Date(Date.now() + 200 * 24 * 60 * 60 * 1000),
        paymentType: 'KREDI_KARTI',
        status: 'YENILENDI',
        invoiceNumber: 'INV-2026-JB01',
        invoiceAmount: 4500.00,
        notes: 'Yıllık geliştirici lisansı',
        createdById: user.id,
      },
    });

    // License 2: Microsoft Office 365 (YENILENMEDI, 7 days left -> EXPIRING SOON HIGHLIGHT)
    await prisma.license.create({
      data: {
        unitId: unitArge.id,
        brand: 'Microsoft',
        productInfo: 'Office 365 Business Premium',
        licenseKey: 'MS-O365-KEY-777',
        startDate: new Date('2025-08-15'),
        endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        paymentType: 'VADELI',
        status: 'YENILENMEDI',
        invoiceNumber: 'INV-2025-MS99',
        invoiceAmount: 18500.00,
        notes: 'Ar-Ge birimi için 15 kullanıcı yenileme bekliyor',
        createdById: user.id,
      },
    });

    // License 3: Autodesk AutoCAD (IPTAL_EDILDI, past date)
    await prisma.license.create({
      data: {
        unitId: unitSatis.id,
        brand: 'Autodesk',
        productInfo: 'AutoCAD Commercial Single User',
        licenseKey: 'ACAD-2025-001',
        startDate: new Date('2025-01-01'),
        endDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        paymentType: 'NAKIT',
        status: 'IPTAL_EDILDI',
        invoiceNumber: 'INV-2025-AC05',
        invoiceAmount: 12000.00,
        notes: 'Lisans kullanımı sonlandırıldı',
        createdById: user.id,
      },
    });

    console.log('Sample licenses created successfully!');
  } catch (err) {
    console.error('Error seeding sample licenses:', err);
  } finally {
    await prisma.$disconnect();
  }
}

seedSampleLicenses();
