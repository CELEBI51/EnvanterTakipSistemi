import { PrismaClient } from '@prisma/client';
import app from './src/app.js';
import { checkLicenseExpirations } from './src/jobs/licenseExpiry.job.js';

const prisma = new PrismaClient();

async function runLicenseStatusFlowTests() {
  console.log('=== RUNNING LICENSE STATUS & RENEWAL FLOW TESTS ===\n');

  const server = app.listen(5007);
  const baseUrl = 'http://localhost:5007/api';

  try {
    // 1. Authenticate Admin User
    const adminLoginRes = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@firma.com', password: 'admin123' }),
    });
    const adminLoginJson = await adminLoginRes.json();
    const adminToken = adminLoginJson.data.accessToken;

    const adminHeaders = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    };

    const unit = await prisma.unit.findFirst();
    if (!unit) throw new Error('No Unit found for test!');

    // TEST 1: POST /api/licenses -> Automatically assigns status: "AKTIF"
    console.log('[TEST 1] Creating new license (POST /api/licenses)...');
    const licenseBody = {
      unitId: unit.id,
      brand: 'Docker',
      productInfo: 'Docker Desktop Enterprise',
      licenseKey: 'DCK-2026-KEY-888',
      startDate: new Date().toISOString(),
      endDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(),
      paymentType: 'KREDI_KARTI',
      status: 'YENILENMEDI', // Should be IGNORED by backend!
      invoiceNumber: 'INV-DCK-10',
      invoiceAmount: 3200.00,
    };

    const createRes = await fetch(`${baseUrl}/licenses`, {
      method: 'POST',
      headers: adminHeaders,
      body: JSON.stringify(licenseBody),
    });
    const createJson = await createRes.json();
    console.log(' -> Create Status:', createRes.status);
    console.log(' -> Assigned Status:', createJson.data?.status);

    if (createRes.status !== 201 || createJson.data?.status !== 'AKTIF') {
      throw new Error(`Expected automatic status 'AKTIF', got '${createJson.data?.status}'`);
    }

    const testLicId1 = createJson.data.id;

    // TEST 2: PATCH status with invalid enum (e.g. YENILENMEDI) -> 400 Bad Request
    console.log('\n[TEST 2] PATCH status with invalid enum (YENILENMEDI -> 400)...');
    const patchInvalidEnumRes = await fetch(`${baseUrl}/licenses/${testLicId1}/status`, {
      method: 'PATCH',
      headers: adminHeaders,
      body: JSON.stringify({ status: 'YENILENMEDI' }),
    });
    const patchInvalidEnumJson = await patchInvalidEnumRes.json();
    console.log(' -> Response Status:', patchInvalidEnumRes.status);
    console.log(' -> Message:', patchInvalidEnumJson.message);

    if (patchInvalidEnumRes.status !== 400) {
      throw new Error('PATCH status with YENILENMEDI should return 400 Bad Request!');
    }

    // TEST 3: PATCH status with YENILENDI without newEndDate -> 400 Bad Request
    console.log('\n[TEST 3] PATCH status: YENILENDI without newEndDate -> 400 Bad Request...');
    const patchMissingDateRes = await fetch(`${baseUrl}/licenses/${testLicId1}/status`, {
      method: 'PATCH',
      headers: adminHeaders,
      body: JSON.stringify({ status: 'YENILENDI' }),
    });
    const patchMissingDateJson = await patchMissingDateRes.json();
    console.log(' -> Response Status:', patchMissingDateRes.status);
    console.log(' -> Message:', patchMissingDateJson.message);

    if (patchMissingDateRes.status !== 400) {
      throw new Error('PATCH status YENILENDI without newEndDate should return 400!');
    }

    // TEST 4: PATCH status YENILENDI with valid newEndDate -> 200 OK & endDate updated
    console.log('\n[TEST 4] PATCH status YENILENDI with valid newEndDate...');
    const futureDate = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();
    const patchRenewRes = await fetch(`${baseUrl}/licenses/${testLicId1}/status`, {
      method: 'PATCH',
      headers: adminHeaders,
      body: JSON.stringify({ status: 'YENILENDI', newEndDate: futureDate }),
    });
    const patchRenewJson = await patchRenewRes.json();
    console.log(' -> Renew Response Status:', patchRenewRes.status);
    console.log(' -> Updated Status:', patchRenewJson.data?.status);
    console.log(' -> Updated End Date:', patchRenewJson.data?.endDate);

    if (patchRenewRes.status !== 200 || patchRenewJson.data?.status !== 'YENILENDI') {
      throw new Error('PATCH status YENILENDI failed!');
    }

    // TEST 5: Attempt subsequent status update on locked YENILENDI license -> 400 Bad Request
    console.log('\n[TEST 5] Subsequent status update on locked YENILENDI license -> 400 Bad Request...');
    const patchLockedRes = await fetch(`${baseUrl}/licenses/${testLicId1}/status`, {
      method: 'PATCH',
      headers: adminHeaders,
      body: JSON.stringify({ status: 'IPTAL_EDILDI' }),
    });
    const patchLockedJson = await patchLockedRes.json();
    console.log(' -> Response Status:', patchLockedRes.status);
    console.log(' -> Message:', patchLockedJson.message);

    if (patchLockedRes.status !== 400) {
      throw new Error('Subsequent update on locked YENILENDI license should return 400!');
    }

    // TEST 6: Create second AKTIF license and cancel (IPTAL_EDILDI)
    console.log('\n[TEST 6] Create second license and cancel (IPTAL_EDILDI)...');
    const createRes2 = await fetch(`${baseUrl}/licenses`, {
      method: 'POST',
      headers: adminHeaders,
      body: JSON.stringify({
        ...licenseBody,
        brand: 'Figma',
        productInfo: 'Figma Organization Plan',
      }),
    });
    const createJson2 = await createRes2.json();
    const testLicId2 = createJson2.data.id;

    const patchCancelRes = await fetch(`${baseUrl}/licenses/${testLicId2}/status`, {
      method: 'PATCH',
      headers: adminHeaders,
      body: JSON.stringify({ status: 'IPTAL_EDILDI' }),
    });
    const patchCancelJson = await patchCancelRes.json();
    console.log(' -> Cancel Status:', patchCancelRes.status);
    console.log(' -> Updated Status:', patchCancelJson.data?.status);

    if (patchCancelRes.status !== 200 || patchCancelJson.data?.status !== 'IPTAL_EDILDI') {
      throw new Error('PATCH status IPTAL_EDILDI failed!');
    }

    // TEST 7: Cron job trigger check
    console.log('\n[TEST 7] Testing Cron Expiry job calculation...');
    const notifications = await checkLicenseExpirations();
    console.log(' -> Cron run completed cleanly. Generated notifications:', notifications.length);

    // Clean up test records
    await prisma.license.delete({ where: { id: testLicId1 } });
    await prisma.license.delete({ where: { id: testLicId2 } });

    console.log('\n=== ALL LICENSE STATUS & RENEWAL TESTS PASSED 100% ===');
  } catch (err) {
    console.error('\n[LICENSE STATUS TEST ERROR]', err);
    process.exitCode = 1;
  } finally {
    server.close();
    await prisma.$disconnect();
  }
}

runLicenseStatusFlowTests();
