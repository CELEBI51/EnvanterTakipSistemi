import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '.env') });

import prisma from './src/config/db.js';
import { markDefective } from './src/modules/accessories/accessories.service.js';
import { issueConsumable } from './src/modules/consumables/consumable.service.js';

async function testInstantCriticalStock() {
  console.log('=============== ANLIK KRİTİK STOK TESTİ ===============\n');

  const adminUser = await prisma.user.findFirst({ where: { role: 'admin' } });
  
  // 1. Aksesuar için test (Stok 6 -> 4 düşürülüyor, 4 <= 5 olduğu için anında mail tetiklenecek)
  const category = await prisma.category.findFirst({ where: { parentType: 'AKSESUAR' } });
  const categoryId = category ? category.id : (await prisma.category.create({ data: { name: 'Aksesuar Test Kat', parentType: 'AKSESUAR' } })).id;

  const testAcc = await prisma.accessory.create({
    data: {
      name: `Anlık Mail Test Aksesuar ${Date.now()}`,
      category: { connect: { id: categoryId } },
      createdBy: { connect: { id: adminUser.id } },
      totalQuantity: 10,
      availableQuantity: 6,
      assignedQuantity: 4,
    },
  });

  console.log(`[Test Prep] Mevcut stoğu 6 olan aksesuar oluşturuldu (ID: ${testAcc.id})`);
  console.log('Aksesuar için 2 adet arızalı/düşüm yapılıyor (Yeni stok: 4, Eşik <= 5)...');

  await markDefective(testAcc.id, { quantity: 2, note: 'Anlık mail testi' }, adminUser.id);
  console.log('✅ Aksesuar anlık kritik stok mail bildirimi tetiklendi!\n');

  // 2. Sarf Malzeme için test (Stok 7 -> 3 düşürülüyor, 3 <= 5 olduğu için anında mail tetiklenecek)
  const conCategory = await prisma.category.findFirst({ where: { parentType: 'SARF_MALZEME' } });
  const conCategoryId = conCategory ? conCategory.id : (await prisma.category.create({ data: { name: 'Sarf Test Kat', parentType: 'SARF_MALZEME' } })).id;

  const testCon = await prisma.consumable.create({
    data: {
      name: `Anlık Mail Test Sarf ${Date.now()}`,
      category: { connect: { id: conCategoryId } },
      createdBy: { connect: { id: adminUser.id } },
      totalQuantity: 10,
      availableQuantity: 7,
      consumedQuantity: 3,
    },
  });

  console.log(`[Test Prep] Mevcut stoğu 7 olan sarf malzeme oluşturuldu (ID: ${testCon.id})`);
  console.log('Sarf malzeme için 4 adet düşüm yapılıyor (Yeni stok: 3, Eşik <= 5)...');

  await issueConsumable(testCon.id, { quantity: 4, note: 'Anlık mail testi' }, adminUser.id);
  console.log('✅ Sarf malzeme anlık kritik stok mail bildirimi tetiklendi!\n');

  // Temizlik
  await prisma.stockMovement.deleteMany({ where: { entityId: { in: [testAcc.id, testCon.id] } } });
  await prisma.accessory.delete({ where: { id: testAcc.id } });
  await prisma.consumable.delete({ where: { id: testCon.id } });

  console.log('================ INSTANT TEST FINISHED ================');
  process.exit(0);
}

testInstantCriticalStock().catch((err) => {
  console.error('Test hatası:', err);
  process.exit(1);
});
