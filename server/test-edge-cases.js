import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '.env') });

import prisma from './src/config/db.js';
import { createAssignment } from './src/modules/assignments/assignments.service.js';

async function runEdgeCases() {
  console.log('=============== E-POSTA EDGE CASE & FAULT TOLERANCE TEST ===============\n');

  const adminUser = await prisma.user.findFirst({ where: { role: 'admin' } });
  const category = await prisma.category.findFirst({ where: { parentType: 'AKSESUAR' } });
  const categoryId = category ? category.id : (await prisma.category.create({ data: { name: 'Aksesuar Test Kat', parentType: 'AKSESUAR' } })).id;
  const hwCategory = await prisma.category.findFirst({ where: { parentType: 'VARLIK' } });
  const hwCategoryId = hwCategory ? hwCategory.id : (await prisma.category.create({ data: { name: 'Varlık Test Kat', parentType: 'VARLIK' } })).id;

  let employee = await prisma.employee.findFirst();
  if (!employee) {
    employee = await prisma.employee.create({
      data: { fullName: 'Test Edge Personel', tcNo: '22222222222' },
    });
  }

  const originalEmail = adminUser.email;
  // Admin emailini geçici olarak benzersiz boş alan kabul edilecek dizeye güncelle
  await prisma.user.update({
    where: { id: adminUser.id },
    data: { email: `temp_no_email_${Date.now()}@test.local` },
  });



  const hw1 = await prisma.hardware.create({
    data: {
      brand: 'HP Test Laptop',
      model: 'EliteBook',
      serialNo: `SN-EDGE1-${Date.now()}`,
      demirbasNo: `DEM-EDGE1-${Date.now()}`,
      category: { connect: { id: hwCategoryId } },
      createdBy: { connect: { id: adminUser.id } },
      status: 'Hazir',
    },
  });

  const assignment1 = await createAssignment({
    employeeId: employee.id,
    teslimTarihi: new Date().toISOString(),
    hardwareItems: [{ hardwareId: hw1.id }],
  }, adminUser);

  console.log(`[Senaryo 1 Başarılı] Email olmamasına rağmen Zimmet Oluştu (ID: ${assignment1.id})\n`);

  // Admin emailini geri yükle
  if (originalEmail) {
    await prisma.user.update({
      where: { id: adminUser.id },
      data: { email: originalEmail },
    });
  }



  // --- SENARYO 2: SMTP Portu / Bağlantısı Kapalıyken (Fault Tolerance) ---
  console.log('--- SENARYO 2: SMTP Portu geçersiz kılınarak mail hatası simüle ediliyor ---');
  const originalPort = process.env.SMTP_PORT;
  process.env.SMTP_PORT = '9999'; // Geçersiz port

  const hw2 = await prisma.hardware.create({
    data: {
      brand: 'Lenovo Test Laptop',
      model: 'ThinkPad',
      serialNo: `SN-EDGE2-${Date.now()}`,
      demirbasNo: `DEM-EDGE2-${Date.now()}`,
      category: { connect: { id: hwCategoryId } },
      createdBy: { connect: { id: adminUser.id } },
      status: 'Hazir',
    },
  });

  const assignment2 = await createAssignment({
    employeeId: employee.id,
    teslimTarihi: new Date().toISOString(),
    hardwareItems: [{ hardwareId: hw2.id }],
  }, adminUser);

  console.log(`[Senaryo 2 Başarılı] SMTP Çökmesine rağmen Zimmet Sorunsuz Oluştu (ID: ${assignment2.id})\n`);

  process.env.SMTP_PORT = originalPort;

  // Temizlik
  await prisma.assignmentItem.deleteMany({ where: { assignmentId: { in: [assignment1.id, assignment2.id] } } });
  await prisma.assignment.deleteMany({ where: { id: { in: [assignment1.id, assignment2.id] } } });
  await prisma.hardware.deleteMany({ where: { id: { in: [hw1.id, hw2.id] } } });

  console.log('================ EDGE CASE TESTS FINISHED SUCCESSFULLY ================');
  process.exit(0);
}

runEdgeCases().catch((err) => {
  console.error('Edge case hatası:', err);
  process.exit(1);
});
