import fs from 'fs';
import path from 'path';
import prisma from './src/config/db.js';

const API_BASE = 'http://localhost:4001/api';

async function fetchWithRetry(url, options, maxRetries = 5, delay = 1000) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const res = await fetch(url, options);
      return res;
    } catch (err) {
      if (i === maxRetries - 1) throw err;
      await new Promise((r) => setTimeout(r, delay));
    }
  }
}

async function main() {
  console.log('====================================================');
  console.log('🧪 PHASE 4B: PDF, SIGNED FORM & CONSUMABLES TEST SUITE');
  console.log('====================================================\n');

  // 0. Logins
  const adminRes = await fetchWithRetry(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@firma.com', password: 'admin123' }),
  });
  const adminData = await adminRes.json();
  const adminToken = adminData.data?.accessToken;

  if (!adminToken) throw new Error('Admin login failed!');
  console.log('🔑 Admin login successful.\n');

  const adminUser = await prisma.user.findFirst({ where: { email: 'admin@firma.com' } });

  // Get/Create Employee
  let employee = await prisma.employee.findFirst({ where: { tcNo: '22222222222' } });
  if (!employee) {
    employee = await prisma.employee.create({
      data: {
        fullName: 'Mehmet Demir',
        tcNo: '22222222222',
        department: 'Üretim & Bakım',
        phone: '05559998877',
        email: 'mehmet.demir@ditas.com.tr',
      },
    });
  }

  // Get Categories
  const categories = await prisma.category.findMany();
  const hwCat = categories.find((c) => c.parentType === 'VARLIK') || categories[0];
  const conCat = categories.find((c) => c.parentType === 'SARF_MALZEME') || categories[0];

  // Create Test Hardware with Specs
  const hw = await prisma.hardware.create({
    data: {
      categoryId: hwCat.id,
      brand: 'Dell',
      model: 'Precision 3650',
      serialNo: `SN-4B-${Date.now()}`,
      demirbasNo: `DEM-4B-${Date.now()}`,
      status: 'Hazir',
      specs: {
        cpu: 'Intel Core i7-11700',
        ram: '32GB DDR4',
        gpu: 'NVIDIA RTX A2000',
        disk: '1TB NVMe SSD',
        dvd: true,
        other: 'Klavye, Mouse Dahil',
      },
      createdById: adminUser.id,
    },
  });

  // Create Test Consumable
  const consumable = await prisma.consumable.create({
    data: {
      name: 'A4 Fotokopi Kağıdı 80gr (Paket)',
      categoryId: conCat.id,
      totalQuantity: 20,
      availableQuantity: 20,
      consumedQuantity: 0,
      createdById: adminUser.id,
    },
  });

  // ----------------------------------------------------
  // TEST SCENARIO 1: Consumables Assignment & Stock Movement Check
  // ----------------------------------------------------
  console.log('🔹 TEST 1: Create assignment with 3 units of Consumables...');
  const assign1Res = await fetchWithRetry(`${API_BASE}/assignments`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({
      teslimEden: 'Sistem Yöneticisi',
      employeeId: employee.id,
      teslimTarihi: new Date().toISOString().slice(0, 10),
      hardwareItems: [{ hardwareId: hw.id }],
      consumableItems: [{ consumableId: consumable.id, quantity: 3 }],
    }),
  });

  const assign1Data = await assign1Res.json();
  if (assign1Res.status !== 201) {
    throw new Error(`TEST 1 FAILED: ${assign1Data.message}`);
  }
  const assignment1 = assign1Data.data;
  console.log(`Assignment 1 created. ID: ${assignment1.id}`);

  // Check Consumable stock updates
  const checkCon1 = await prisma.consumable.findUnique({ where: { id: consumable.id } });
  console.log(`Consumable available: ${checkCon1.availableQuantity}, consumed: ${checkCon1.consumedQuantity}`);
  if (checkCon1.availableQuantity !== 17 || checkCon1.consumedQuantity !== 3) {
    throw new Error('TEST 1 FAILED: Consumable stock was not updated correctly!');
  }

  // Check StockMovement with issuedToEmployeeId
  const movement1 = await prisma.stockMovement.findFirst({
    where: { entityId: consumable.id, type: 'issued' },
  });
  if (!movement1 || movement1.issuedToEmployeeId !== employee.id) {
    throw new Error('TEST 1 FAILED: StockMovement with issuedToEmployeeId missing or invalid!');
  }
  console.log(`Stock movement note: "${movement1.note}", issuedToEmployeeId: ${movement1.issuedToEmployeeId}`);
  console.log('✅ TEST 1 PASSED: Consumable added to assignment, stock updated, stock_movement recorded.\n');

  // ----------------------------------------------------
  // TEST SCENARIO 2: Direct Consumables Issue (Independent of Assignment)
  // ----------------------------------------------------
  console.log('🔹 TEST 2: Direct consumable issue via POST /api/consumables/:id/issue (quantity=2)...');
  const directIssueRes = await fetchWithRetry(`${API_BASE}/consumables/${consumable.id}/issue`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({
      quantity: 2,
      employeeId: employee.id,
      note: 'Atölye kullanımı için teslim edildi',
    }),
  });

  const directIssueData = await directIssueRes.json();
  if (directIssueRes.status !== 200) {
    throw new Error(`TEST 2 FAILED: ${directIssueData.message}`);
  }

  const checkCon2 = await prisma.consumable.findUnique({ where: { id: consumable.id } });
  console.log(`Consumable available after direct issue: ${checkCon2.availableQuantity}, consumed: ${checkCon2.consumedQuantity}`);
  if (checkCon2.availableQuantity !== 15 || checkCon2.consumedQuantity !== 5) {
    throw new Error('TEST 2 FAILED: Direct consumable issue did not update quantities correctly!');
  }
  console.log('✅ TEST 2 PASSED: Direct consumable issue succeeded independently.\n');

  // ----------------------------------------------------
  // TEST SCENARIO 3: PDF Generation & Download (Puppeteer)
  // ----------------------------------------------------
  console.log('🔹 TEST 3: Download generated PDF via GET /api/assignments/:id/pdf...');
  const pdfRes = await fetchWithRetry(`${API_BASE}/assignments/${assignment1.id}/pdf`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });

  console.log(`PDF Download status: ${pdfRes.status}, Content-Type: ${pdfRes.headers.get('content-type')}`);
  const pdfBuffer = await pdfRes.arrayBuffer();
  console.log(`PDF file size: ${pdfBuffer.byteLength} bytes.`);

  if (pdfRes.status !== 200 || pdfBuffer.byteLength < 5000) {
    throw new Error('TEST 3 FAILED: PDF was not generated or downloaded properly!');
  }
  console.log('✅ TEST 3 PASSED: PDF generated via Puppeteer and downloaded cleanly.\n');

  // ----------------------------------------------------
  // TEST SCENARIO 4: Optional Signed Form Upload & Download
  // ----------------------------------------------------
  console.log('🔹 TEST 4: Upload signed form attachment to assignment...');

  // Create temporary pdf file to upload
  const tempFilePath = path.resolve('test-signed-upload.pdf');
  fs.writeFileSync(tempFilePath, Buffer.from(pdfBuffer));

  const formData = new FormData();
  const fileBlob = new Blob([fs.readFileSync(tempFilePath)], { type: 'application/pdf' });
  formData.append('file', fileBlob, 'Imzali_Zimmet_Formu_Ahmet.pdf');

  const uploadRes = await fetchWithRetry(`${API_BASE}/assignments/${assignment1.id}/signed-form`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: formData,
  });

  const uploadData = await uploadRes.json();
  if (uploadRes.status !== 201) {
    throw new Error(`TEST 4 FAILED on upload: ${uploadData.message}`);
  }
  console.log(`Signed form uploaded. Attachment ID: ${uploadData.data.id}`);

  // Download signed form
  const downloadSignedRes = await fetchWithRetry(`${API_BASE}/assignments/${assignment1.id}/signed-form`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });

  console.log(`Signed form download status: ${downloadSignedRes.status}`);
  if (downloadSignedRes.status !== 200) {
    throw new Error('TEST 4 FAILED on download signed form!');
  }
  console.log('✅ TEST 4 PASSED: Signed form uploaded and downloaded successfully.\n');

  // ----------------------------------------------------
  // TEST SCENARIO 5: Unuploaded Signed Form 404 & Active Status Verification
  // ----------------------------------------------------
  console.log('🔹 TEST 5: Verify 404 for assignment WITHOUT uploaded signed form, while assignment remains Active...');
  const assign2Res = await fetchWithRetry(`${API_BASE}/assignments`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({
      teslimEden: 'Sistem Yöneticisi',
      employeeId: employee.id,
      teslimTarihi: new Date().toISOString().slice(0, 10),
      consumableItems: [{ consumableId: consumable.id, quantity: 1 }],
    }),
  });
  const assign2Data = await assign2Res.json();
  const assignment2 = assign2Data.data;

  const noSignedRes = await fetchWithRetry(`${API_BASE}/assignments/${assignment2.id}/signed-form`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });

  console.log(`GET signed-form status for unuploaded assignment: ${noSignedRes.status}`);
  if (noSignedRes.status !== 404) {
    throw new Error('TEST 5 FAILED: Expected 404 for unuploaded signed form!');
  }

  const checkAssign2 = await prisma.assignment.findUnique({ where: { id: assignment2.id } });
  console.log(`Assignment 2 status: ${checkAssign2.status} (Expected: Aktif)`);
  if (checkAssign2.status !== 'Aktif') {
    throw new Error('TEST 5 FAILED: Assignment status should remain Aktif without signed form!');
  }
  console.log('✅ TEST 5 PASSED: Unuploaded signed form returns 404 without affecting assignment status.\n');

  // Cleanup test files & DB records
  if (fs.existsSync(tempFilePath)) fs.unlinkSync(tempFilePath);
  await prisma.assignmentItem.deleteMany({ where: { assignmentId: { in: [assignment1.id, assignment2.id] } } });
  await prisma.assignmentConsumableItem.deleteMany({ where: { assignmentId: { in: [assignment1.id, assignment2.id] } } });
  await prisma.assignment.deleteMany({ where: { id: { in: [assignment1.id, assignment2.id] } } });
  await prisma.attachment.deleteMany({ where: { entityType: 'assignment' } });
  await prisma.stockMovement.deleteMany({ where: { entityId: consumable.id } });
  await prisma.hardware.delete({ where: { id: hw.id } });
  await prisma.consumable.delete({ where: { id: consumable.id } });

  console.log('====================================================');
  console.log('🎉 ALL 5 PHASE 4B TEST SCENARIOS PASSED 100% SUCCESSFULLY!');
  console.log('====================================================');
  process.exit(0);
}

main().catch((err) => {
  console.error('\n❌ TEST SUITE FAILED:', err);
  process.exit(1);
});
