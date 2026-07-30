import prisma from './src/config/db.js';

async function addPersistentRecord() {
  console.log('\n--- KALICILIK TESTİ: KAYIT EKLENİYOR ---');
  
  const record = await prisma.employee.create({
    data: {
      fullName: 'Kalıcı Personel Testi',
      tcNo: '11122233344',
      department: 'Sistem Kalıcılık Testi',
      phone: '05321112233',
      email: 'kalici.test@firma.com',
    },
  });

  console.log(`✅ Kayıt Eklendi: ID=${record.id}, Ad=${record.fullName}, TC=${record.tcNo}`);
}

addPersistentRecord()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
