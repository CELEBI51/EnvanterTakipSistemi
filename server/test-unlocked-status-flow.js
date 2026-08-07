import { PrismaClient } from '@prisma/client';
import app from './src/app.js';
import { checkLicenseExpirations } from './src/jobs/licenseExpiry.job.js';

const prisma = new PrismaClient();

async function runUnlockedStatusFlowTests() {
  console.log('=== RUNNING UNLOCKED LICENSE STATUS TRANSITION TESTS ===\n');

  const server = app.listen(5008);
  const baseUrl = 'http://localhost:5008/api';

  try {
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

    // TEST 1: Create AKTIF License
    console.log('[TEST 1] Creating new license (status: AKTIF)...');
    const createRes = await fetch(`${baseUrl}/licenses`, {
      method: 'POST',
      headers: adminHeaders,
      body: JSON.stringify({
        unitId: unit.id,
        brand: 'Slack',
        productInfo: 'Slack Enterprise Grid',
        startDate: new Date().toISOString(),
        endDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(),
        paymentType: 'KREDI_KARTI',
      }),
    });
    const createJson = await createRes.json();
    console.log(' -> Create Status:', createRes.status);
    console.log(' -> Initial Status:', createJson.data?.status);
    const licId = createJson.data.id;

    if (createJson.data?.status !== 'AKTIF') throw new Error('Initial status should be AKTIF');

    // TEST 2: AKTIF -> YENILENDI (Date 1)
    console.log('\n[TEST 2] Transition 1: AKTIF -> YENILENDI (Date 1)...');
    const date1 = new Date(Date.now() + 100 * 24 * 60 * 60 * 1000).toISOString();
    const res1 = await fetch(`${baseUrl}/licenses/${licId}/status`, {
      method: 'PATCH',
      headers: adminHeaders,
      body: JSON.stringify({ status: 'YENILENDI', newEndDate: date1 }),
    });
    const json1 = await res1.json();
    console.log(' -> Status:', res1.status, '| New Status:', json1.data?.status);
    if (json1.data?.status !== 'YENILENDI') throw new Error('Failed transition 1 to YENILENDI');

    // TEST 3: YENILENDI -> YENILENDI (Repeat Renewal Date 2)
    console.log('\n[TEST 3] Transition 2: YENILENDI -> YENILENDI (Repeat Renewal Date 2)...');
    const date2 = new Date(Date.now() + 400 * 24 * 60 * 60 * 1000).toISOString();
    const res2 = await fetch(`${baseUrl}/licenses/${licId}/status`, {
      method: 'PATCH',
      headers: adminHeaders,
      body: JSON.stringify({ status: 'YENILENDI', newEndDate: date2 }),
    });
    const json2 = await res2.json();
    console.log(' -> Status:', res2.status, '| New Status:', json2.data?.status);
    console.log(' -> Updated EndDate:', json2.data?.endDate);
    if (json2.data?.status !== 'YENILENDI') throw new Error('Failed repeat transition 2 to YENILENDI');

    // TEST 4: YENILENDI -> IPTAL_EDILDI
    console.log('\n[TEST 4] Transition 3: YENILENDI -> IPTAL_EDILDI...');
    const res3 = await fetch(`${baseUrl}/licenses/${licId}/status`, {
      method: 'PATCH',
      headers: adminHeaders,
      body: JSON.stringify({ status: 'IPTAL_EDILDI' }),
    });
    const json3 = await res3.json();
    console.log(' -> Status:', res3.status, '| New Status:', json3.data?.status);
    if (json3.data?.status !== 'IPTAL_EDILDI') throw new Error('Failed transition 3 to IPTAL_EDILDI');

    // TEST 5: IPTAL_EDILDI -> YENILENDI (Re-activate/Renew Canceled License)
    console.log('\n[TEST 5] Transition 4: IPTAL_EDILDI -> YENILENDI (Renew Canceled License)...');
    const date3 = new Date(Date.now() + 500 * 24 * 60 * 60 * 1000).toISOString();
    const res4 = await fetch(`${baseUrl}/licenses/${licId}/status`, {
      method: 'PATCH',
      headers: adminHeaders,
      body: JSON.stringify({ status: 'YENILENDI', newEndDate: date3 }),
    });
    const json4 = await res4.json();
    console.log(' -> Status:', res4.status, '| New Status:', json4.data?.status);
    if (json4.data?.status !== 'YENILENDI') throw new Error('Failed transition 4 from IPTAL_EDILDI to YENILENDI');

    // TEST 6: Cron job trigger verify
    console.log('\n[TEST 6] Testing Cron Expiry Job calculation...');
    const notifs = await checkLicenseExpirations();
    console.log(' -> Cron run completed. Total notifications:', notifs.length);

    // Cleanup
    await prisma.license.delete({ where: { id: licId } });

    console.log('\n=== ALL UNLOCKED STATUS TRANSITION TESTS PASSED 100% ===');
  } catch (err) {
    console.error('\n[UNLOCKED STATUS TEST ERROR]', err);
    process.exitCode = 1;
  } finally {
    server.close();
    await prisma.$disconnect();
  }
}

runUnlockedStatusFlowTests();
