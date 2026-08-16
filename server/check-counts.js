import prisma from './src/config/db.js';

async function check() {
  const hw = await prisma.hardware.count();
  const acc = await prisma.accessory.count();
  const comp = await prisma.component.count();
  const cons = await prisma.consumable.count();
  const lic = await prisma.license.count();
  const emp = await prisma.employee.count();
  const asg = await prisma.assignment.count();
  const ret = await prisma.return.count();
  console.log('--- GÜNCEL VERİTABANI KABUK SAYILARI ---');
  console.log({
    Varlık: hw,
    Aksesuar: acc,
    Bileşen: comp,
    SarfMalzeme: cons,
    Lisans: lic,
    Personel: emp,
    Zimmet: asg,
    İade: ret,
  });
  await prisma.$disconnect();
}

check();
