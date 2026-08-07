import { PrismaClient } from '@prisma/client';
import app from './src/app.js';

const prisma = new PrismaClient();

async function runDecoupledAssignmentTest() {
  console.log('=== RUNNING ASSIGNMENT LICENSE DECOUPLING TEST ===\n');

  const server = app.listen(5005);
  const baseUrl = 'http://localhost:5005/api';

  try {
    // 1. Authenticate Admin
    console.log('[TEST 1] Logging in as Admin...');
    const loginRes = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@firma.com', password: 'admin123' }),
    });
    const loginJson = await loginRes.json();
    const token = loginJson.data.accessToken;
    console.log(' -> Admin Token Obtained:', !!token);

    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    };

    // 2. Fetch or Create test entities (Unit, Employee, Hardware, Accessory, Consumable)
    console.log('\n[TEST 2] Preparing test entities (Employee, Hardware, Accessory, Consumable)...');
    const unit = await prisma.unit.findFirst();
    const user = await prisma.user.findFirst();

    // Create Employee
    const tcNo = '98' + Math.floor(100000000 + Math.random() * 900000000).toString().slice(0, 9);
    const emp = await prisma.employee.create({
      data: {
        fullName: 'Test Decoupled User',
        tcNo,
        unitId: unit.id,
      },
    });

    // Create Hardware
    let varlikCategory = await prisma.category.findFirst({ where: { parentType: 'VARLIK' } });
    if (!varlikCategory) {
      varlikCategory = await prisma.category.create({ data: { parentType: 'VARLIK', name: 'Test Laptop' } });
    }
    const hw = await prisma.hardware.create({
      data: {
        categoryId: varlikCategory.id,
        brand: 'Dell',
        model: 'XPS 15',
        serialNo: `SN-DEC-${Date.now()}`,
        demirbasNo: `DM-DEC-${Date.now()}`,
        status: 'Hazir',
        createdById: user.id,
      },
    });

    // Create Accessory
    let accCategory = await prisma.category.findFirst({ where: { parentType: 'AKSESUAR' } });
    if (!accCategory) {
      accCategory = await prisma.category.create({ data: { parentType: 'AKSESUAR', name: 'Test Mouse' } });
    }
    const acc = await prisma.accessory.create({
      data: {
        name: 'Kablosuz Mouse Test',
        categoryId: accCategory.id,
        totalQuantity: 10,
        availableQuantity: 10,
        createdById: user.id,
      },
    });

    // Create Consumable
    let conCategory = await prisma.category.findFirst({ where: { parentType: 'SARF_MALZEME' } });
    if (!conCategory) {
      conCategory = await prisma.category.create({ data: { parentType: 'SARF_MALZEME', name: 'Test Kağıt' } });
    }
    const con = await prisma.consumable.create({
      data: {
        name: 'A4 Kağıt Test',
        categoryId: conCategory.id,
        totalQuantity: 100,
        availableQuantity: 100,
        createdById: user.id,
      },
    });

    console.log(' -> Test Entities Created: Employee ID:', emp.id, '| Hardware ID:', hw.id, '| Accessory ID:', acc.id, '| Consumable ID:', con.id);

    // 3. Create Assignment (Hardware + Accessory + Consumable) via POST /api/assignments
    console.log('\n[TEST 3] Creating Assignment via POST /api/assignments (Hardware + Accessory + Consumable)...');
    const assignmentBody = {
      employeeId: emp.id,
      teslimTarihi: new Date().toISOString(),
      hardwareItems: [{ hardwareId: hw.id }],
      accessoryItems: [{ accessoryId: acc.id, quantity: 1 }],
      consumableItems: [{ consumableId: con.id, quantity: 5 }],
    };

    const createAssignRes = await fetch(`${baseUrl}/assignments`, {
      method: 'POST',
      headers,
      body: JSON.stringify(assignmentBody),
    });
    const createAssignJson = await createAssignRes.json();
    console.log(' -> POST /api/assignments Status:', createAssignRes.status);
    console.log(' -> Created Assignment ID:', createAssignJson.data?.id);

    if (createAssignRes.status !== 201) {
      throw new Error(`Failed to create assignment: ${createAssignJson.message}`);
    }

    const assignmentId = createAssignJson.data.id;

    // 4. GET /api/assignments/:id - Fetch Assignment Detail
    console.log(`\n[TEST 4] Fetching Assignment Detail via GET /api/assignments/${assignmentId}...`);
    const getAssignRes = await fetch(`${baseUrl}/assignments/${assignmentId}`, { headers });
    const getAssignJson = await getAssignRes.json();
    console.log(' -> GET /api/assignments/:id Status:', getAssignRes.status);
    console.log(' -> Hardware Items Count:', getAssignJson.data?.items?.length);
    console.log(' -> Accessory Items Count:', getAssignJson.data?.accessoryItems?.length);
    console.log(' -> Consumable Items Count:', getAssignJson.data?.consumableItems?.length);
    console.log(' -> License Items Field Present:', 'licenseItems' in getAssignJson.data);

    if ('licenseItems' in getAssignJson.data && getAssignJson.data.licenseItems !== undefined) {
      throw new Error('licenseItems is still present in assignment detail response!');
    }

    // 5. Generate Assignment PDF via GET /api/assignments/:id/pdf
    console.log(`\n[TEST 5] Generating Assignment PDF via GET /api/assignments/${assignmentId}/pdf...`);
    const pdfRes = await fetch(`${baseUrl}/assignments/${assignmentId}/pdf?token=${token}`);
    const pdfBuffer = await pdfRes.arrayBuffer();
    console.log(' -> PDF Response Status:', pdfRes.status);
    console.log(' -> PDF Response Content-Type:', pdfRes.headers.get('content-type'));
    console.log(' -> Generated PDF Size:', pdfBuffer.byteLength, 'bytes');

    if (pdfRes.status !== 200 || pdfBuffer.byteLength === 0) {
      throw new Error('PDF generation failed or returned empty buffer!');
    }

    // 6. Return Assignment via POST /api/returns
    console.log('\n[TEST 6] Returning Assignment via POST /api/returns...');
    const returnBody = {
      assignmentId,
      teslimAlanIc: 'IT Test Sorumlusu',
      tarih: new Date().toISOString(),
      hardwareItems: [{ hardwareId: hw.id, resultStatus: 'Hazır' }],
      accessoryItems: [{ accessoryId: acc.id, quantity: 1, resultStatus: 'Hazır' }],
    };

    const createReturnRes = await fetch(`${baseUrl}/returns`, {
      method: 'POST',
      headers,
      body: JSON.stringify(returnBody),
    });
    const createReturnJson = await createReturnRes.json();
    console.log(' -> POST /api/returns Status:', createReturnRes.status);
    console.log(' -> Created Return ID:', createReturnJson.data?.id);
    console.log(' -> Return License Items Field Present:', 'licenseItems' in (createReturnJson.data || {}));

    if (createReturnRes.status !== 201) {
      throw new Error(`Failed to create return: ${createReturnJson.message}`);
    }

    console.log('\n=== ALL DECOUPLING TESTS PASSED WITH 100% SUCCESS ===');
  } catch (err) {
    console.error('\n[DECOUPLING TEST ERROR]', err);
    process.exitCode = 1;
  } finally {
    server.close();
    await prisma.$disconnect();
  }
}

runDecoupledAssignmentTest();
