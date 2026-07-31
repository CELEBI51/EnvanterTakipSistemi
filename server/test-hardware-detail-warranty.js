import prisma from './src/config/db.js';
import { createHardware, getHardwareById } from './src/modules/hardware/hardware.service.js';

async function runDetailWarrantyTest() {
  console.log('\n======================================================');
  console.log('  HARDWARE DETAIL & WARRANTY DISPLAY INTEGRATION TEST');
  console.log('======================================================\n');

  const adminUser = await prisma.user.findFirst({ where: { role: 'admin' } });

  // 1. Expired Warranty Product (Bitiş tarihi geçmiş)
  const expiredHwData = {
    category: 'Laptop',
    brand: 'Lenovo',
    model: 'ThinkPad T490',
    serial_no: 'SN-EXP-001',
    demirbas_no: `DMB-EXP-${Date.now()}`,
    warranty_start_date: '2023-01-01',
    warranty_end_date: '2025-01-01', // Expired
  };
  const expiredHw = await createHardware(expiredHwData, adminUser.id);
  const detailExpired = await getHardwareById(expiredHw.id);

  console.log(`✅ Süresi Dolmuş Garanti Testi:`);
  console.log(`   - Demirbaş No: ${detailExpired.demirbasNo}`);
  console.log(`   - Garanti Başlangıç: ${detailExpired.warrantyStartDate?.toISOString().split('T')[0]}`);
  console.log(`   - Garanti Bitiş: ${detailExpired.warrantyEndDate?.toISOString().split('T')[0]}`);
  const isExpired = new Date(detailExpired.warrantyEndDate) < new Date(new Date().setHours(0,0,0,0));
  if (isExpired) {
    console.log(`   - DOĞRULANDI: Garanti süresi geçmiş (Garanti Süresi Doldu rozeti gösterilecek).`);
  } else {
    console.error(`   - HATA: Garanti tarihi süresi dolmuş olarak hesaplanamadı.`);
  }

  // 2. Active Future Warranty Product (Bitiş tarihi gelecekte)
  const activeHwData = {
    category: 'Monitör',
    brand: 'Dell',
    model: 'U2723QE',
    serial_no: 'SN-ACT-002',
    demirbas_no: `DMB-ACT-${Date.now()}`,
    warranty_start_date: '2026-01-01',
    warranty_end_date: '2029-01-01', // Active
  };
  const activeHw = await createHardware(activeHwData, adminUser.id);
  const detailActive = await getHardwareById(activeHw.id);

  console.log(`\n✅ Devam Eden Garanti Testi:`);
  console.log(`   - Demirbaş No: ${detailActive.demirbasNo}`);
  console.log(`   - Garanti Bitiş: ${detailActive.warrantyEndDate?.toISOString().split('T')[0]}`);
  const isActive = new Date(detailActive.warrantyEndDate) >= new Date(new Date().setHours(0,0,0,0));
  if (isActive) {
    console.log(`   - DOĞRULANDI: Garanti süresi devam ediyor (Garanti Devam Ediyor rozeti gösterilecek).`);
  }

  // 3. Model Boş Olan Ürün Testi
  const noModelData = {
    category: 'Mouse',
    brand: 'Logitech',
    model: '',
    serial_no: 'SN-NOMODEL-003',
    demirbas_no: `DMB-NOMODEL-${Date.now()}`,
  };
  const noModelHw = await createHardware(noModelData, adminUser.id);
  const detailNoModel = await getHardwareById(noModelHw.id);

  console.log(`\n✅ Boş Model Testi:`);
  console.log(`   - Marka: ${detailNoModel.brand}, Model: ${detailNoModel.model}`);
  if (detailNoModel.model === null) {
    console.log(`   - DOĞRULANDI: Model verisi null döndü (Arayüzde "Belirtilmemiş" veya "-" gösterilecek).`);
  }

  console.log('\n======================================================\n');
}

runDetailWarrantyTest()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
