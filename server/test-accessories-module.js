import prisma from './src/config/db.js';
import * as accessoryService from './src/modules/accessories/accessories.service.js';

async function runAccessoriesModuleTest() {
  console.log('\n======================================================');
  console.log('  AKSESUAR (ACCESSORIES) MODÜLÜ E2E INTEGRATION TEST');
  console.log('======================================================\n');

  const adminUser = await prisma.user.findFirst({ where: { role: 'admin' } });
  if (!adminUser) throw new Error('Admin kullanıcı bulunamadı.');

  // 1. Yeni bir aksesuar oluştur (Logitech M185 Mouse, category=Mouse, initialQuantity=20)
  console.log('--- Test 1: Aksesuar Oluşturma (initialQuantity=20) ---');
  const accData = {
    name: 'Logitech M185 Kablosuz Mouse',
    category: 'Mouse',
    brand: 'Logitech',
    initialQuantity: 20,
    minThreshold: 5,
    notes: 'Ofis içi standart kablosuz mouse',
  };

  const newAcc = await accessoryService.createAccessory(accData, adminUser.id);
  console.log(`✅ Aksesuar oluşturuldu: ID=${newAcc.id}`);
  console.log(`   - Adı: ${newAcc.name}`);
  console.log(`   - Total Quantity: ${newAcc.totalQuantity} (Beklenen: 20)`);
  console.log(`   - Available Quantity: ${newAcc.availableQuantity} (Beklenen: 20)`);
  console.log(`   - Assigned Quantity: ${newAcc.assignedQuantity} (Beklenen: 0)`);
  console.log(`   - Out Of Use Quantity: ${newAcc.outOfUseQuantity} (Beklenen: 0)`);

  if (newAcc.totalQuantity !== 20 || newAcc.availableQuantity !== 20) {
    throw new Error('❌ HATA: İlk stok miktarları uyuşmuyor!');
  }

  // 2. Stok takviyesi yap (restock: quantity=10, note="Ek sipariş")
  console.log('\n--- Test 2: Stok Takviyesi (restock: +10) ---');
  const restockedAcc = await accessoryService.restockAccessory(
    newAcc.id,
    { quantity: 10, note: 'Ek sipariş geldi' },
    adminUser.id
  );
  console.log(`✅ Stok takviyesi yapıldı: Total=${restockedAcc.totalQuantity}, Available=${restockedAcc.availableQuantity}`);

  if (restockedAcc.totalQuantity !== 30 || restockedAcc.availableQuantity !== 30) {
    throw new Error('❌ HATA: Stok takviyesi sonrası toplam/kullanılabilir stok yanlış!');
  }

  // 3. Arızalı stok ayır (markDefective: quantity=5, note="Bozuk kutu ürünler")
  console.log('\n--- Test 3: Arızalı Stok Ayırma (markDefective: 5) ---');
  const defectiveAcc = await accessoryService.markDefective(
    newAcc.id,
    { quantity: 5, note: 'Kutusu hasarlı ve çalışmayan ürünler' },
    adminUser.id
  );
  console.log(`✅ Arızalı ayrıldı: Available=${defectiveAcc.availableQuantity} (Beklenen: 25), OutOfUse=${defectiveAcc.outOfUseQuantity} (Beklenen: 5), Total=${defectiveAcc.totalQuantity} (Beklenen: 30)`);

  if (
    defectiveAcc.availableQuantity !== 25 ||
    defectiveAcc.outOfUseQuantity !== 5 ||
    defectiveAcc.totalQuantity !== 30
  ) {
    throw new Error('❌ HATA: Arızalı stok ayırma sonrası miktarlar uyuşmuyor!');
  }

  // 4. Yetersiz stok için markDefective (quantity=100)
  console.log('\n--- Test 4: Yetersiz Stok Hatası Kontrolü (markDefective: 100) ---');
  try {
    await accessoryService.markDefective(newAcc.id, { quantity: 100 }, adminUser.id);
    console.error('❌ HATA: Yetersiz stok engellenmedi!');
  } catch (err) {
    console.log(`✅ DOĞRULANDI: Yetersiz stok engellendi. Mesaj: "${err.message}"`);
  }

  // 5. Silme engeli testi (outOfUseQuantity=5 olduğu için silinememeli)
  console.log('\n--- Test 5: Arızalı/Zimmetli Stoğu Olan Aksesuarı Silme Engeli ---');
  try {
    await accessoryService.deleteAccessory(newAcc.id);
    console.error('❌ HATA: Arızalı stoğu olan aksesuar silindi!');
  } catch (err) {
    console.log(`✅ DOĞRULANDI: Silme isteği engellendi. Mesaj: "${err.message}"`);
  }

  // 6. Stok geçmişi (getAccessoryHistory)
  console.log('\n--- Test 6: Aksesuar Stok Hareket Geçmişi (History) ---');
  const history = await accessoryService.getAccessoryHistory(newAcc.id);
  console.log(`✅ Stok hareketleri listelendi (${history.length} kayıt):`);
  history.forEach((m, idx) => {
    console.log(`   ${idx + 1}. Type=${m.type}, Miktar=${m.quantity}, Not="${m.note}", Yapan=${m.createdBy.fullName}`);
  });

  if (history.length !== 3) {
    throw new Error(`❌ HATA: Beklenen hareket sayısı 3, ancak gelen: ${history.length}`);
  }

  // Temizlik (Teardown for test data)
  await prisma.accessoryStockMovement.deleteMany({ where: { accessoryId: newAcc.id } });
  await prisma.accessory.delete({ where: { id: newAcc.id } });
  console.log('\n✅ Test verileri başarıyla temizlendi.');

  console.log('\n======================================================');
  console.log('  TÜM AKSESUAR MODÜLÜ TESTLERİ BAŞARIYLA GEÇTİ! 🎉');
  console.log('======================================================\n');
}

runAccessoriesModuleTest()
  .catch((err) => {
    console.error('❌ TEST BAŞARISIZ:', err);
  })
  .finally(() => prisma.$disconnect());
