import { PrismaClient } from '@prisma/client';
import app from './src/app.js';

const prisma = new PrismaClient();

async function runPhase7Tests() {
  console.log('=== RUNNING ALL PHASE 7 STATS & SEARCH API TESTS ===\n');

  const server = app.listen(5011);
  const baseUrl = 'http://localhost:5011/api';

  try {
    const adminLoginRes = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@firma.com', password: 'admin123' }),
    });
    const adminLoginJson = await adminLoginRes.json();
    const adminToken = adminLoginJson.data.accessToken;
    const headers = { Authorization: `Bearer ${adminToken}` };

    // TEST 1: GET /api/accessories/stats
    console.log('[TEST 1] Testing Accessories Stats (GET /api/accessories/stats)...');
    const accStatsRes = await fetch(`${baseUrl}/accessories/stats`, { headers });
    const accStatsJson = await accStatsRes.json();
    console.log(' -> Status:', accStatsRes.status, '| Data:', accStatsJson.data);
    const dbAccTotal = await prisma.accessory.count();
    const dbAccOut = await prisma.accessory.count({ where: { availableQuantity: 0 } });
    const dbAccAssigned = (await prisma.accessory.aggregate({ _sum: { assignedQuantity: true } }))._sum.assignedQuantity || 0;

    if (
      accStatsJson.data.totalProducts !== dbAccTotal ||
      accStatsJson.data.outOfStock !== dbAccOut ||
      accStatsJson.data.totalAssignedQuantity !== dbAccAssigned
    ) {
      throw new Error('Accessory Stats output does not match database values!');
    }

    // TEST 2: GET /api/components/stats
    console.log('\n[TEST 2] Testing Component Stats (GET /api/components/stats)...');
    const compStatsRes = await fetch(`${baseUrl}/components/stats`, { headers });
    const compStatsJson = await compStatsRes.json();
    console.log(' -> Status:', compStatsRes.status, '| Data:', compStatsJson.data);
    const dbCompTotal = await prisma.component.count();
    const dbCompOut = await prisma.component.count({ where: { availableQuantity: 0 } });
    const dbCompUsed = (await prisma.component.aggregate({ _sum: { usedQuantity: true } }))._sum.usedQuantity || 0;

    if (
      compStatsJson.data.totalProducts !== dbCompTotal ||
      compStatsJson.data.outOfStock !== dbCompOut ||
      compStatsJson.data.totalUsedQuantity !== dbCompUsed
    ) {
      throw new Error('Component Stats output does not match database values!');
    }

    // TEST 3: GET /api/assignments/stats
    console.log('\n[TEST 3] Testing Assignment Stats (GET /api/assignments/stats)...');
    const assignStatsRes = await fetch(`${baseUrl}/assignments/stats`, { headers });
    const assignStatsJson = await assignStatsRes.json();
    console.log(' -> Status:', assignStatsRes.status, '| Data:', assignStatsJson.data);
    const dbAssignTotal = await prisma.assignment.count();
    const dbAssignActive = await prisma.assignment.count({ where: { status: 'Aktif' } });
    const dbAssignPartial = await prisma.assignment.count({ where: { status: 'KismiIade' } });
    const dbAssignFully = await prisma.assignment.count({ where: { status: 'IadeEdildi' } });

    if (
      assignStatsJson.data.total !== dbAssignTotal ||
      assignStatsJson.data.active !== dbAssignActive ||
      assignStatsJson.data.partiallyReturned !== dbAssignPartial ||
      assignStatsJson.data.fullyReturned !== dbAssignFully
    ) {
      throw new Error('Assignment Stats output does not match database values!');
    }

    // TEST 4: GET /api/assignments?q=...
    console.log('\n[TEST 4] Testing Assignments Search Filter (q parameter)...');
    const assignSearchRes = await fetch(`${baseUrl}/assignments?q=Ahmet`, { headers });
    const assignSearchJson = await assignSearchRes.json();
    console.log(' -> Status:', assignSearchRes.status, '| Returned items:', assignSearchJson.data?.length);
    if (!assignSearchRes.ok || !Array.isArray(assignSearchJson.data)) {
      throw new Error('Assignments search endpoint failed!');
    }

    // TEST 5: GET /api/returns?q=...&unitId=...
    console.log('\n[TEST 5] Testing Returns Search & Unit Filters (q & unitId parameters)...');
    const unit = await prisma.unit.findFirst();
    const returnsSearchRes = await fetch(`${baseUrl}/returns?q=Ahmet&unitId=${unit?.id || ''}`, { headers });
    const returnsSearchJson = await returnsSearchRes.json();
    console.log(' -> Status:', returnsSearchRes.status, '| Returned items:', returnsSearchJson.data?.length);
    if (!returnsSearchRes.ok || !Array.isArray(returnsSearchJson.data)) {
      throw new Error('Returns search & unit filter endpoint failed!');
    }

    console.log('\n=== ALL PHASE 7 STATS & SEARCH TESTS PASSED 100% ===');
  } catch (err) {
    console.error('\n[PHASE 7 TEST ERROR]', err);
    process.exitCode = 1;
  } finally {
    server.close();
    await prisma.$disconnect();
  }
}

runPhase7Tests();
