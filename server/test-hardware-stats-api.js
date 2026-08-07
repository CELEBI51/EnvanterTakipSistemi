import { PrismaClient } from '@prisma/client';
import app from './src/app.js';

const prisma = new PrismaClient();

async function runHardwareStatsApiTests() {
  console.log('=== RUNNING HARDWARE STATS API TESTS ===\n');

  const server = app.listen(5010);
  const baseUrl = 'http://localhost:5010/api';

  try {
    const adminLoginRes = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@firma.com', password: 'admin123' }),
    });
    const adminLoginJson = await adminLoginRes.json();
    const adminToken = adminLoginJson.data.accessToken;
    const headers = { Authorization: `Bearer ${adminToken}` };

    // TEST 1: GET /api/hardware/stats
    console.log('[TEST 1] GET /api/hardware/stats...');
    const statsRes = await fetch(`${baseUrl}/hardware/stats`, { headers });
    const statsJson = await statsRes.json();
    console.log(' -> Response Status:', statsRes.status);
    console.log(' -> Stats Data:', statsJson.data);

    if (statsRes.status !== 200 || !statsJson.success || !statsJson.data) {
      throw new Error('GET /api/hardware/stats failed!');
    }

    // Verify against DB direct counts
    const dbTotal = await prisma.hardware.count();
    const dbInUse = await prisma.hardware.count({ where: { status: 'Kullanimda' } });
    const dbReady = await prisma.hardware.count({ where: { status: 'Hazir' } });
    const dbNeedsAttention = await prisma.hardware.count({
      where: { status: { in: ['Arizali', 'Serviste', 'KullanimDisi'] } },
    });

    console.log(' -> DB Verified Total:', dbTotal, '| API Total:', statsJson.data.total);
    console.log(' -> DB Verified InUse:', dbInUse, '| API InUse:', statsJson.data.inUse);
    console.log(' -> DB Verified Ready:', dbReady, '| API Ready:', statsJson.data.ready);
    console.log(' -> DB Verified NeedsAttention:', dbNeedsAttention, '| API NeedsAttention:', statsJson.data.needsAttention);

    if (
      statsJson.data.total !== dbTotal ||
      statsJson.data.inUse !== dbInUse ||
      statsJson.data.ready !== dbReady ||
      statsJson.data.needsAttention !== dbNeedsAttention
    ) {
      throw new Error('Hardware Stats API output does not match direct database count query!');
    }

    // TEST 2: Dynamic Status Change Test
    console.log('\n[TEST 2] Testing dynamic count update when hardware status changes...');
    const category = await prisma.category.findFirst({ where: { parentType: 'VARLIK' } });
    const user = await prisma.user.findFirst();

    // Create a new hardware record with status 'Hazir'
    const testHw = await prisma.hardware.create({
      data: {
        brand: 'Lenovo',
        model: 'ThinkPad X1',
        serialNo: `SN-TEST-${Date.now()}`,
        demirbasNo: `DMB-TEST-${Date.now()}`,
        status: 'Hazir',
        categoryId: category.id,
        createdById: user.id,
      },
    });

    const statsAfterCreate = await (await fetch(`${baseUrl}/hardware/stats`, { headers })).json();
    console.log(' -> Stats After Creating "Hazır" Hardware:', statsAfterCreate.data);
    if (statsAfterCreate.data.ready !== dbReady + 1) {
      throw new Error('Ready count after hardware creation mismatch!');
    }

    // Change status to 'Arizali'
    await fetch(`${baseUrl}/hardware/${testHw.id}`, {
      method: 'PUT',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'Arizali' }),
    });

    const statsAfterStatusChange = await (await fetch(`${baseUrl}/hardware/stats`, { headers })).json();
    console.log(' -> Stats After Changing Status to "Arızalı":', statsAfterStatusChange.data);
    if (
      statsAfterStatusChange.data.ready !== dbReady ||
      statsAfterStatusChange.data.needsAttention !== dbNeedsAttention + 1
    ) {
      throw new Error('NeedsAttention count after status update mismatch!');
    }

    // Cleanup
    await prisma.hardware.delete({ where: { id: testHw.id } });

    console.log('\n=== ALL HARDWARE STATS API TESTS PASSED 100% ===');
  } catch (err) {
    console.error('\n[HARDWARE STATS API TEST ERROR]', err);
    process.exitCode = 1;
  } finally {
    server.close();
    await prisma.$disconnect();
  }
}

runHardwareStatsApiTests();
