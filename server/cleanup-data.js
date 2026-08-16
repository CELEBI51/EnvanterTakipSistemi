import prisma from './src/config/db.js';

async function cleanupData() {
  console.log('--- TEMİZLİK İŞLEMİ BAŞLATIYOR ---');

  try {
    // 1. İade Detayları ve İadeler
    console.log('1. İade verileri siliniyor...');
    await prisma.returnItem.deleteMany({});
    await prisma.returnAccessoryItem.deleteMany({});
    await prisma.return.deleteMany({});

    // 2. Zimmet Kalemleri ve Zimmetler
    console.log('2. Zimmet verileri siliniyor...');
    await prisma.assignmentItem.deleteMany({});
    await prisma.assignmentAccessoryItem.deleteMany({});
    await prisma.assignmentConsumableItem.deleteMany({});
    await prisma.assignment.deleteMany({});

    // 3. Stok ve Bakım Geçmişi
    console.log('3. Stok ve Bakım kayıtları siliniyor...');
    await prisma.stockMovement.deleteMany({});
    await prisma.maintenanceRecord.deleteMany({});

    // 4. Ekler ve Bildirimler
    console.log('4. Ekler ve Bildirimler siliniyor...');
    await prisma.attachment.deleteMany({});
    await prisma.notification.deleteMany({});

    // 5. Envanter Kalemleri (Varlık, Aksesuar, Sarf Malzeme, Bileşen, Lisans)
    console.log('5. Envanter ürünleri siliniyor...');
    await prisma.hardware.deleteMany({});
    await prisma.accessory.deleteMany({});
    await prisma.consumable.deleteMany({});
    await prisma.component.deleteMany({});
    await prisma.license.deleteMany({});

    // 6. Personel Kayıtları
    console.log('6. Personel kayıtları siliniyor...');
    await prisma.employee.deleteMany({});

    console.log('--- TEMİZLİK TAMAMLANDI! ---');
  } catch (error) {
    console.error('Hata oluştu:', error);
  } finally {
    await prisma.$disconnect();
  }
}

cleanupData();

