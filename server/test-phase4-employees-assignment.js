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
  console.log('🧪 TEST SUITE: AUTOMATIC TESLİMEDEN & EMPLOYEES CRUD');
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

  if (!adminToken || !viewerToken) throw new Error('Logins failed!');
  console.log('🔑 Logins successful.\n');

  const adminUser = await prisma.user.findFirst({ where: { email: 'admin@firma.com' } });

  // Get/Create Employee for assignment test
  let empAhmet = await prisma.employee.findFirst({ where: { fullName: { contains: 'Ahmet', mode: 'insensitive' } } });
  if (!empAhmet) {
    empAhmet = await prisma.employee.create({
      data: {
        fullName: 'Ahmet Yılmaz',
        tcNo: '11111111199',
        department: 'Bilgi Teknolojileri',
        phone: '05321112233',
        email: 'ahmet.yilmaz@ditas.com.tr',
      },
    });
  }

  const category = await prisma.category.findFirst({ where: { parentType: 'LISANS' } }) || await prisma.category.findFirst();
  const license = await prisma.license.create({
    data: {
      name: 'Test Auto Assignment License',
      categoryId: category.id,
      totalQuantity: 10,
      availableQuantity: 10,
      assignedQuantity: 0,
      endDate: new Date('2029-01-01'),
      createdById: adminUser.id,
    },
  });

  // ----------------------------------------------------
  // TEST SCENARIO 1: Create Assignment WITHOUT teslimEden in body
  // ----------------------------------------------------
  console.log('🔹 TEST 1: Create assignment WITHOUT sending teslimEden in body...');
  const assignRes = await fetchWithRetry(`${API_BASE}/assignments`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({
      employeeId: empAhmet.id,
      teslimTarihi: new Date().toISOString().slice(0, 10),
      licenseItems: [{ licenseId: license.id, quantity: 1 }],
    }),
  });

  const assignData = await assignRes.json();
  if (assignRes.status !== 201) {
    throw new Error(`TEST 1 FAILED: ${assignData.message}`);
  }

  console.log(`Assignment created. ID: ${assignData.data.id}`);
  console.log(`Assignment.teslimEden: "${assignData.data.teslimEden}" (Expected: "${adminUser.fullName}")`);

  if (assignData.data.teslimEden !== adminUser.fullName) {
    throw new Error(`TEST 1 FAILED: Expected teslimEden to be "${adminUser.fullName}", got "${assignData.data.teslimEden}"`);
  }
  console.log('✅ TEST 1 PASSED: teslimEden was automatically populated with logged-in admin user fullName.\n');

  // ----------------------------------------------------
  // TEST SCENARIO 2: Search Employee via GET /api/employees?q=Ahmet
  // ----------------------------------------------------
  console.log('🔹 TEST 2: Search employee via GET /api/employees?q=Ahmet...');
  const searchRes = await fetchWithRetry(`${API_BASE}/employees?q=Ahmet`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });

  const searchData = await searchRes.json();
  console.log(`Search status: ${searchRes.status}, count: ${searchData.data?.length}`);

  if (searchRes.status !== 200 || !searchData.data || searchData.data.length === 0) {
    throw new Error('TEST 2 FAILED: Employee search by name did not return results!');
  }
  console.log(`Found employee: "${searchData.data[0].fullName}" (${searchData.data[0].tcNo})`);
  console.log('✅ TEST 2 PASSED: Employee search with q query parameter works correctly.\n');

  // ----------------------------------------------------
  // TEST SCENARIO 3: Employee Creation & 409 Duplicate TC No Rejection
  // ----------------------------------------------------
  console.log('🔹 TEST 3: Create employee and verify 409 Conflict rejection for duplicate tcNo...');
  const testTcNo = '44444444444';

  // Clean up any old test record with testTcNo if exists
  await prisma.employee.deleteMany({ where: { tcNo: testTcNo } });

  const createEmpRes = await fetchWithRetry(`${API_BASE}/employees`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({
      fullName: 'Mustafa Kaya',
      tcNo: testTcNo,
      department: 'Lojistik',
      phone: '05553332211',
      email: 'mustafa.kaya@ditas.com.tr',
    }),
  });

  const createEmpData = await createEmpRes.json();
  if (createEmpRes.status !== 201) {
    throw new Error(`TEST 3 FAILED on initial creation: ${createEmpData.message}`);
  }
  console.log(`Employee created: ${createEmpData.data.fullName} (${createEmpData.data.tcNo})`);

  // Attempt second creation with SAME tcNo
  const dupEmpRes = await fetchWithRetry(`${API_BASE}/employees`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({
      fullName: 'Mustafa Kaya Duplicate',
      tcNo: testTcNo,
      department: 'Lojistik',
    }),
  });

  const dupEmpData = await dupEmpRes.json();
  console.log(`Duplicate create status: ${dupEmpRes.status}, Message: "${dupEmpData.message}"`);

  if (dupEmpRes.status !== 409) {
    throw new Error('TEST 3 FAILED: Expected 409 Conflict status for duplicate tcNo!');
  }
  console.log('✅ TEST 3 PASSED: Employee created and duplicate tcNo rejected with 409 Conflict.\n');

  // ----------------------------------------------------
  // TEST SCENARIO 4: Viewer Role Rejection for Employee Creation
  // ----------------------------------------------------
  console.log('🔹 TEST 4: Attempt POST /api/employees with viewer role (Expect 403 Forbidden)...');
  const viewerCreateRes = await fetchWithRetry(`${API_BASE}/employees`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${viewerToken}`,
    },
    body: JSON.stringify({
      fullName: 'Viewer Created Personel',
      tcNo: '55555555555',
      department: 'Finans',
    }),
  });

  console.log(`Viewer POST status: ${viewerCreateRes.status}`);
  if (viewerCreateRes.status !== 403) {
    throw new Error('TEST 4 FAILED: Expected 403 Forbidden for viewer user employee creation!');
  }
  console.log('✅ TEST 4 PASSED: Viewer employee creation rejected with 403 Forbidden.\n');

  // Cleanup test records
  await prisma.assignmentLicenseItem.deleteMany({ where: { assignmentId: assignData.data.id } });
  await prisma.assignment.delete({ where: { id: assignData.data.id } });
  await prisma.license.delete({ where: { id: license.id } });
  await prisma.employee.deleteMany({ where: { tcNo: testTcNo } });

  console.log('====================================================');
  console.log('🎉 ALL 4 TEST SCENARIOS PASSED 100% SUCCESSFULLY!');
  console.log('====================================================');
  process.exit(0);
}

main().catch((err) => {
  console.error('\n❌ TEST SUITE FAILED:', err);
  process.exit(1);
});
