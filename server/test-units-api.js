import { PrismaClient } from '@prisma/client';
import express from 'express';
import app from './src/app.js';

const prisma = new PrismaClient();

async function runTests() {
  console.log('=== RUNNING UNITS API VERIFICATION TESTS ===\n');

  // Start test server on port 5002
  const server = app.listen(5002);
  const baseUrl = 'http://localhost:5002/api';

  try {
    // 1. Authenticate Admin and Viewer
    console.log('[TEST 1] Authenticating Admin and Viewer users...');
    const adminRes = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@firma.com', password: 'admin123' }),
    });
    const adminData = await adminRes.json();
    const adminToken = adminData.data.accessToken;

    const viewerRes = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'viewer@firma.com', password: 'viewer123' }),
    });
    const viewerData = await viewerRes.json();
    const viewerToken = viewerData.data.accessToken;

    console.log(' -> Admin Token Obtained:', !!adminToken);
    console.log(' -> Viewer Token Obtained:', !!viewerToken);

    // 2. Verify Seed Units in Database
    console.log('\n[TEST 2] Verifying Seed Units in DB & GET /api/units...');
    const getRes = await fetch(`${baseUrl}/units`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const getJson = await getRes.json();
    console.log(' -> GET /api/units Status:', getRes.status);
    console.log(' -> Active Units Count:', getJson.data.length);
    console.log(' -> Unit Names:', getJson.data.map(u => u.name));

    if (getJson.data.length < 3) {
      throw new Error('Seed units missing or inactive!');
    }

    // 3. Admin POST /api/units (Create new unit)
    console.log('\n[TEST 3] Admin creating new Unit "Kalite Kontrol"...');
    const createRes = await fetch(`${baseUrl}/units`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        name: 'Kalite Kontrol',
        phone: '02241112233',
        contactPerson: 'Mehmet Yılmaz',
      }),
    });
    const createJson = await createRes.json();
    console.log(' -> POST /api/units Status:', createRes.status);
    console.log(' -> Created Unit Name:', createJson.data?.name);
    console.log(' -> Created Unit ID:', createJson.data?.id);

    const createdUnitId = createJson.data.id;

    // 4. Non-admin (Viewer) POST /api/units (Expect 403)
    console.log('\n[TEST 4] Non-Admin (Viewer) attempting POST /api/units...');
    const forbiddenRes = await fetch(`${baseUrl}/units`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${viewerToken}`,
      },
      body: JSON.stringify({ name: 'İllegal Birim' }),
    });
    console.log(' -> Viewer POST Status Code:', forbiddenRes.status, '(Expected: 403)');
    if (forbiddenRes.status !== 403) {
      throw new Error(`Expected 403 but got ${forbiddenRes.status}`);
    }

    // 5. Admin DELETE /api/units/:id (Soft Delete)
    console.log('\n[TEST 5] Admin soft-deleting Unit "Kalite Kontrol"...');
    const deleteRes = await fetch(`${baseUrl}/units/${createdUnitId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const deleteJson = await deleteRes.json();
    console.log(' -> DELETE Status:', deleteRes.status);
    console.log(' -> Deleted Unit isActive state:', deleteJson.data?.isActive);

    // Verify row still exists in DB
    const dbUnit = await prisma.unit.findUnique({ where: { id: createdUnitId } });
    console.log(' -> DB Record Still Exists:', !!dbUnit);
    console.log(' -> DB Record isActive:', dbUnit.isActive);

    if (!dbUnit || dbUnit.isActive !== false) {
      throw new Error('Soft delete failed! Record was hard deleted or isActive is not false.');
    }

    // 6. GET /api/units vs GET /api/units?includeInactive=true
    console.log('\n[TEST 6] Testing active filter vs includeInactive=true...');
    const activeRes = await fetch(`${baseUrl}/units`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const activeJson = await activeRes.json();
    console.log(' -> Active Units Count:', activeJson.data.length);
    console.log(' -> Contains "Kalite Kontrol":', activeJson.data.some(u => u.name === 'Kalite Kontrol'));

    const allRes = await fetch(`${baseUrl}/units?includeInactive=true`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const allJson = await allRes.json();
    console.log(' -> All Units (including inactive) Count:', allJson.data.length);
    console.log(' -> Contains "Kalite Kontrol" in includeInactive=true:', allJson.data.some(u => u.name === 'Kalite Kontrol'));

    console.log('\n=== ALL UNITS API TESTS PASSED SUCCESSFULLY! ===');
  } catch (err) {
    console.error('\n[TEST ERROR]', err);
    process.exitCode = 1;
  } finally {
    server.close();
    await prisma.$disconnect();
  }
}

runTests();
