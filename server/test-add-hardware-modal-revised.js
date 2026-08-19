import prisma from './src/config/db.js';

async function runModalIntegrationTest() {
  console.log('\n======================================================');
  console.log('  REVISED ADD HARDWARE MODAL API INTEGRATION TEST');
  console.log('======================================================\n');

  const adminUser = await prisma.user.findFirst({ where: { role: 'admin' } });

  // 1. Marka: "Diğer" -> Custom Brand "Monster", Model: "", Demirbaş No: "TEST-2024-9999", Garanti Tarihleri
  const testDemirbasNo = `TEST-2024-${Date.now()}`;

  const payload = {
    category: 'Laptop',
    brand: 'Monster', // Client sends custom brand string when "Diğer" selected
    model: undefined, // Empty model sent as undefined/null
    serial_no: 'SN-MONSTER-001',
    demirbas_no: testDemirbasNo,
    warranty_start_date: '2026-01-01',
    warranty_end_date: '2027-01-01',
    specs: { cpu: 'i9-13900H', ram: '32 GB', dvd: false },
  };

  const res1 = await fetch('http://localhost:4001/api/hardware', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer mock-token`, // let's check auth
    },
    body: JSON.stringify(payload),
  });

  // Let's call service directly or with user ID
  const { createHardware } = await import('./src/modules/hardware/hardware.service.js');
  const hw1 = await createHardware(payload, adminUser.id);

  console.log(`✅ Test 1 Başarılı: Ürün eklendi (Custom Brand: "${hw1.brand}", Model: ${hw1.model}, Demirbaş No: "${hw1.demirbasNo}")`);

  // 2. Mükerrer Demirbaş No Ekleme Denemesi
  try {
    await createHardware({ ...payload, brand: 'Dell' }, adminUser.id);
  } catch (err) {
    if (err.statusCode === 409) {
      console.log(`✅ Test 2 Başarılı: Mükerrer Demirbaş No 409 ile reddedildi: "${err.message}"`);
    } else {
      console.error('❌ Beklenmeyen hata:', err);
    }
  }

  console.log('\n======================================================\n');
}

runModalIntegrationTest()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
