import prisma from './src/config/db.js';

async function verify() {
  console.log('\n========================================');
  console.log('  GERÇEK POSTGRESQL VERİTABANI DOĞRULAMA');
  console.log('========================================\n');

  // 1. Admin Kullanıcısı
  const admin = await prisma.user.findUnique({ where: { email: 'admin@firma.com' } });
  console.log(`✅ 1. Admin Kullanıcı: ${admin.fullName} (${admin.email})`);
  console.log(`   - role: ${admin.role}`);
  console.log(`   - must_change_password: ${admin.mustChangePassword}`);

  // 2. Örnek Çalışanlar
  const empCount = await prisma.employee.count();
  console.log(`\n✅ 2. Örnek Çalışan Sayısı: ${empCount}`);

  // 3. Tablo Var Oluş Kontrolleri
  console.log('\n✅ 3. Tüm Tablolar Gerçek Veritabanında Doğrulandı:');
  console.log(`   - users: ${await prisma.user.count()} kayıt`);
  console.log(`   - employees: ${await prisma.employee.count()} kayıt`);
  console.log(`   - hardware: ${await prisma.hardware.count()} kayıt`);
  console.log(`   - software: ${await prisma.software.count()} kayıt`);
  console.log(`   - assignments: ${await prisma.assignment.count()} kayıt`);
  console.log(`   - assignment_items: ${await prisma.assignmentItem.count()} kayıt`);
  console.log(`   - returns: ${await prisma.return.count()} kayıt`);
  console.log(`   - return_items: ${await prisma.returnItem.count()} kayıt`);
  console.log(`   - notifications: ${await prisma.notification.count()} kayıt`);

  console.log('\n========================================\n');
}

verify()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
