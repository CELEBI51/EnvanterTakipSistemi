import { PrismaClient } from '@prisma/client';
import app from './src/app.js';

const prisma = new PrismaClient();

async function runE2ESmokeTest() {
  console.log('=== RUNNING END-TO-END UNIT INTEGRATION SMOKE TEST ===\n');

  const server = app.listen(5004);
  const baseUrl = 'http://localhost:5004/api';

  try {
    // 0. Login Admin
    console.log('[STEP 0] Logging in as Admin...');
    const loginRes = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@firma.com', password: 'admin123' }),
    });
    const loginJson = await loginRes.json();
    const token = loginJson.data.accessToken;
    console.log(' -> Admin Token Obtained:', !!token, '| Status:', loginRes.status);

    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    };

    // 1. GET /api/units - Pick a Unit
    console.log('\n[STEP 1] Fetching Units via GET /api/units...');
    const unitsRes = await fetch(`${baseUrl}/units`, { headers });
    const unitsJson = await unitsRes.json();
    console.log(' -> Units Response Status:', unitsRes.status);
    console.log(' -> Units Found:', unitsJson.data.map((u) => `${u.name} (${u.id})`));

    const selectedUnit = unitsJson.data[0];
    if (!selectedUnit) throw new Error('No units available for testing!');
    console.log(` -> Selected Unit for Employee: "${selectedUnit.name}" (${selectedUnit.id})`);

    // 2. POST /api/employees - Create Employee with unitId
    console.log('\n[STEP 2] Creating Employee with unitId via POST /api/employees...');
    const uniqueTcNo = '99' + Math.floor(100000000 + Math.random() * 900000000).toString().slice(0, 9);
    const empData = {
      fullName: 'Test Personel Unit',
      tcNo: uniqueTcNo,
      unitId: selectedUnit.id,
      phone: '05559998877',
      email: `test.unit.${Date.now()}@firma.com`,
    };
    const createEmpRes = await fetch(`${baseUrl}/employees`, {
      method: 'POST',
      headers,
      body: JSON.stringify(empData),
    });
    const createEmpJson = await createEmpRes.json();
    console.log(' -> POST /api/employees Status:', createEmpRes.status);
    console.log(' -> Created Employee ID:', createEmpJson.data?.id);
    console.log(' -> Created Employee Unit Name:', createEmpJson.data?.unit?.name);

    if (createEmpRes.status !== 201) {
      throw new Error(`Failed to create employee: ${createEmpJson.message}`);
    }

    const createdEmpId = createEmpJson.data.id;

    // 3. GET /api/employees/:id - Fetch Employee Detail
    console.log(`\n[STEP 3] Fetching Employee Detail via GET /api/employees/${createdEmpId}...`);
    const getEmpRes = await fetch(`${baseUrl}/employees/${createdEmpId}`, { headers });
    const getEmpJson = await getEmpRes.json();
    console.log(' -> GET /api/employees/:id Status:', getEmpRes.status);
    console.log(' -> Employee Name:', getEmpJson.data?.fullName);
    console.log(' -> Employee Unit object:', getEmpJson.data?.unit);

    if (!getEmpJson.data?.unit?.id || getEmpJson.data.unit.name !== selectedUnit.name) {
      throw new Error('Employee unit relation check failed!');
    }

    // 4. Ensure a Hardware exists and Create Assignment via POST /api/assignments
    console.log('\n[STEP 4] Ensuring Hardware item exists and creating Assignment...');
    let hardware = await prisma.hardware.findFirst({ where: { status: 'Hazir' } });
    if (!hardware) {
      let category = await prisma.category.findFirst({ where: { parentType: 'VARLIK' } });
      if (!category) {
        category = await prisma.category.create({
          data: { parentType: 'VARLIK', name: 'Test Laptop Cat' },
        });
      }
      hardware = await prisma.hardware.create({
        data: {
          categoryId: category.id,
          brand: 'TestBrand',
          model: 'TestModel',
          serialNo: `SN-TEST-${Date.now()}`,
          demirbasNo: `DM-TEST-${Date.now()}`,
          status: 'Hazir',
          createdById: loginJson.data.user.id,
        },
      });
    }

    console.log(` -> Selected Hardware: ${hardware.demirbasNo} (${hardware.brand} ${hardware.model})`);

    const assignmentData = {
      employeeId: createdEmpId,
      teslimTarihi: new Date().toISOString(),
      hardwareItems: [{ hardwareId: hardware.id }],
    };

    const createAssignRes = await fetch(`${baseUrl}/assignments`, {
      method: 'POST',
      headers,
      body: JSON.stringify(assignmentData),
    });
    const createAssignJson = await createAssignRes.json();
    console.log(' -> POST /api/assignments Status:', createAssignRes.status);
    console.log(' -> Created Assignment ID:', createAssignJson.data?.id);

    if (createAssignRes.status !== 201) {
      throw new Error(`Failed to create assignment: ${createAssignJson.message}`);
    }

    const createdAssignmentId = createAssignJson.data.id;

    // 5. GET /api/assignments/:id - Fetch Assignment Detail
    console.log(`\n[STEP 5] Fetching Assignment Detail via GET /api/assignments/${createdAssignmentId}...`);
    const getAssignRes = await fetch(`${baseUrl}/assignments/${createdAssignmentId}`, { headers });
    const getAssignJson = await getAssignRes.json();
    console.log(' -> GET /api/assignments/:id Status:', getAssignRes.status);
    console.log(' -> Assignment Employee Name:', getAssignJson.data?.employee?.fullName);
    console.log(' -> Assignment Employee Unit Name:', getAssignJson.data?.employee?.unit?.name);

    if (getAssignJson.data?.employee?.unit?.name !== selectedUnit.name) {
      throw new Error('Assignment employee unit relation failed!');
    }

    // 6. Generate Assignment PDF via GET /api/assignments/:id/pdf
    console.log(`\n[STEP 6] Testing Assignment PDF Generation via GET /api/assignments/${createdAssignmentId}/pdf...`);
    const pdfRes = await fetch(`${baseUrl}/assignments/${createdAssignmentId}/pdf?token=${token}`);
    const pdfBuffer = await pdfRes.arrayBuffer();
    console.log(' -> PDF Response Status:', pdfRes.status);
    console.log(' -> PDF Response Content-Type:', pdfRes.headers.get('content-type'));
    console.log(' -> Generated PDF Size:', pdfBuffer.byteLength, 'bytes');

    if (pdfRes.status !== 200 || pdfBuffer.byteLength === 0) {
      throw new Error('PDF generation failed or returned empty buffer!');
    }

    // 7. POST /api/returns - Return Assignment
    console.log('\n[STEP 7] Returning Assignment via POST /api/returns...');
    const returnData = {
      assignmentId: createdAssignmentId,
      teslimAlanIc: 'IT Sorumlusu',
      tarih: new Date().toISOString(),
      notes: 'Test iadesi',
      hardwareItems: [{ hardwareId: hardware.id, resultStatus: 'Hazır' }],
    };

    const createReturnRes = await fetch(`${baseUrl}/returns`, {
      method: 'POST',
      headers,
      body: JSON.stringify(returnData),
    });
    const createReturnJson = await createReturnRes.json();
    console.log(' -> POST /api/returns Status:', createReturnRes.status);
    console.log(' -> Created Return ID:', createReturnJson.data?.id);
    console.log(' -> Return Assignment Employee Unit:', createReturnJson.data?.assignment?.employee?.unit);

    if (createReturnRes.status !== 201) {
      throw new Error(`Failed to create return: ${createReturnJson.message}`);
    }

    // 8. Validation Failure Test: POST /api/employees without unitId (Expect 400)
    console.log('\n[STEP 8] Validation Failure Test (POST /api/employees without unitId)...');
    const invalidEmpData = {
      fullName: 'Eksik Birim Personel',
      tcNo: '88776655443',
      // unitId missing
    };

    const invalidRes = await fetch(`${baseUrl}/employees`, {
      method: 'POST',
      headers,
      body: JSON.stringify(invalidEmpData),
    });
    const invalidJson = await invalidRes.json();
    console.log(' -> Invalid POST Status Code:', invalidRes.status, '(Expected: 400)');
    console.log(' -> Response Message/Errors:', invalidJson.message || invalidJson.errors);

    if (invalidRes.status !== 400) {
      throw new Error(`Expected status 400 but got ${invalidRes.status}`);
    }

    console.log('\n=== ALL 8 END-TO-END INTEGRATION STEPS PASSED WITH 100% SUCCESS ===');
  } catch (err) {
    console.error('\n[SMOKE TEST ERROR]', err);
    process.exitCode = 1;
  } finally {
    server.close();
    await prisma.$disconnect();
  }
}

runE2ESmokeTest();
