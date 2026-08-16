import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '.env') });

import prisma from './src/config/db.js';
import { checkLicenseExpirations } from './src/jobs/licenseExpiry.job.js';
import { checkCriticalStock } from './src/jobs/criticalStock.job.js';
import { createAssignment } from './src/modules/assignments/assignments.service.js';

async function runTests() {
  console.log('=============== E-POSTA BİLDİRİMLERİ TEST SUITE ===============\n');

  // Admin kullanıcılardan birinin e-postasını test adresine güncelle
  const targetAdmin = await prisma.user.findFirst({ where: { role: 'admin', email: 'muhammet@testmail.local' } });
  if (!targetAdmin) {
    const anyAdmin = await prisma.user.findFirst({ where: { role: 'admin' } });
    if (anyAdmin) {
      await prisma.user.update({
        where: { id: anyAdmin.id },
        data: { email: 'muhammet@testmail.local' },
      });
    }
  }



  // TEST 1: Tarihi Yaklaşan Lisanslar Maili (15 gün veya az kalmış lisans)
  console.log('--- TEST 1: Tarihi Yaklaşan Lisanslar Cron Maili ---');
  const future10Days = new Date();
  future10Days.setDate(future10Days.getDate() + 10);

  const unit = await prisma.unit.findFirst();
  const unitId = unit ? unit.id : (await prisma.unit.create({ data: { name: 'IT Test Birimi' } })).id;
  const adminUser = await prisma.user.findFirst({ where: { role: 'admin' } });

  const testExpiringLic = await prisma.license.create({
    data: {
      brand: 'JetBrains Test',
      productInfo: 'IntelliJ IDEA Test License',
      licenseKey: `TEST-EXP-${Date.now()}`,
      paymentType: 'KREDI_KARTI',
      unit: { connect: { id: unitId } },
      createdBy: { connect: { id: adminUser.id } },
      startDate: new Date(),
      endDate: future10Days,
      status: 'AKTIF',
    },
  });
  console.log(`[Test Prep] 10 gün sonra süresi dolacak test lisansı oluşturuldu: ${testExpiringLic.id}`);

  await checkLicenseExpirations();
  console.log('[Test 1 Sonuç] checkLicenseExpirations tetiklendi, e-posta gönderimi tamamlandı.\n');

  // TEST 2: Kritik Stok Uyarısı Maili (Stok <= 5)
  console.log('--- TEST 2: Kritik Stok Uyarısı Cron Maili ---');
  const category = await prisma.category.findFirst({ where: { parentType: 'AKSESUAR' } });
  const categoryId = category ? category.id : (await prisma.category.create({ data: { name: 'Aksesuar Test Kat', parentType: 'AKSESUAR' } })).id;

  const testAcc = await prisma.accessory.create({
    data: {
      name: `Kritik Test Klavye ${Date.now()}`,
      category: { connect: { id: categoryId } },
      createdBy: { connect: { id: adminUser.id } },
      totalQuantity: 5,
      availableQuantity: 3,
      assignedQuantity: 2,
    },
  });

  console.log(`[Test Prep] Stok miktarı 3 (<=5) olan test aksesuarı oluşturuldu: ${testAcc.id}`);

  const stockRes = await checkCriticalStock();
  console.log(`[Test 2 Sonuç] checkCriticalStock tetiklendi (${stockRes.count} kritik ürün tespit edildi ve mail gönderildi).\n`);

  // TEST 3: Süresi Dolan Lisans Anlık Maili
  console.log('--- TEST 3: Süresi Dolan Lisans Maili ---');
  const pastDate = new Date();
  pastDate.setDate(pastDate.getDate() - 2);

  const testExpiredLic = await prisma.license.create({
    data: {
      brand: 'Autodesk Test',
      productInfo: 'AutoCAD Expired Test License',
      licenseKey: `TEST-EXPIRED-${Date.now()}`,
      paymentType: 'KREDI_KARTI',
      unit: { connect: { id: unitId } },
      createdBy: { connect: { id: adminUser.id } },
      startDate: new Date('2025-01-01'),
      endDate: pastDate,
      status: 'AKTIF',
    },
  });







  console.log(`[Test Prep] 2 gün önce süresi dolmuş test lisansı oluşturuldu: ${testExpiredLic.id}`);

  await checkLicenseExpirations();
  console.log('[Test 3 Sonuç] checkLicenseExpirations tetiklendi, SURESI_DOLDU maili gönderildi.\n');

  // TEST 4: Yeni Zimmet Oluşturma Anlık Maili
  console.log('--- TEST 4: Yeni Zimmet Mail Bildirimi ---');
  // Var olan bir personeli veya yeni bir personeli al
  let employee = await prisma.employee.findFirst();
  if (!employee) {
    employee = await prisma.employee.create({
      data: {
        fullName: 'Test Zimmet Personeli',
        tcNo: '11111111111',
      },
    });
  }

  const hwCategory = await prisma.category.findFirst({ where: { parentType: 'VARLIK' } });
  const hwCategoryId = hwCategory ? hwCategory.id : (await prisma.category.create({ data: { name: 'Varlık Test Kat', parentType: 'VARLIK' } })).id;

  // Hazır durumda test hardware oluştur
  const hw = await prisma.hardware.create({
    data: {
      brand: 'Dell Test Laptop',
      model: 'Latitude 5540',
      serialNo: `SN-${Date.now()}`,
      demirbasNo: `DEM-${Date.now()}`,
      category: { connect: { id: hwCategoryId } },
      createdBy: { connect: { id: adminUser.id } },
      status: 'Hazir',
    },
  });

  const assignmentData = {
    employeeId: employee.id,
    teslimTarihi: new Date().toISOString(),
    hardwareItems: [{ hardwareId: hw.id }],
    accessoryItems: [{ accessoryId: testAcc.id, quantity: 1 }],
  };

  const createdAssignment = await createAssignment(assignmentData, adminUser);

  console.log(`[Test 4 Sonuç] Yeni zimmet oluşturuldu (ID: ${createdAssignment.id}), zimmet bildirim maili gönderildi.\n`);

  // TEMİZLİK (Test verilerini sil)
  await prisma.assignmentItem.deleteMany({ where: { assignmentId: createdAssignment.id } });
  await prisma.assignmentAccessoryItem.deleteMany({ where: { assignmentId: createdAssignment.id } });
  await prisma.stockMovement.deleteMany({ where: { entityId: testAcc.id } });
  await prisma.assignment.delete({ where: { id: createdAssignment.id } });
  await prisma.hardware.delete({ where: { id: hw.id } });
  await prisma.accessory.delete({ where: { id: testAcc.id } });
  await prisma.license.deleteMany({ where: { id: { in: [testExpiringLic.id, testExpiredLic.id] } } });

  console.log('================ ALL MAIL TESTS FINISHED ================');
  process.exit(0);
}

runTests().catch((err) => {
  console.error('Test hatası:', err);
  process.exit(1);
});
