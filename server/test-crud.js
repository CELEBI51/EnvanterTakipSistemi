import prisma from './src/config/db.js';

async function testCrud() {
  console.log('\n========================================');
  console.log('  1. CRUD TESTİ (CREATE, READ, DELETE)');
  console.log('========================================\n');

  // 1. CREATE
  const newEmp = await prisma.employee.create({
    data: {
      fullName: 'Gökhan Test',
      tcNo: '99988877766',
      department: 'Yazılım',
      phone: '05329998877',
      email: 'gokhan.test@firma.com',
    },
  });
  console.log(`✅ [CREATE] Yeni Personel Eklendi: ID=${newEmp.id}, Ad=${newEmp.fullName}`);

  // 2. READ
  const fetchedEmp = await prisma.employee.findUnique({
    where: { id: newEmp.id },
  });
  console.log(`✅ [READ] Personel Geri Okundu: ID=${fetchedEmp.id}, TC=${fetchedEmp.tcNo}, Dept=${fetchedEmp.department}`);

  // 3. DELETE
  await prisma.employee.delete({
    where: { id: newEmp.id },
  });
  console.log(`✅ [DELETE] Personel Başarıyla Silindi.`);

  const checkDeleted = await prisma.employee.findUnique({ where: { id: newEmp.id } });
  if (!checkDeleted) {
    console.log(`✅ [VERIFY DELETE] Personelin silindiği teyit edildi.`);
  }

  console.log('\n========================================\n');
}

testCrud()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
