import { PrismaClient } from '@prisma/client';
import app from './src/app.js';
import { CRITICAL_STOCK_THRESHOLD } from './src/config/constants.js';

const prisma = new PrismaClient();

async function runNotificationsSummaryTests() {
  console.log('=== RUNNING NOTIFICATIONS SUMMARY API TESTS ===\n');

  const server = app.listen(5015);
  const baseUrl = 'http://localhost:5015/api';

  try {
    // Auth login
    const adminLoginRes = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@firma.com', password: 'admin123' }),
    });
    const adminLoginJson = await adminLoginRes.json();
    const adminToken = adminLoginJson.data.accessToken;
    const headers = { Authorization: `Bearer ${adminToken}` };

    // Get default category & user for seeding test items
    const adminUser = await prisma.user.findFirst();
    const category = await prisma.category.findFirst();

    // --- SETUP TEST DATA FOR BOUNDARY TESTING ---
    console.log('[SETUP] Creating boundary test items in Database...');

    // 1. Accessory with availableQuantity = 6 (Should NOT be included in critical list)
    const acc6 = await prisma.accessory.create({
      data: {
        name: 'TEST-ACC-BORDER-6',
        categoryId: category.id,
        totalQuantity: 6,
        availableQuantity: 6,
        createdById: adminUser.id,
      },
    });

    // 2. Accessory with availableQuantity = 5 (SHOULD be included in critical list)
    const acc5 = await prisma.accessory.create({
      data: {
        name: 'TEST-ACC-BORDER-5',
        categoryId: category.id,
        totalQuantity: 5,
        availableQuantity: 5,
        createdById: adminUser.id,
      },
    });

    // 3. Consumable with availableQuantity = 6 (Should NOT be included)
    const con6 = await prisma.consumable.create({
      data: {
        name: 'TEST-CON-BORDER-6',
        categoryId: category.id,
        totalQuantity: 6,
        availableQuantity: 6,
        createdById: adminUser.id,
      },
    });

    // 4. Consumable with availableQuantity = 5 (SHOULD be included)
    const con5 = await prisma.consumable.create({
      data: {
        name: 'TEST-CON-BORDER-5',
        categoryId: category.id,
        totalQuantity: 5,
        availableQuantity: 5,
        createdById: adminUser.id,
      },
    });

    // 5. Expiring License (10 days left)
    const unit = await prisma.unit.findFirst();
    const licExpiring = await prisma.license.create({
      data: {
        brand: 'TestBrandNotif',
        productInfo: 'TestProductNotif',
        licenseKey: 'KEY-NOTIF-TEST',
        unitId: unit.id,
        paymentType: 'KREDI_KARTI',
        startDate: new Date(),
        endDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000), // 10 days from now
        status: 'AKTIF',
        createdById: adminUser.id,
      },
    });

    // --- TEST 1: GET /api/notifications/summary HTTP request ---
    console.log('\n[TEST 1] Calling GET /api/notifications/summary HTTP Endpoint...');
    const notifRes = await fetch(`${baseUrl}/notifications/summary`, { headers });
    const notifJson = await notifRes.json();
    console.log(' -> Status Code:', notifRes.status);
    console.log(' -> Response Data Structure:', {
      expiringLicensesTotal: notifJson.data?.expiringLicenses?.totalCount,
      criticalAccessoriesTotal: notifJson.data?.criticalAccessories?.totalCount,
      criticalConsumablesTotal: notifJson.data?.criticalConsumables?.totalCount,
      totalUnread: notifJson.data?.totalUnread,
    });

    if (notifRes.status !== 200 || !notifJson.success) {
      throw new Error('GET /api/notifications/summary failed!');
    }

    // --- TEST 2: Boundary Value Verification (5 vs 6) ---
    console.log('\n[TEST 2] Verifying Boundary Values (availableQuantity 5 included, 6 excluded)...');
    const accItems = notifJson.data.criticalAccessories.items;
    const conItems = notifJson.data.criticalConsumables.items;

    const containsAcc5 = accItems.some((item) => item.id === acc5.id);
    const containsAcc6 = accItems.some((item) => item.id === acc6.id);

    const containsCon5 = conItems.some((item) => item.id === con5.id);
    const containsCon6 = conItems.some((item) => item.id === con6.id);

    console.log(` -> Accessory (5) included: ${containsAcc5} (EXPECTED: true)`);
    console.log(` -> Accessory (6) included: ${containsAcc6} (EXPECTED: false)`);
    console.log(` -> Consumable (5) included: ${containsCon5} (EXPECTED: true)`);
    console.log(` -> Consumable (6) included: ${containsCon6} (EXPECTED: false)`);

    if (!containsAcc5 || containsAcc6 || !containsCon5 || containsCon6) {
      throw new Error('Boundary condition test failed! 5 must be included, 6 must be excluded.');
    }

    // --- TEST 3: Expiring License Verification ---
    console.log('\n[TEST 3] Verifying Expiring License in Notification Summary...');
    const licItems = notifJson.data.expiringLicenses.items;
    const containsLic = licItems.some((item) => item.id === licExpiring.id);
    console.log(` -> Expiring License included: ${containsLic} (EXPECTED: true)`);
    if (!containsLic) {
      throw new Error('Expiring license test failed!');
    }

    // --- TEST 4: TotalCount and items array length consistency ---
    console.log('\n[TEST 4] Verifying TotalCount and array length consistency...');
    if (
      accItems.length > 10 ||
      conItems.length > 10 ||
      licItems.length > 10 ||
      notifJson.data.expiringLicenses.totalCount < licItems.length ||
      notifJson.data.criticalAccessories.totalCount < accItems.length ||
      notifJson.data.criticalConsumables.totalCount < conItems.length
    ) {
      throw new Error('Total count & items length consistency check failed!');
    }
    console.log(' -> Array limits (max 10) and totalCounts are consistent.');

    // --- TEST 5: Central constant verification ---
    console.log('\n[TEST 5] Verifying CRITICAL_STOCK_THRESHOLD constant value...');
    console.log(` -> CRITICAL_STOCK_THRESHOLD = ${CRITICAL_STOCK_THRESHOLD}`);
    if (CRITICAL_STOCK_THRESHOLD !== 5) {
      throw new Error('Central constant CRITICAL_STOCK_THRESHOLD is not equal to 5!');
    }

    // --- CLEANUP TEST DATA ---
    console.log('\n[CLEANUP] Removing test boundary records from Database...');
    await prisma.accessory.deleteMany({ where: { id: { in: [acc5.id, acc6.id] } } });
    await prisma.consumable.deleteMany({ where: { id: { in: [con5.id, con6.id] } } });
    await prisma.license.delete({ where: { id: licExpiring.id } });

    console.log('\n=== ALL NOTIFICATIONS SUMMARY TESTS PASSED 100% ===');
  } catch (err) {
    console.error('\n[NOTIFICATIONS SUMMARY TEST ERROR]', err);
    process.exitCode = 1;
  } finally {
    server.close();
    await prisma.$disconnect();
  }
}

runNotificationsSummaryTests();
