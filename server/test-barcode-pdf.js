import prisma from './src/config/db.js';
import jwt from 'jsonwebtoken';
import fs from 'fs';
import path from 'path';

const JWT_SECRET = process.env.JWT_SECRET || 'demirbas-secret-key-2026';

async function testBarcodePdf() {
  try {
    console.log('=== TEST START ===');

    // 1. Get an admin user
    const adminUser = await prisma.user.findFirst({
      where: { role: 'admin' },
    });

    if (!adminUser) {
      console.error('No admin user found!');
      process.exit(1);
    }

    const token = jwt.sign({ id: adminUser.id, role: adminUser.role }, JWT_SECRET, { expiresIn: '1h' });

    // 2. Get first 3 hardware items
    const hardwareList = await prisma.hardware.findMany({
      take: 3,
      select: { id: true, demirbasNo: true, brand: true, model: true },
    });

    console.log(`Found ${hardwareList.length} hardware items for barcode test.`);
    const hardwareIds = hardwareList.map((h) => h.id);

    // 3. Make POST request to http://localhost:4001/api/hardware/barcodes/pdf
    const res = await fetch('http://localhost:4001/api/hardware/barcodes/pdf', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ hardwareIds }),
    });

    console.log(`Response Status Code: ${res.status} ${res.statusText}`);
    console.log(`Response Content-Type: ${res.headers.get('content-type')}`);

    if (res.ok) {
      const arrayBuffer = await res.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      console.log(`Response Buffer Size: ${buffer.length} bytes`);

      const outputPath = path.join(process.cwd(), 'test-output.pdf');
      fs.writeFileSync(outputPath, buffer);
      console.log(`Successfully saved PDF to ${outputPath}`);
    } else {
      const text = await res.text();
      console.error('API Error Response Body:', text);
    }
  } catch (err) {
    console.error('Test execution error:', err);
  } finally {
    await prisma.$disconnect();
  }
}

testBarcodePdf();
