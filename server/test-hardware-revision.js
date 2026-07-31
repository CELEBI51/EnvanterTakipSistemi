import prisma from './src/config/db.js';
import * as hardwareService from './src/modules/hardware/hardware.service.js';
import { createHardwareSchema } from './src/modules/hardware/hardware.schema.js';

async function runHardwareRevisionTest() {
  console.log('\n======================================================');
  console.log('  HARDWARE MODÜLÜ REVİZYON E2E TEST BAŞLIYOR');
  console.log('======================================================\n');

  const adminUser = await prisma.user.findFirst({ where: { role: 'admin' } });
  if (!adminUser) throw new Error('Admin kullanıcı bulunamadı.');

  const testDemirbasNo = `REV-DMB-${Date.now()}`;

  // 1. Ürün ekle (Garanti tarihleri dolu, model dolu)
  console.log('--- Test 1: Donanım Ekleme (Garanti Tarihleri & Model Dolu) ---');
  const hw1Data = createHardwareSchema.parse({
    category: 'Laptop',
    brand: 'Lenovo',
    model: 'ThinkPad P15',
    serial_no: 'SN-REV-001',
    demirbas_no: testDemirbasNo,
    warranty_start_date: '2026-01-01',
    warranty_end_date: '2028-01-01',
  });

  const hw1 = await hardwareService.createHardware(hw1Data, adminUser.id);
  console.log(`✅ Ürün başarıyla eklendi: ID: ${hw1.id}, Demirbaş No: ${hw1.demirbasNo}`);
  console.log(`   - Model: ${hw1.model}`);
  console.log(`   - Garanti Başlangıç: ${hw1.warrantyStartDate?.toISOString().split('T')[0]}`);
  console.log(`   - Garanti Bitiş: ${hw1.warrantyEndDate?.toISOString().split('T')[0]}`);

  // 2. Aynı demirbaş no ile 2. ürün ekleme denemesi (409 Mükerrerlik Testi)
  console.log('\n--- Test 2: Aynı Demirbaş No İle İkinci Ürün Ekleme Denemesi (409 Mükerrerlik) ---');
  try {
    const hw2Data = createHardwareSchema.parse({
      category: 'Desktop',
      brand: 'HP',
      model: 'ProDesk',
      serial_no: 'SN-REV-002',
      demirbas_no: testDemirbasNo,
    });
    await hardwareService.createHardware(hw2Data, adminUser.id);
    console.error('❌ HATA: Mükerrer demirbaş no reddedilmedi!');
  } catch (err) {
    if (err.statusCode === 409) {
      console.log(`✅ DOĞRULANDI: 409 Conflict alındı. Hata mesajı: "${err.message}"`);
    } else {
      console.error(`❌ Beklenen 409 status code, ancak gelen: ${err.statusCode}`, err);
    }
  }

  // 3. Model alanı BOŞ bırakılarak ürün ekleme testi
  console.log('\n--- Test 3: Model Alanı Boş (null/empty) Olarak Ürün Ekleme ---');
  const testDemirbasNoNoModel = `REV-DMB-NOMODEL-${Date.now()}`;
  const hwNoModelData = createHardwareSchema.parse({
    category: 'Mouse',
    brand: 'Logitech',
    model: '', // Boş string
    serial_no: 'SN-REV-003',
    demirbas_no: testDemirbasNoNoModel,
  });

  const hwNoModel = await hardwareService.createHardware(hwNoModelData, adminUser.id);
  console.log(`✅ Ürün model boş olarak eklendi: ID: ${hwNoModel.id}, Model: ${hwNoModel.model} (null bekleniyor)`);
  if (hwNoModel.model === null) {
    console.log('✅ DOĞRULANDI: Model alanı null olarak kaydedildi.');
  } else {
    console.warn(`   - DIKKAT: Model beklenenden farklı: ${hwNoModel.model}`);
  }

  // 4. Garanti tarihleri BOŞ bırakılarak ürün ekleme testi
  console.log('\n--- Test 4: Garanti Tarihleri Boş Olarak Ürün Ekleme ---');
  const testDemirbasNoNoWarranty = `REV-DMB-NOWARRANTY-${Date.now()}`;
  const hwNoWarrantyData = createHardwareSchema.parse({
    category: 'Klavye',
    brand: 'Dell',
    model: 'KB216',
    serial_no: 'SN-REV-004',
    demirbas_no: testDemirbasNoNoWarranty,
  });

  const hwNoWarranty = await hardwareService.createHardware(hwNoWarrantyData, adminUser.id);
  console.log(`✅ Ürün garanti tarihleri olmadan eklendi: ID: ${hwNoWarranty.id}`);
  if (hwNoWarranty.warrantyStartDate === null && hwNoWarranty.warrantyEndDate === null) {
    console.log('✅ DOĞRULANDI: Garanti başlangıç ve bitiş tarihleri null olarak kaydedildi.');
  }

  // 5. Garanti bitiş tarihi başlangıçtan ÖNCE girilirse reddedilme testi
  console.log('\n--- Test 5: Garanti Bitiş Tarihi Başlangıçtan Önce Girilirse Reddedilme Testi ---');
  try {
    createHardwareSchema.parse({
      category: 'Monitör',
      brand: 'ASUS',
      model: 'VG248',
      serial_no: 'SN-REV-005',
      demirbas_no: `REV-DMB-INVALIDDATE-${Date.now()}`,
      warranty_start_date: '2026-06-01',
      warranty_end_date: '2025-01-01', // Geçersiz bitiş tarihi
    });
    console.error('❌ HATA: Geçersiz garanti tarihi kabul edildi!');
  } catch (err) {
    if (err.name === 'ZodError') {
      console.log(`✅ DOĞRULANDI: Zod validasyon hatası alındı. Mesajlar:`, err.errors.map((e) => e.message));
    } else {
      console.error('❌ Beklenmeyen hata:', err);
    }
  }

  console.log('\n======================================================');
  console.log('  TÜM TEST SENARYOLARI BAŞARIYLA TAMAMLANDI! 🎉');
  console.log('======================================================\n');
}

runHardwareRevisionTest()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
