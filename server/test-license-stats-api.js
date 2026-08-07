import { PrismaClient } from '@prisma/client';
import app from './src/app.js';

const prisma = new PrismaClient();

async function runLicenseStatsApiTests() {
  console.log('=== RUNNING LICENSE STATS API TESTS ===\n');

  const server = app.listen(5009);
  const baseUrl = 'http://localhost:5009/api';

  try {
    const adminLoginRes = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@firma.com', password: 'admin123' }),
    });
    const adminLoginJson = await adminLoginRes.json();
    const adminToken = adminLoginJson.data.accessToken;

    const headers = { Authorization: `Bearer ${adminToken}` };

    // TEST 1: GET /api/licenses/stats
    console.log('[TEST 1] GET /api/licenses/stats...');
    const statsRes = await fetch(`${baseUrl}/licenses/stats`, { headers });
    const statsJson = await statsRes.json();
    console.log(' -> Response Status:', statsRes.status);
    console.log(' -> Stats Data:', statsJson.data);

    if (statsRes.status !== 200 || !statsJson.success || !statsJson.data) {
      throw new Error('GET /api/licenses/stats failed!');
    }

    // Verify mathematical accuracy against DB counts directly
    const now = new Date();
    const target15Days = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 15, 23, 59, 59, 999);

    const dbTotal = await prisma.license.count();
    const dbExpiringSoon = await prisma.license.count({
      where: {
        status: { not: 'IPTAL_EDILDI' },
        endDate: { lte: target15Days },
      },
    });
    const dbCancelled = await prisma.license.count({
      where: { status: 'IPTAL_EDILDI' },
    });

    console.log(' -> DB Verified Total:', dbTotal, '| API Total:', statsJson.data.total);
    console.log(' -> DB Verified ExpiringSoon:', dbExpiringSoon, '| API ExpiringSoon:', statsJson.data.expiringSoon);
    console.log(' -> DB Verified Cancelled:', dbCancelled, '| API Cancelled:', statsJson.data.cancelled);

    if (
      statsJson.data.total !== dbTotal ||
      statsJson.data.expiringSoon !== dbExpiringSoon ||
      statsJson.data.cancelled !== dbCancelled
    ) {
      throw new Error('Stats API output does not match database count query!');
    }

    // TEST 2: Dynamic Count Update Test (Create an expiring license then cancel it)
    console.log('\n[TEST 2] Testing dynamic count changes when a license is created and cancelled...');
    const unit = await prisma.unit.findFirst();
    const createLicRes = await fetch(`${baseUrl}/licenses`, {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        unitId: unit.id,
        brand: 'Zoom',
        productInfo: 'Zoom Enterprise Pro',
        startDate: new Date().toISOString(),
        endDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 days left -> expiring soon!
        paymentType: 'KREDI_KARTI',
      }),
    });
    const createLicJson = await createLicRes.json();
    const testLicId = createLicJson.data.id;

    // Fetch stats after creation
    const statsAfterCreate = await (await fetch(`${baseUrl}/licenses/stats`, { headers })).json();
    console.log(' -> Stats After Creation (Expiring license created):', statsAfterCreate.data);
    if (statsAfterCreate.data.total !== dbTotal + 1 || statsAfterCreate.data.expiringSoon !== dbExpiringSoon + 1) {
      throw new Error('Stats after license creation count mismatch!');
    }

    // Now Cancel the license
    await fetch(`${baseUrl}/licenses/${testLicId}/status`, {
      method: 'PATCH',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'IPTAL_EDILDI' }),
    });

    const statsAfterCancel = await (await fetch(`${baseUrl}/licenses/stats`, { headers })).json();
    console.log(' -> Stats After Cancellation:', statsAfterCancel.data);
    if (
      statsAfterCancel.data.cancelled !== dbCancelled + 1 ||
      statsAfterCancel.data.expiringSoon !== dbExpiringSoon
    ) {
      throw new Error('Stats after cancellation count mismatch!');
    }

    // Cleanup
    await prisma.license.delete({ where: { id: testLicId } });

    console.log('\n=== ALL LICENSE STATS API TESTS PASSED 100% ===');
  } catch (err) {
    console.error('\n[LICENSE STATS API TEST ERROR]', err);
    process.exitCode = 1;
  } finally {
    server.close();
    await prisma.$disconnect();
  }
}

runLicenseStatsApiTests();
