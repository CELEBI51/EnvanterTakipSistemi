import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  // Foreign key bağımlılık sırasına göre silme
  await prisma.returnAccessoryItem.deleteMany({});
  console.log('✓ returnAccessoryItem silindi');
  await prisma.returnItem.deleteMany({});
  console.log('✓ returnItem silindi');
  await prisma.return.deleteMany({});
  console.log('✓ return (zimmet iade) silindi');

  await prisma.assignmentConsumableItem.deleteMany({});
  console.log('✓ assignmentConsumableItem silindi');
  await prisma.assignmentAccessoryItem.deleteMany({});
  console.log('✓ assignmentAccessoryItem silindi');
  await prisma.assignmentItem.deleteMany({});
  console.log('✓ assignmentItem silindi');
  await prisma.assignment.deleteMany({});
  console.log('✓ assignment (zimmetleme) silindi');

  await prisma.maintenanceComponent.deleteMany({});
  console.log('✓ maintenanceComponent silindi');
  await prisma.maintenanceRecord.deleteMany({});
  console.log('✓ maintenanceRecord silindi');

  await prisma.attachment.deleteMany({});
  console.log('✓ attachment silindi');

  await prisma.hardware.deleteMany({});
  console.log('✓ hardware (varlık) silindi');

  await prisma.stockMovement.deleteMany({});
  console.log('✓ stockMovement silindi');
  await prisma.component.deleteMany({});
  console.log('✓ component (bileşen) silindi');

  await prisma.license.deleteMany({});
  console.log('✓ license (lisans) silindi');

  await prisma.consumable.deleteMany({});
  console.log('✓ consumable (sarf malzeme) silindi');

  await prisma.accessory.deleteMany({});
  console.log('✓ accessory (aksesuar) silindi');

  await prisma.notification.deleteMany({});
  console.log('✓ notification silindi');

  await prisma.employee.deleteMany({});
  console.log('✓ employee (personel) silindi');

  console.log('\n--- TAMAMLANDI: Tüm operasyonel veriler temizlendi ---');
  console.log('Korunan veriler: Kullanıcılar, Kategoriler, Birimler');
}

main()
  .catch((e) => console.error(e))
  .finally(() => prisma.$disconnect());
