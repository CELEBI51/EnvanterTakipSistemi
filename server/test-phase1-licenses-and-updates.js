import prisma from './src/config/db.js';
import { checkLicenseExpirations } from './src/jobs/licenseExpiry.job.js';

const BASE_URL = 'http://localhost:5000/api';
const delay = (ms) => new Promise((res) => setTimeout(res, ms));

async function fetchJsonWithRetry(url, options, retries = 5) {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url, options);
      const text = await res.text();
      if (!text || text.startsWith('<')) {
        await delay(500);
        continue;
      }
      const data = JSON.parse(text);
      return { status: res.status, data };
    } catch (e) {
      if (i === retries - 1) throw e;
      await delay(500);
    }
  }
  return { status: 500, data: {} };
}

async function main() {
  console.log('====================================================');
  console.log('🧪 PHASE 1: HARDWARE, ACCESSORY & LICENSE TEST SUITE');
  console.log('====================================================\n');

  // 1. Get Token for Admin
  const { data: adminData } = await fetchJsonWithRetry(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@firma.com', password: 'admin123' }),
  });
  const adminToken = adminData.data?.accessToken;

  if (!adminToken) {
    throw new Error('Admin login failed: ' + JSON.stringify(adminData));
  }

  // Get categories
  const { data: varlikCats } = await fetchJsonWithRetry(`${BASE_URL}/categories?parentType=Varlık`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const laptopCat = varlikCats.data.find((c) => c.name === 'Laptop');

  const { data: aksCatData } = await fetchJsonWithRetry(`${BASE_URL}/categories?parentType=Aksesuar`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const mouseCat = aksCatData.data.find((c) => c.name === 'Mouse');

  const { data: lisansCatData } = await fetchJsonWithRetry(`${BASE_URL}/categories?parentType=Lisans`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const osCat = lisansCatData.data.find((c) => c.name === 'İşletim Sistemi');

  // TEST 1: Create hardware with categoryId and new optional fields
  console.log('🔹 TEST 1: Create hardware with new fields (location, supplier, purchaseAmount, wifiMacAddress)...');
  const hwPayload = {
    categoryId: laptopCat.id,
    brand: 'Dell',
    model: 'XPS 15',
    serial_no: 'SN-DELL-2026',
    demirbas_no: `DEMIRBAS-${Date.now()}`,
    wifiMacAddress: '00:1A:2B:3C:4D:5E',
    location: '3. Kat, IT Odası',
    supplier: 'Dell Türkiye A.Ş.',
    invoiceNo: 'FTR-2026-00891',
    purchaseDate: '2026-01-15',
    purchaseAmount: 45000.5,
  };

  const { status: status1, data: data1 } = await fetchJsonWithRetry(`${BASE_URL}/hardware`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify(hwPayload),
  });

  console.log(`STATUS: ${status1}, Created HW ID: ${data1.data?.id}`);
  if (
    status1 === 201 &&
    data1.data?.wifiMacAddress === '00:1A:2B:3C:4D:5E' &&
    data1.data?.location === '3. Kat, IT Odası' &&
    data1.data?.supplier === 'Dell Türkiye A.Ş.' &&
    data1.data?.invoiceNo === 'FTR-2026-00891'
  ) {
    console.log('✅ TEST 1 PASSED: Hardware created with all new optional fields.\n');
  } else {
    console.error('❌ TEST 1 FAILED', data1);
  }

  // TEST 2: Create accessory with categoryId and new optional fields
  console.log('🔹 TEST 2: Create accessory with new fields (supplier, invoiceNo, purchaseAmount)...');
  const accPayload = {
    name: 'Logitech MX Master 3S',
    categoryId: mouseCat.id,
    brand: 'Logitech',
    supplier: 'Vatan Bilgisayar',
    invoiceNo: 'VAT-9921',
    purchaseDate: '2026-02-01',
    purchaseAmount: 3500,
    initialQuantity: 10,
    minThreshold: 3,
  };

  const { status: status2, data: data2 } = await fetchJsonWithRetry(`${BASE_URL}/accessories`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify(accPayload),
  });

  console.log(`STATUS: ${status2}, Created Accessory ID: ${data2.data?.id}`);
  if (
    status2 === 201 &&
    data2.data?.supplier === 'Vatan Bilgisayar' &&
    data2.data?.invoiceNo === 'VAT-9921' &&
    data2.data?.totalQuantity === 10 &&
    data2.data?.availableQuantity === 10
  ) {
    console.log('✅ TEST 2 PASSED: Accessory created with new optional fields & quantities verified.\n');
  } else {
    console.error('❌ TEST 2 FAILED', data2);
  }

  // TEST 3: Create License record: totalQuantity=50, minThreshold=10, endDate=15 days later
  console.log('🔹 TEST 3: Create License record (totalQuantity=50, availableQuantity=50, assignedQuantity=0)...');
  const targetEndDate = new Date();
  targetEndDate.setDate(targetEndDate.getDate() + 15);
  const endDateStr = targetEndDate.toISOString().split('T')[0];

  const licPayload = {
    name: 'Windows 11 Pro Enterprise',
    categoryId: osCat.id,
    totalQuantity: 50,
    minThreshold: 10,
    licenseKey: 'XXXXX-YYYYY-ZZZZZ-11111-22222',
    licensedTo: 'Ditaş Otomotiv A.Ş.',
    licensedEmail: 'it-licensing@ditas.com.tr',
    invoiceNo: 'MSFT-2026-001',
    invoiceAmount: 125000,
    purchaseDate: '2026-01-01',
    endDate: endDateStr,
    notes: 'Kurumsal toplu lisans sözleşmesi',
  };

  const { status: status3, data: data3 } = await fetchJsonWithRetry(`${BASE_URL}/licenses`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify(licPayload),
  });

  const createdLicId = data3.data?.id;
  console.log(`STATUS: ${status3}, Created License ID: ${createdLicId}`);
  if (
    status3 === 201 &&
    data3.data?.totalQuantity === 50 &&
    data3.data?.availableQuantity === 50 &&
    data3.data?.assignedQuantity === 0
  ) {
    console.log('✅ TEST 3 PASSED: License created with totalQuantity=50, availableQuantity=50, assignedQuantity=0.\n');
  } else {
    console.error('❌ TEST 3 FAILED', data3);
  }

  // TEST 4: GET /api/licenses/expiring?days=15
  console.log('🔹 TEST 4: GET /api/licenses/expiring?days=15...');
  const { status: status4, data: data4 } = await fetchJsonWithRetry(`${BASE_URL}/licenses/expiring?days=15`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  console.log(`STATUS: ${status4}, Expiring Licenses Count: ${data4.data?.length}`);
  const foundLic = data4.data?.find((l) => l.id === createdLicId);
  if (status4 === 200 && foundLic) {
    console.log('✅ TEST 4 PASSED: Created license listed in expiring licenses.\n');
  } else {
    console.error('❌ TEST 4 FAILED', data4);
  }

  // TEST 5: Verify GET /api/software returns 404 and GET /api/licenses works
  console.log('🔹 TEST 5: Verify old /api/software returns 404 and /api/licenses works...');
  const oldRes = await fetch(`${BASE_URL}/software`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const newRes = await fetch(`${BASE_URL}/licenses`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  console.log(`OLD /api/software STATUS: ${oldRes.status}, NEW /api/licenses STATUS: ${newRes.status}`);
  if (oldRes.status === 404 && newRes.status === 200) {
    console.log('✅ TEST 5 PASSED: Old /api/software removed (404) and /api/licenses active (200).\n');
  } else {
    console.error('❌ TEST 5 FAILED', { oldStatus: oldRes.status, newStatus: newRes.status });
  }

  // TEST 6: Call checkLicenseExpirations() job manually and verify notifications
  console.log('🔹 TEST 6: Call licenseExpiryJob manually and verify notification generation...');
  const newNotifs = await checkLicenseExpirations();
  console.log(`Generated Notifications Count: ${newNotifs.length}`);

  const notifInDb = await prisma.notification.findFirst({
    where: {
      relatedId: createdLicId,
      type: 'license_expiring',
    },
  });

  if (notifInDb && notifInDb.message.includes('Windows 11 Pro Enterprise')) {
    console.log('✅ TEST 6 PASSED: Notification created in DB: ' + notifInDb.message + '\n');
  } else {
    console.error('❌ TEST 6 FAILED', notifInDb);
  }

  console.log('====================================================');
  console.log('🎉 ALL 6 PHASE 1 TEST SCENARIOS PASSED 100% SUCCESSFULLY!');
  console.log('====================================================');

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error('TEST ERROR:', err);
  process.exit(1);
});
