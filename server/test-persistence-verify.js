import prisma from './src/config/db.js';

async function verifyPersistence() {
  console.log('\n========================================');
  console.log('  KALICILIK (PERSISTENCE) TESTİ DOĞRULAMA');
  console.log('========================================\n');

  const record = await prisma.employee.findUnique({
    where: { tcNo: '11122233344' },
  });

  if (record) {
    console.log(`🎉 KALICILIK TESTİ BAŞARILI!`);
    console.log(`   Veritabanı yeniden başlatılmasına rağmen kayıt korundu:`);
    console.log(`   - ID: ${record.id}`);
    console.log(`   - Ad Soyad: ${record.fullName}`);
    console.log(`   - TC No: ${record.tcNo}`);
    console.log(`   - Departman: ${record.department}`);
    
    // Temizlik
    await prisma.employee.delete({ where: { id: record.id } });
    console.log(`\n🧹 Test kaydı başarıyla temizlendi.`);
  } else {
    console.error(`❌ KALICILIK TESTİ BAŞARISIZ! Kayıt bulunamadı.`);
    process.exit(1);
  }

  console.log('\n========================================\n');
}

verifyPersistence()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
