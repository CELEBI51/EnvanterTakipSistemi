import { PrismaClient } from '@prisma/client';
import app from './src/app.js';

const prisma = new PrismaClient();

async function runDashboardAlignmentTest() {
  console.log('=== TESTING DASHBOARD EXPIRING LICENSES ALIGNMENT ===\n');

  const server = app.listen(5013);
  const baseUrl = 'http://localhost:5013/api';

  try {
    const adminLoginRes = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@firma.com', password: 'admin123' }),
    });
    const adminLoginJson = await adminLoginRes.json();
    const adminToken = adminLoginJson.data.accessToken;
    const headers = { Authorization: `Bearer ${adminToken}` };

    // TEST 1: Check Dashboard Stats vs Licenses Stats count
    console.log('[TEST 1] Comparing Dashboard expiring count with Licenses stats count...');
    const dashRes = await fetch(`${baseUrl}/reports/dashboard-stats`, { headers });
    const dashJson = await dashRes.json();

    const licStatsRes = await fetch(`${baseUrl}/licenses/stats`, { headers });
    const licStatsJson = await licStatsRes.json();

    console.log(' -> Dashboard expiringLicenseCount:', dashJson.data?.expiringLicenseCount);
    console.log(' -> Licenses Page expiringSoon:', licStatsJson.data?.expiringSoon);

    if (dashJson.data?.expiringLicenseCount !== licStatsJson.data?.expiringSoon) {
      throw new Error('Dashboard expiring count does NOT match Licenses page count!');
    }

    // TEST 2: GET /api/licenses/expiring?days=15
    console.log('\n[TEST 2] Testing GET /api/licenses/expiring?days=15...');
    const expiringListRes = await fetch(`${baseUrl}/licenses/expiring?days=15`, { headers });
    const expiringListJson = await expiringListRes.json();

    console.log(' -> Response Status:', expiringListRes.status);
    console.log(' -> Expiring List Items Count:', expiringListJson.data?.length);

    if (expiringListRes.status !== 200 || !Array.isArray(expiringListJson.data)) {
      throw new Error('GET /api/licenses/expiring failed!');
    }

    // Verify no IPTAL_EDILDI items in list
    const hasCancelled = expiringListJson.data.some((l) => l.status === 'IPTAL_EDILDI');
    if (hasCancelled) {
      throw new Error('GET /api/licenses/expiring returned IPTAL_EDILDI licenses!');
    }

    console.log('\n=== DASHBOARD EXPIRING LICENSES ALIGNMENT TEST PASSED 100% ===');
  } catch (err) {
    console.error('\n[DASHBOARD ALIGNMENT TEST ERROR]', err);
    process.exitCode = 1;
  } finally {
    server.close();
    await prisma.$disconnect();
  }
}

runDashboardAlignmentTest();
