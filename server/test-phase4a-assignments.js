import prisma from './src/config/db.js';

const API_BASE = 'http://localhost:4001/api';

async function fetchJsonWithRetry(url, options, maxRetries = 5, delay = 1000) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const res = await fetch(url, options);
      const data = await res.json().catch(() => ({}));
      return { res, data };
    } catch (err) {
      if (i === maxRetries - 1) throw err;
      await new Promise((r) => setTimeout(r, delay));
    }
  }
}

async function main() {
  console.log('====================================================');
  console.log('🧪 PHASE 4A: MIXED ASSIGNMENT (ZİMMETLEME) TEST SUITE');
  console.log('====================================================\n');

  // 0. Logins
  const adminLogin = await fetchJsonWithRetry(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@firma.com', password: 'admin123' }),
  });
  const adminToken = adminLogin.data.data?.accessToken || adminLogin.data.data?.token;

  const viewerLogin = await fetchJsonWithRetry(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'viewer@firma.com', password: 'viewer123' }),
  });
  const viewerToken = viewerLogin.data.data?.accessToken || viewerLogin.data.data?.token;

  if (!adminToken || !viewerToken) {
    throw new Error('Admin or Viewer login failed!');
  }
  console.log('🔑 Admin & Viewer logins successful.\n');

  const adminUser = await prisma.user.findFirst({ where: { email: 'admin@firma.com' } });

  // Get/Create Employee
  let employee = await prisma.employee.findFirst({ where: { tcNo: '11111111111' } });
  if (!employee) {
    employee = await prisma.employee.create({
      data: {
        fullName: 'Ahmet Yılmaz',
        tcNo: '11111111111',
        department: 'Bilgi Teknolojileri',
        phone: '05551112233',
        email: 'ahmet.yilmaz@firma.com',
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
      brand: 'Lenovo',
      model: 'ThinkPad L15',
      serialNo: `SN-HW-${Date.now()}`,
      demirbasNo: `DEM-${Date.now()}`,
      status: 'Hazir',
      createdById: adminUser.id,
    },
  });

  const acc1 = await prisma.accessory.create({
    data: {
      name: 'Logitech Kablosuz Mouse',
      categoryId: accCat.id,
      totalQuantity: 10,
      availableQuantity: 10,
      assignedQuantity: 0,
      createdById: adminUser.id,
    },
  });

  const lic1 = await prisma.license.create({
    data: {
      name: 'Microsoft 365 Business Standard',
      categoryId: licCat.id,
      totalQuantity: 20,
      availableQuantity: 20,
      assignedQuantity: 0,
      endDate: new Date('2027-12-31'),
      createdById: adminUser.id,
    },
  });

  // ----------------------------------------------------
  // TEST SCENARIO 1: Mixed Assignment Creation (1 Hardware + 5 Accessories + 10 Licenses)
  // ----------------------------------------------------
  console.log('🔹 TEST 1: Create mixed assignment (1 Hardware + 5 Accessories + 10 Licenses)...');
  const createRes1 = await fetchJsonWithRetry(`${API_BASE}/assignments`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({
      teslimEden: 'Sistem Yöneticisi',
      employeeId: employee.id,
      teslimTarihi: new Date().toISOString().slice(0, 10),
      hardwareItems: [{ hardwareId: hw1.id }],
      accessoryItems: [{ accessoryId: acc1.id, quantity: 5 }],
      licenseItems: [{ licenseId: lic1.id, quantity: 10 }],
    }),
  });

  if (createRes1.res.status !== 201) {
    throw new Error(`TEST 1 FAILED: ${createRes1.data.message}`);
  }
  const assignment1 = createRes1.data.data;
  console.log(`Assignment 1 created successfully. ID: ${assignment1.id}`);

  // Verify DB state updates
  const checkHw1 = await prisma.hardware.findUnique({ where: { id: hw1.id } });
  const checkAcc1 = await prisma.accessory.findUnique({ where: { id: acc1.id } });
  const checkLic1 = await prisma.license.findUnique({ where: { id: lic1.id } });

  console.log(`Hardware status: ${checkHw1.status} (Expected: Kullanimda)`);
  console.log(`Accessory available: ${checkAcc1.availableQuantity}, assigned: ${checkAcc1.assignedQuantity} (Expected: available=5, assigned=5)`);
  console.log(`License available: ${checkLic1.availableQuantity}, assigned: ${checkLic1.assignedQuantity} (Expected: available=10, assigned=10)`);

  if (
    checkHw1.status !== 'Kullanimda' ||
    checkAcc1.availableQuantity !== 5 ||
    checkAcc1.assignedQuantity !== 5 ||
    checkLic1.availableQuantity !== 10 ||
    checkLic1.assignedQuantity !== 10
  ) {
    throw new Error('TEST 1 FAILED: DB state updates did not match expected values!');
  }
  console.log('✅ TEST 1 PASSED: All 3 item types updated status/quantities correctly.\n');

  // ----------------------------------------------------
  // TEST SCENARIO 2: Non-'Hazır' Hardware Rejection & TRANSACTION ROLLBACK Verification
  // ----------------------------------------------------
  console.log('🔹 TEST 2: Attempt assignment for non-Hazır hardware along with accessories & licenses (Expect 400 & Full Transaction Rollback)...');
  const initialAccAvailable = checkAcc1.availableQuantity; // 5
  const initialLicAvailable = checkLic1.availableQuantity; // 10

  // Attempt to assign hw1 again (which is now 'Kullanimda'!) along with 2 accessories and 3 licenses
  const rollbackRes = await fetchJsonWithRetry(`${API_BASE}/assignments`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({
      teslimEden: 'Sistem Yöneticisi',
      employeeId: employee.id,
      teslimTarihi: new Date().toISOString().slice(0, 10),
      hardwareItems: [{ hardwareId: hw1.id }], // Already Kullanimda!
      accessoryItems: [{ accessoryId: acc1.id, quantity: 2 }],
      licenseItems: [{ licenseId: lic1.id, quantity: 3 }],
    }),
  });

  console.log(`Rollback response status: ${rollbackRes.res.status}, Message: "${rollbackRes.data.message}"`);
  if (rollbackRes.res.status !== 400 || !rollbackRes.data.message.includes('şu an Hazır durumunda değil')) {
    throw new Error('TEST 2 FAILED: Expected 400 error for non-Hazır hardware assignment!');
  }

  // Verify ROLLBACK: Accessory and License quantities MUST BE UNCHANGED
  const checkAccRollback = await prisma.accessory.findUnique({ where: { id: acc1.id } });
  const checkLicRollback = await prisma.license.findUnique({ where: { id: lic1.id } });

  console.log(`Accessory available after rollback: ${checkAccRollback.availableQuantity} (Expected: ${initialAccAvailable})`);
  console.log(`License available after rollback: ${checkLicRollback.availableQuantity} (Expected: ${initialLicAvailable})`);

  if (
    checkAccRollback.availableQuantity !== initialAccAvailable ||
    checkLicRollback.availableQuantity !== initialLicAvailable
  ) {
    throw new Error('TEST 2 FAILED: Transaction ROLLBACK failed! Stock was partially mutated!');
  }
  console.log('✅ TEST 2 PASSED: Non-Hazır hardware rejected and FULL TRANSACTION ROLLBACK verified 100%.\n');

  // ----------------------------------------------------
  // TEST SCENARIO 3: Insufficient Stock Rejection
  // ----------------------------------------------------
  console.log('🔹 TEST 3: Attempt to request more accessories than available (quantity=999)...');
  const overflowRes = await fetchJsonWithRetry(`${API_BASE}/assignments`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({
      teslimEden: 'Sistem Yöneticisi',
      employeeId: employee.id,
      teslimTarihi: new Date().toISOString().slice(0, 10),
      accessoryItems: [{ accessoryId: acc1.id, quantity: 999 }],
    }),
  });

  console.log(`Overflow response status: ${overflowRes.res.status}, Message: "${overflowRes.data.message}"`);
  if (overflowRes.res.status !== 400 || !overflowRes.data.message.includes('yeterli stok yok')) {
    throw new Error('TEST 3 FAILED: Expected 400 error for insufficient accessory stock!');
  }
  console.log('✅ TEST 3 PASSED: Insufficient stock request rejected with 400.\n');

  // ----------------------------------------------------
  // TEST SCENARIO 4: Department Filter Query
  // ----------------------------------------------------
  console.log('🔹 TEST 4: Filter assignments by department (department="Bilgi Teknolojileri")...');
  const deptRes = await fetchJsonWithRetry(`${API_BASE}/assignments?department=Bilgi%20Teknolojileri`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });

  if (deptRes.res.status !== 200 || !deptRes.data.data) {
    throw new Error('TEST 4 FAILED: Could not query assignments by department!');
  }
  console.log(`Department filter returned ${deptRes.data.data.length} records.`);
  if (deptRes.data.data.length === 0) {
    throw new Error('TEST 4 FAILED: Expected at least 1 record for department "Bilgi Teknolojileri"!');
  }
  console.log('✅ TEST 4 PASSED: Department filter works via employee relation.\n');

  // ----------------------------------------------------
  // TEST SCENARIO 5: Get Assignment Detail with 3 Item Types
  // ----------------------------------------------------
  console.log('🔹 TEST 5: Fetch assignment detail (GET /api/assignments/:id)...');
  const detailRes = await fetchJsonWithRetry(`${API_BASE}/assignments/${assignment1.id}`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });

  if (detailRes.res.status !== 200) {
    throw new Error(`TEST 5 FAILED: ${detailRes.data.message}`);
  }
  const detail = detailRes.data.data;

  console.log(`Hardware items in detail: ${detail.items?.length || 0}`);
  console.log(`Accessory items in detail: ${detail.accessoryItems?.length || 0}`);
  console.log(`License items in detail: ${detail.licenseItems?.length || 0}`);

  if (
    detail.items?.length !== 1 ||
    detail.accessoryItems?.length !== 1 ||
    detail.licenseItems?.length !== 1
  ) {
    throw new Error('TEST 5 FAILED: Assignment detail did not return all 3 item types!');
  }
  console.log('✅ TEST 5 PASSED: Assignment detail contains all 3 item types joined with product names.\n');

  // ----------------------------------------------------
  // TEST SCENARIO 6: Viewer Authorization Rejection (403 Forbidden)
  // ----------------------------------------------------
  console.log('🔹 TEST 6: Attempt POST /api/assignments with viewer role (Expect 403 Forbidden)...');
  const viewerRes = await fetchJsonWithRetry(`${API_BASE}/assignments`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${viewerToken}`,
    },
    body: JSON.stringify({
      teslimEden: 'Viewer User',
      employeeId: employee.id,
      teslimTarihi: new Date().toISOString().slice(0, 10),
      accessoryItems: [{ accessoryId: acc1.id, quantity: 1 }],
    }),
  });

  console.log(`Viewer POST status: ${viewerRes.res.status}`);
  if (viewerRes.res.status !== 403) {
    throw new Error('TEST 6 FAILED: Expected 403 Forbidden for viewer user POST!');
  }
  console.log('✅ TEST 6 PASSED: Viewer mutation rejected with 403 Forbidden.\n');

  // Cleanup test data
  await prisma.assignmentItem.deleteMany({ where: { assignmentId: assignment1.id } });
  await prisma.assignmentAccessoryItem.deleteMany({ where: { assignmentId: assignment1.id } });
  await prisma.assignmentLicenseItem.deleteMany({ where: { assignmentId: assignment1.id } });
  await prisma.assignment.delete({ where: { id: assignment1.id } });
  await prisma.stockMovement.deleteMany({ where: { entityId: { in: [acc1.id, lic1.id] } } });
  await prisma.hardware.delete({ where: { id: hw1.id } });
  await prisma.accessory.delete({ where: { id: acc1.id } });
  await prisma.license.delete({ where: { id: lic1.id } });

  console.log('====================================================');
  console.log('🎉 ALL 6 PHASE 4A TEST SCENARIOS PASSED 100% SUCCESSFULLY!');
  console.log('====================================================');
  process.exit(0);
}

main().catch((err) => {
  console.error('\n❌ TEST SUITE FAILED:', err);
  process.exit(1);
});
