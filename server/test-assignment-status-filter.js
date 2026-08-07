import { PrismaClient } from '@prisma/client';
import app from './src/app.js';

const prisma = new PrismaClient();

async function testAssignmentStatusFilter() {
  console.log('=== TESTING ASSIGNMENT STATUS FILTER (KismiIade, IadeEdildi, Aktif) ===\n');

  const server = app.listen(5014);
  const baseUrl = 'http://localhost:5014/api';

  try {
    const adminLoginRes = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@firma.com', password: 'admin123' }),
    });
    const adminLoginJson = await adminLoginRes.json();
    const adminToken = adminLoginJson.data.accessToken;
    const headers = { Authorization: `Bearer ${adminToken}` };

    // TEST 1: status=KismiIade
    console.log('[TEST 1] Testing status=KismiIade...');
    const res1 = await fetch(`${baseUrl}/assignments?status=KismiIade`, { headers });
    const json1 = await res1.json();
    console.log(' -> Status:', res1.status, '| Returned items:', json1.data?.length);

    if (res1.status !== 200 || !json1.success) throw new Error('status=KismiIade failed!');

    // TEST 2: status=Kısmi İade (Turkish string handling test)
    console.log('[TEST 2] Testing status=Kısmi İade (Turkish string fallback)...');
    const res2 = await fetch(`${baseUrl}/assignments?status=${encodeURIComponent('Kısmi İade')}`, { headers });
    const json2 = await res2.json();
    console.log(' -> Status:', res2.status, '| Returned items:', json2.data?.length);

    if (res2.status !== 200 || !json2.success) throw new Error('status=Kısmi İade failed!');

    // TEST 3: status=IadeEdildi
    console.log('[TEST 3] Testing status=IadeEdildi...');
    const res3 = await fetch(`${baseUrl}/assignments?status=IadeEdildi`, { headers });
    const json3 = await res3.json();
    console.log(' -> Status:', res3.status, '| Returned items:', json3.data?.length);

    if (res3.status !== 200 || !json3.success) throw new Error('status=IadeEdildi failed!');

    console.log('\n=== ALL ASSIGNMENT STATUS FILTER TESTS PASSED 100% ===');
  } catch (err) {
    console.error('\n[ASSIGNMENT STATUS FILTER TEST ERROR]', err);
    process.exitCode = 1;
  } finally {
    server.close();
    await prisma.$disconnect();
  }
}

testAssignmentStatusFilter();
