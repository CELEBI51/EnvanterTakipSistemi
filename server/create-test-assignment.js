import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function run() {
  const emp = await prisma.employee.findFirst({ where: { fullName: 'Ahmet Yılmaz' } });
  const admin = await prisma.user.findFirst({ where: { role: 'admin' } });
  const hw1 = await prisma.hardware.findFirst({ where: { demirbasNo: 'DM-2024-001' } });
  const hw2 = await prisma.hardware.findFirst({ where: { demirbasNo: 'DM-2024-002' } });

  await prisma.hardware.update({ where: { id: hw1.id }, data: { status: 'Hazir' } });
  await prisma.hardware.update({ where: { id: hw2.id }, data: { status: 'Hazir' } });

  const assign = await prisma.assignment.create({
    data: {
      teslimEden: 'Muhammet IT',
      employeeId: emp.id,
      teslimTarihi: new Date(),
      createdById: admin.id,
      items: {
        create: [
          { hardwareId: hw1.id },
          { hardwareId: hw2.id }
        ]
      }
    }
  });

  await prisma.hardware.update({ where: { id: hw1.id }, data: { status: 'Kullanimda' } });
  await prisma.hardware.update({ where: { id: hw2.id }, data: { status: 'Kullanimda' } });

  console.log('CREATED_ASSIGNMENT_ID:', assign.id);
}

run().finally(() => prisma.$disconnect());
