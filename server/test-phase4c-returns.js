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
  console.log('🧪 PHASE 4C: RETURN (ZİMMET İADE) TEST SUITE');
  console.log('====================================================\n');

  // 0. Logins
  const adminRes = await fetchWithRetry(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@firma.com', password: 'admin123' }),
  });
  const adminData = await adminRes.json();
  const adminToken = adminData.data?.accessToken;

  const viewerRes = await fetchWithRetry(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'viewer@firma.com', password: 'viewer123' }),
  });
  const viewerData = await viewerRes.json();
  const viewerToken = viewerData.data?.accessToken;

  if (!adminToken || !viewerToken) throw new Error('Admin or Viewer login failed!');
  console.log('🔑 Admin & Viewer logins successful.\n');

  const adminUser = await prisma.user.findFirst({ where: { email: 'admin@firma.com' } });

  // Get/Create Employee
  let employee = await prisma.employee.findFirst({ where: { tcNo: '33333333333' } });
  if (!employee) {
    employee = await prisma.employee.create({
      data: {
        fullName: 'Caner Şahin',
        tcNo: '33333333333',
        department: 'Kalite Kontrol',
        phone: '05554443322',
        email: 'caner.sahin@ditas.com.tr',
      },
    });
  }

  // Get Categories
  const categories = await prisma.category.findMany();
  const hwCat = categories.find((c) => c.parentType === 'VARLIK') || categories[0];
  const accCat = categories.find((c) => c.parentType === 'AKSESUAR') || categories[0];
  const licCat = categories.find((c) => c.parentType === 'LISANS') || categories[0];

  // Create Test Assets
  const hw1 = await prisma.hardware.create({
    data: {
      categoryId: hwCat.id,
      brand: 'HP',
      model: 'EliteBook 840',
      serialNo: `SN-4C1-${Date.now()}`,
      demirbasNo: `DEM-4C1-${Date.now()}`,
      status: 'Hazir',
      createdById: adminUser.id,
    },
  });

  const hw2 = await prisma.hardware.create({
    data: {
      categoryId: hwCat.id,
      brand: 'Dell',
      model: 'UltraSharp 27',
      serialNo: `SN-4C2-${Date.now()}`,
      demirbasNo: `DEM-4C2-${Date.now()}`,
      status: 'Hazir',
      createdById: adminUser.id,
    },
  });

  const acc1 = await prisma.accessory.create({
    data: {
      name: 'USB-C Multiport Adapter',
      categoryId: accCat.id,
      totalQuantity: 10,
      availableQuantity: 10,
      assignedQuantity: 0,
      outOfUseQuantity: 0,
      createdById: adminUser.id,
    },
  });

  const lic1 = await prisma.license.create({
    data: {
      name: 'AutoCAD Commercial License',
      categoryId: licCat.id,
      totalQuantity: 20,
      availableQuantity: 20,
      assignedQuantity: 0,
      endDate: new Date('2028-12-31'),
      createdById: adminUser.id,
    },
  });

  // Create Initial Mixed Assignment: 2 Hardwares + 4 Accessories + 10 Licenses
  const assignRes = await fetchWithRetry(`${API_BASE}/assignments`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({
      teslimEden: 'IT Uzmanı',
      employeeId: employee.id,
      teslimTarihi: new Date().toISOString().slice(0, 10),
      hardwareItems: [{ hardwareId: hw1.id }, { hardwareId: hw2.id }],
      accessoryItems: [{ accessoryId: acc1.id, quantity: 4 }],
      licenseItems: [{ licenseId: lic1.id, quantity: 10 }],
    }),
  });

  const assignData = await assignRes.json();
  const assignment = assignData.data;
  console.log(`Assignment created for return test. ID: ${assignment.id}\n`);

  // ----------------------------------------------------
  // TEST SCENARIO 1: Partial Return (1 Hardware + 2 Accessories + 5 Licenses)
  // ----------------------------------------------------
  console.log('🔹 TEST 1: Execute partial return (1 Hardware + 2 Accessories + 5 Licenses)...');
  const return1Res = await fetchWithRetry(`${API_BASE}/returns`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({
      assignmentId: assignment.id,
      teslimAlanIc: 'Ahmet IT',
      tarih: new Date().toISOString().slice(0, 10),
      hardwareItems: [{ hardwareId: hw1.id, resultStatus: 'Hazır' }],
      accessoryItems: [{ accessoryId: acc1.id, quantity: 2, resultStatus: 'Hazır' }],
      licenseItems: [{ licenseId: lic1.id, quantity: 5 }],
    }),
  });

  const return1Data = await return1Res.json();
  if (return1Res.status !== 201) {
    throw new Error(`TEST 1 FAILED: ${return1Data.message}`);
  }
  const return1 = return1Data.data;
  console.log(`Return 1 created. ID: ${return1.id}`);

  // Verify DB state for partial return
  const checkHw1 = await prisma.hardware.findUnique({ where: { id: hw1.id } });
  const checkHw2 = await prisma.hardware.findUnique({ where: { id: hw2.id } });
  const checkAcc1 = await prisma.accessory.findUnique({ where: { id: acc1.id } });
  const checkLic1 = await prisma.license.findUnique({ where: { id: lic1.id } });
  const checkAssign1 = await prisma.assignment.findUnique({ where: { id: assignment.id } });

  console.log(`Hardware 1 status: ${checkHw1.status} (Expected: Hazir)`);
  console.log(`Hardware 2 status: ${checkHw2.status} (Expected: Kullanimda)`);
  console.log(`Accessory assigned: ${checkAcc1.assignedQuantity}, available: ${checkAcc1.availableQuantity} (Expected: assigned=2, available=8)`);
  console.log(`License assigned: ${checkLic1.assignedQuantity}, available: ${checkLic1.availableQuantity} (Expected: assigned=5, available=15)`);
  console.log(`Assignment status: ${checkAssign1.status} (Expected: KismiIade)`);

  if (
    checkHw1.status !== 'Hazir' ||
    checkHw2.status !== 'Kullanimda' ||
    checkAcc1.assignedQuantity !== 2 ||
    checkAcc1.availableQuantity !== 8 ||
    checkLic1.assignedQuantity !== 5 ||
    checkLic1.availableQuantity !== 15 ||
    checkAssign1.status !== 'KismiIade'
  ) {
    throw new Error('TEST 1 FAILED: Partial return DB state updates did not match expected values!');
  }
  console.log('✅ TEST 1 PASSED: Partial return updated item statuses and set assignment status to "Kısmi İade".\n');

  // ----------------------------------------------------
  // TEST SCENARIO 2: Complete Remaining Return (Hardware 2 Arızalı + 2 Accessories Arızalı + 5 Licenses)
  // ----------------------------------------------------
  console.log('🔹 TEST 2: Execute final return for remaining items (Hardware 2 Arızalı, 2 Accessories Arızalı, 5 Licenses)...');
  const return2Res = await fetchWithRetry(`${API_BASE}/returns`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({
      assignmentId: assignment.id,
      teslimAlanIc: 'Ahmet IT',
      tarih: new Date().toISOString().slice(0, 10),
      hardwareItems: [{ hardwareId: hw2.id, resultStatus: 'Arızalı' }],
      accessoryItems: [{ accessoryId: acc1.id, quantity: 2, resultStatus: 'Arızalı' }],
      licenseItems: [{ licenseId: lic1.id, quantity: 5 }],
    }),
  });

  const return2Data = await return2Res.json();
  if (return2Res.status !== 201) {
    throw new Error(`TEST 2 FAILED: ${return2Data.message}`);
  }
  const return2 = return2Data.data;

  // Verify DB state for full return completion
  const checkHw2Final = await prisma.hardware.findUnique({ where: { id: hw2.id } });
  const checkAcc1Final = await prisma.accessory.findUnique({ where: { id: acc1.id } });
  const checkLic1Final = await prisma.license.findUnique({ where: { id: lic1.id } });
  const checkAssignFinal = await prisma.assignment.findUnique({ where: { id: assignment.id } });

  console.log(`Hardware 2 final status: ${checkHw2Final.status} (Expected: Arizali)`);
  console.log(`Accessory assigned: ${checkAcc1Final.assignedQuantity}, available: ${checkAcc1Final.availableQuantity}, outOfUse: ${checkAcc1Final.outOfUseQuantity} (Expected: assigned=0, available=8, outOfUse=2)`);
  console.log(`License assigned: ${checkLic1Final.assignedQuantity}, available: ${checkLic1Final.availableQuantity} (Expected: assigned=0, available=20)`);
  console.log(`Assignment final status: ${checkAssignFinal.status} (Expected: IadeEdildi)`);

  if (
    checkHw2Final.status !== 'Arizali' ||
    checkAcc1Final.assignedQuantity !== 0 ||
    checkAcc1Final.outOfUseQuantity !== 2 ||
    checkLic1Final.assignedQuantity !== 0 ||
    checkLic1Final.availableQuantity !== 20 ||
    checkAssignFinal.status !== 'IadeEdildi'
  ) {
    throw new Error('TEST 2 FAILED: Final return DB state updates did not match expected values!');
  }
  console.log('✅ TEST 2 PASSED: Final return completed, defective items routed to Arızalı/outOfUse, assignment status set to "İade Edildi".\n');

  // ----------------------------------------------------
  // TEST SCENARIO 3: Re-return Rejection on Fully Returned Assignment
  // ----------------------------------------------------
  console.log('🔹 TEST 3: Attempt third return on fully returned assignment (Expect 400 Bad Request)...');
  const return3Res = await fetchWithRetry(`${API_BASE}/returns`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({
      assignmentId: assignment.id,
      teslimAlanIc: 'Ahmet IT',
      tarih: new Date().toISOString().slice(0, 10),
      licenseItems: [{ licenseId: lic1.id, quantity: 1 }],
    }),
  });

  const return3Data = await return3Res.json();
  console.log(`Status: ${return3Res.status}, Message: "${return3Data.message}"`);
  if (return3Res.status !== 400 || !return3Data.message.includes('zaten tamamen iade edilmiş')) {
    throw new Error('TEST 3 FAILED: Expected 400 rejection for fully returned assignment!');
  }
  console.log('✅ TEST 3 PASSED: Rejected re-return attempt on fully returned assignment.\n');

  // ----------------------------------------------------
  // TEST SCENARIO 4: Return PDF Generation & Download
  // ----------------------------------------------------
  console.log('🔹 TEST 4: Download generated Return PDF via GET /api/returns/:id/pdf...');
  const pdfRes = await fetchWithRetry(`${API_BASE}/returns/${return1.id}/pdf`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });

  console.log(`PDF Download status: ${pdfRes.status}, Content-Type: ${pdfRes.headers.get('content-type')}`);
  const pdfBuffer = await pdfRes.arrayBuffer();
  console.log(`Return PDF size: ${pdfBuffer.byteLength} bytes.`);

  if (pdfRes.status !== 200 || pdfBuffer.byteLength < 5000) {
    throw new Error('TEST 4 FAILED: Return PDF was not generated or downloaded properly!');
  }
  console.log('✅ TEST 4 PASSED: Return PDF generated via Puppeteer and downloaded cleanly.\n');

  // ----------------------------------------------------
  // TEST SCENARIO 5: Optional Signed Form Upload & Download for Return
  // ----------------------------------------------------
  console.log('🔹 TEST 5: Upload signed return form attachment to return record...');
  const tempFilePath = path.resolve('test-signed-return-upload.pdf');
  fs.writeFileSync(tempFilePath, Buffer.from(pdfBuffer));

  const formData = new FormData();
  const fileBlob = new Blob([fs.readFileSync(tempFilePath)], { type: 'application/pdf' });
  formData.append('file', fileBlob, 'Imzali_Iade_Formu_Caner.pdf');

  const uploadRes = await fetchWithRetry(`${API_BASE}/returns/${return1.id}/signed-form`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: formData,
  });

  const uploadData = await uploadRes.json();
  if (uploadRes.status !== 201) {
    throw new Error(`TEST 5 FAILED on upload: ${uploadData.message}`);
  }

  const downloadSignedRes = await fetchWithRetry(`${API_BASE}/returns/${return1.id}/signed-form`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });

  console.log(`Signed return form download status: ${downloadSignedRes.status}`);
  if (downloadSignedRes.status !== 200) {
    throw new Error('TEST 5 FAILED on download signed return form!');
  }
  console.log('✅ TEST 5 PASSED: Signed return form uploaded and downloaded successfully.\n');

  // ----------------------------------------------------
  // TEST SCENARIO 6: Viewer Authorization Rejection
  // ----------------------------------------------------
  console.log('🔹 TEST 6: Attempt POST /api/returns with viewer role (Expect 403 Forbidden)...');
  const viewerPostRes = await fetchWithRetry(`${API_BASE}/returns`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${viewerToken}`,
    },
    body: JSON.stringify({
      assignmentId: assignment.id,
      teslimAlanIc: 'Viewer User',
      tarih: new Date().toISOString().slice(0, 10),
      licenseItems: [{ licenseId: lic1.id, quantity: 1 }],
    }),
  });

  console.log(`Viewer POST status: ${viewerPostRes.status}`);
  if (viewerPostRes.status !== 403) {
    throw new Error('TEST 6 FAILED: Expected 403 Forbidden for viewer user POST!');
  }
  console.log('✅ TEST 6 PASSED: Viewer return creation rejected with 403 Forbidden.\n');

  // Cleanup test data
  if (fs.existsSync(tempFilePath)) fs.unlinkSync(tempFilePath);
  await prisma.returnItem.deleteMany({ where: { returnId: { in: [return1.id, return2.id] } } });
  await prisma.returnAccessoryItem.deleteMany({ where: { returnId: { in: [return1.id, return2.id] } } });
  await prisma.returnLicenseItem.deleteMany({ where: { returnId: { in: [return1.id, return2.id] } } });
  await prisma.return.deleteMany({ where: { id: { in: [return1.id, return2.id] } } });
  await prisma.assignmentItem.deleteMany({ where: { assignmentId: assignment.id } });
  await prisma.assignmentAccessoryItem.deleteMany({ where: { assignmentId: assignment.id } });
  await prisma.assignmentLicenseItem.deleteMany({ where: { assignmentId: assignment.id } });
  await prisma.assignment.delete({ where: { id: assignment.id } });
  await prisma.attachment.deleteMany({ where: { entityType: 'return' } });
  await prisma.stockMovement.deleteMany({ where: { entityId: { in: [acc1.id, lic1.id] } } });
  await prisma.hardware.deleteMany({ where: { id: { in: [hw1.id, hw2.id] } } });
  await prisma.accessory.delete({ where: { id: acc1.id } });
  await prisma.license.delete({ where: { id: lic1.id } });

  console.log('====================================================');
  console.log('🎉 ALL 6 PHASE 4C TEST SCENARIOS PASSED 100% SUCCESSFULLY!');
  console.log('====================================================');
  process.exit(0);
}

main().catch((err) => {
  console.error('\n❌ TEST SUITE FAILED:', err);
  process.exit(1);
});
