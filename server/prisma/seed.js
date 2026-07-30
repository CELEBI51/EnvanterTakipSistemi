import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('[SEED] Seeding database...');

  // 1. Create Admin & Viewer Users
  const adminPasswordHash = await bcrypt.hash('admin123', 10);
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@firma.com' },
    update: {
      mustChangePassword: false,
    },
    create: {
      fullName: 'Sistem Yöneticisi',
      email: 'admin@firma.com',
      passwordHash: adminPasswordHash,
      role: 'admin',
      mustChangePassword: false,
    },
  });
  console.log(`[SEED] Admin user ready: ${adminUser.email} (ID: ${adminUser.id})`);

  const viewerPasswordHash = await bcrypt.hash('viewer123', 10);
  const viewerUser = await prisma.user.upsert({
    where: { email: 'viewer@firma.com' },
    update: {
      mustChangePassword: false,
    },
    create: {
      fullName: 'Gözlemci Kullanıcı',
      email: 'viewer@firma.com',
      passwordHash: viewerPasswordHash,
      role: 'viewer',
      mustChangePassword: false,
    },
  });
  console.log(`[SEED] Viewer user ready: ${viewerUser.email}`);

  // 2. Create Sample Employees for Reference Departments
  const sampleEmployees = [
    { fullName: 'Ahmet Yılmaz', tcNo: '12345678901', department: 'Bilgi İşlem', phone: '05321000001', email: 'ahmet.yilmaz@firma.com' },
    { fullName: 'Ayşe Kaya', tcNo: '23456789012', department: 'İnsan Kaynakları', phone: '05321000002', email: 'ayse.kaya@firma.com' },
    { fullName: 'Mehmet Demir', tcNo: '34567890123', department: 'Muhasebe', phone: '05321000003', email: 'mehmet.demir@firma.com' },
    { fullName: 'Fatma Şahin', tcNo: '45678901234', department: 'Satış', phone: '05321000004', email: 'fatma.sahin@firma.com' },
    { fullName: 'Can Öztürk', tcNo: '56789012345', department: 'Pazarlama', phone: '05321000005', email: 'can.ozturk@firma.com' },
    { fullName: 'Mustafa Arslan', tcNo: '67890123456', department: 'Üretim', phone: '05321000006', email: 'mustafa.arslan@firma.com' },
    { fullName: 'Elif Çelik', tcNo: '78901234567', department: 'Lojistik', phone: '05321000007', email: 'elif.celik@firma.com' },
    { fullName: 'Zeynep Yıldız', tcNo: '89012345678', department: 'Yönetim', phone: '05321000008', email: 'zeynep.yildiz@firma.com' },
    { fullName: 'Burak Doğan', tcNo: '90123456789', department: 'Ar-Ge', phone: '05321000009', email: 'burak.dogan@firma.com' },
    { fullName: 'Selin Koç', tcNo: '10987654321', department: 'Diğer', phone: '05321000010', email: 'selin.koc@firma.com' },
  ];

  for (const emp of sampleEmployees) {
    await prisma.employee.upsert({
      where: { tcNo: emp.tcNo },
      update: {},
      create: emp,
    });
  }

  console.log(`[SEED] ${sampleEmployees.length} sample employees added successfully across departments.`);
}

main()
  .catch((e) => {
    console.error('[SEED ERROR]', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
