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
      passwordHash: adminPasswordHash,
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

  const testPasswordHash = await bcrypt.hash('123456', 10);
  const testUser = await prisma.user.upsert({
    where: { email: 'muhammet@testmail.local' },
    update: {
      passwordHash: testPasswordHash,
      mustChangePassword: false,
    },
    create: {
      fullName: 'Muhammet Test',
      email: 'muhammet@testmail.local',
      passwordHash: testPasswordHash,
      role: 'admin',
      mustChangePassword: false,
    },
  });
  console.log(`[SEED] Test admin user ready: ${testUser.email}`);


  // 2. Seed Categories per CategoryParentType
  const seedCategoriesData = [
    // Varlık
    { parentType: 'VARLIK', name: 'Desktop' },
    { parentType: 'VARLIK', name: 'Laptop' },
    { parentType: 'VARLIK', name: 'Monitör' },
    { parentType: 'VARLIK', name: 'Yazıcı' },
    // Aksesuar
    { parentType: 'AKSESUAR', name: 'Mouse' },
    { parentType: 'AKSESUAR', name: 'Klavye' },
    { parentType: 'AKSESUAR', name: 'Kulaklık' },
    { parentType: 'AKSESUAR', name: 'Kamera' },
    // Lisans
    { parentType: 'LISANS', name: 'İşletim Sistemi' },
    { parentType: 'LISANS', name: 'Ofis Yazılımı' },
    { parentType: 'LISANS', name: 'Güvenlik Yazılımı' },
    // Sarf Malzeme
    { parentType: 'SARF_MALZEME', name: 'Kağıt' },
    { parentType: 'SARF_MALZEME', name: 'Toner' },
    { parentType: 'SARF_MALZEME', name: 'Kablo' },
    // Bileşen
    { parentType: 'BILESEN', name: 'RAM' },
    { parentType: 'BILESEN', name: 'SSD/HDD' },
    { parentType: 'BILESEN', name: 'Güç Kaynağı' },
    { parentType: 'BILESEN', name: 'Anakart' },
  ];

  for (const catData of seedCategoriesData) {
    await prisma.category.upsert({
      where: {
        parentType_name: {
          parentType: catData.parentType,
          name: catData.name,
        },
      },
      update: {},
      create: catData,
    });
  }
  console.log(`[SEED] ${seedCategoriesData.length} categories seeded successfully across 5 parent types.`);

  // 4. Seed Default Units
  const seedUnitsData = [
    { name: 'Ar-Ge' },
    { name: 'Bilgi İşlemleri' },
    { name: 'Satış-Pazarlama' },
  ];

  for (const unitData of seedUnitsData) {
    await prisma.unit.upsert({
      where: { name: unitData.name },
      update: { isActive: true },
      create: { ...unitData, isActive: true },
    });
  }
  console.log(`[SEED] ${seedUnitsData.length} default units seeded successfully.`);

  // 5. Seed SystemSettings (ID: 1)
  await prisma.systemSettings.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      companyName: 'DİTAŞ Otomotiv',
    },
  });
  console.log('[SEED] SystemSettings (id: 1) initialized with companyName: "DİTAŞ Otomotiv".');

  // 6. Seed Default Email Templates
  const seedEmailTemplatesData = [
    {
      type: 'license_expiry',
      subject: '⚠️ Lisans Yenileme Hatırlatması — {{lisansSayisi}} lisans süresi yaklaşıyor',
      bodyText: 'Sayın Yönetici,\n\nAşağıdaki lisansların süresi yaklaşmaktadır:\n\n{{lisansListesi}}\n\nLütfen gerekli yenileme işlemlerini yapınız.\n\nSaygılarımızla,\n{{sirketAdi}}',
    },
    {
      type: 'critical_stock',
      subject: '⚠️ Kritik Stok Uyarısı — {{urunSayisi}} ürün kritik seviyede',
      bodyText: 'Sayın Yönetici,\n\nAşağıdaki ürünler kritik stok seviyesinin altına düşmüştür:\n\n{{urunListesi}}\n\nLütfen stok yenileme işlemlerini yapınız.\n\nSaygılarımızla,\n{{sirketAdi}}',
    },
    {
      type: 'license_expired',
      subject: '🔴 Lisans Süresi Doldu — {{lisansSayisi}} lisans süresi doldu',
      bodyText: 'Sayın Yönetici,\n\nAşağıdaki lisansların süresi dolmuştur:\n\n{{lisansListesi}}\n\nLütfen en kısa sürede gerekli işlemleri yapınız.\n\nSaygılarımızla,\n{{sirketAdi}}',
    },
    {
      type: 'new_assignment',
      subject: '📦 Yeni Zimmet — {{personelAdi}}',
      bodyText: 'Sayın Yönetici,\n\n{{personelAdi}} ({{birimAdi}}) adlı personele yeni zimmet oluşturulmuştur.\n\nZimmet Tarihi: {{tarih}}\nTeslim Eden: {{teslimEden}}\nZimmetlenen Kalemler:\n{{kalemListesi}}\n\nSaygılarımızla,\n{{sirketAdi}}',
    },
  ];

  for (const templateData of seedEmailTemplatesData) {
    await prisma.emailTemplate.upsert({
      where: { type: templateData.type },
      update: {},
      create: templateData,
    });
  }
  console.log(`[SEED] ${seedEmailTemplatesData.length} default email templates seeded successfully.`);
}

main()
  .catch((e) => {
    console.error('[SEED ERROR]', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
