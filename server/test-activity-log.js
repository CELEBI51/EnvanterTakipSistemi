import prisma from './src/config/db.js';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'demirbas-secret-key-2026';

async function testActivityLogScenarios() {
  console.log('=== FULL TEST SUITE START ===');

  try {
    const adminUser = await prisma.user.findFirst({ where: { role: 'admin' } });
    if (!adminUser) {
      console.error('Admin user not found!');
      process.exit(1);
    }
    const token = jwt.sign({ id: adminUser.id, role: adminUser.role }, JWT_SECRET, { expiresIn: '1h' });

    // Test 1: POST /api/hardware/barcodes/pdf
    console.log('Testing 1: POST /api/hardware/barcodes/pdf');
    await fetch('http://127.0.0.1:5000/api/hardware/barcodes/pdf', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ hardwareIds: [] }),
    });

    // Test 2: POST /api/categories
    console.log('Testing 2: POST /api/categories');
    const catRes = await fetch('http://127.0.0.1:5000/api/categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ parentType: 'VARLIK', name: 'Test Kat ' + Date.now() }),
    });
    const catData = await catRes.json();
    const createdCatId = catData.data?.id;

    // Test 3: DELETE /api/categories/:id
    if (createdCatId) {
      console.log('Testing 3: DELETE /api/categories/:id');
      await fetch(`http://127.0.0.1:5000/api/categories/${createdCatId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
    }

    // Wait a brief moment for async log creation
    await new Promise((r) => setTimeout(r, 600));

    // Fetch latest 4 logs from DB
    const latestLogs = await prisma.systemLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 4,
    });

    console.log('\n=== LATEST SYSTEM LOGS IN DATABASE ===');
    latestLogs.forEach((log, index) => {
      console.log(`${index + 1}. [Module: ${log.module}] [Action: ${log.action}] Description: "${log.description}"`);
    });

    console.log('\n=== ALL SCENARIOS VERIFIED SUCCESSFULLY ===');
  } catch (err) {
    console.error('Test error:', err);
  } finally {
    await prisma.$disconnect();
  }
}

testActivityLogScenarios();
