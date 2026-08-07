import { PrismaClient } from '@prisma/client';
import app from './src/app.js';

const prisma = new PrismaClient();

async function testReturnsPageSafety() {
  console.log('=== TESTING RETURNS PAGE SAFETY & ALL RECORDS ===\n');

  const server = app.listen(5012);
  const baseUrl = 'http://localhost:5012/api';

  try {
    const adminLoginRes = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@firma.com', password: 'admin123' }),
    });
    const adminLoginJson = await adminLoginRes.json();
    const adminToken = adminLoginJson.data.accessToken;
    const headers = { Authorization: `Bearer ${adminToken}` };

    // Fetch list of returns
    console.log('[TEST 1] Fetching GET /api/returns...');
    const res = await fetch(`${baseUrl}/returns?pageSize=100`, { headers });
    const json = await res.json();
    console.log(' -> Response Status:', res.status);
    console.log(' -> Returned Records Count:', json.data?.length);

    if (res.status !== 200 || !Array.isArray(json.data)) {
      throw new Error('GET /api/returns failed!');
    }

    // Fetch each detail
    for (const item of json.data) {
      console.log(` -> Fetching detail for return ${item.id}...`);
      const dRes = await fetch(`${baseUrl}/returns/${item.id}`, { headers });
      if (dRes.status !== 200) {
        throw new Error(`GET /api/returns/${item.id} returned status ${dRes.status}`);
      }
    }

    console.log('\n=== ALL RETURN RECORDS ACCESSED SUCCESSFULLY WITHOUT ERRORS ===');
  } catch (err) {
    console.error('\n[RETURNS PAGE SAFETY TEST ERROR]', err);
    process.exitCode = 1;
  } finally {
    server.close();
    await prisma.$disconnect();
  }
}

testReturnsPageSafety();
