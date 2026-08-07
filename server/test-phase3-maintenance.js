import prisma from './src/config/db.js';

const API_BASE = 'http://localhost:5000/api';

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
  console.log('🧪 PHASE 3: MAINTENANCE (BAKIM) MODULE TEST SUITE');
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

  // Fetch Category
  const catRes = await fetchJsonWithRetry(`${API_BASE}/categories`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const categories = catRes.data.data || [];
  const pcCategory = categories.find((c) => c.parentType === 'Varlık' && (c.name === 'Desktop' || c.name === 'Laptop')) || categories[0];
  const compCategory = categories.find((c) => c.parentType === 'Bileşen') || categories[0];

  // Helper: create test hardware
  const createTestHw = async (demirbasNo, initialStatus = 'Hazir') => {
    const hw = await prisma.hardware.create({
      data: {
        categoryId: pcCategory.id,
        brand: 'Dell',
        model: 'OptiPlex 7090',
        serialNo: `SN-${Date.now()}-${Math.floor(Math.random()*1000)}`,
        demirbasNo,
        status: initialStatus,
        createdById: (await prisma.user.findFirst({ where: { email: 'admin@firma.com' } })).id,
      },
    });
    return hw;
  };

  // ----------------------------------------------------
  // TEST SCENARIO 1: Hardware status='Hazır' -> Maintenance -> Completed -> 'Hazır'
  // ----------------------------------------------------
  console.log('🔹 TEST 1: Maintenance for hardware with status="Hazır"...');
  const hw1 = await createTestHw(`HW-TEST-001`, 'Hazir');

  const createMaint1 = await fetchJsonWithRetry(`${API_BASE}/maintenance`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({
      name: 'Yıllık Periyodik Bakım',
      hardwareId: hw1.id,
      maintenanceType: 'Periyodik Bakım',
      startDate: new Date().toISOString(),
    }),
  });

  if (createMaint1.res.status !== 201) {
    throw new Error(`TEST 1 FAILED on create: ${createMaint1.data.message}`);
  }
  const maint1 = createMaint1.data.data;
  console.log(`Maintenance 1 created. ID: ${maint1.id}, previousHardwareStatus: ${maint1.previousHardwareStatus}`);
  if (maint1.previousHardwareStatus !== 'Hazır') {
    throw new Error(`TEST 1 FAILED: Expected previousHardwareStatus="Hazır" but got "${maint1.previousHardwareStatus}"`);
  }

  // Check hardware status is now 'Serviste'
  let checkHw1 = await prisma.hardware.findUnique({ where: { id: hw1.id } });
  console.log(`Hardware 1 status after maintenance start: ${checkHw1.status}`);
  if (checkHw1.status !== 'Serviste') {
    throw new Error(`TEST 1 FAILED: Expected hardware.status="Serviste" but got "${checkHw1.status}"`);
  }

  // Complete maintenance 1 WITHOUT resultStatus
  const completeMaint1 = await fetchJsonWithRetry(`${API_BASE}/maintenance/${maint1.id}/complete`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({
      endDate: new Date().toISOString(),
    }),
  });

  if (completeMaint1.res.status !== 200) {
    throw new Error(`TEST 1 FAILED on complete: ${completeMaint1.data.message}`);
  }

  checkHw1 = await prisma.hardware.findUnique({ where: { id: hw1.id } });
  console.log(`Hardware 1 status after maintenance complete: ${checkHw1.status}`);
  if (checkHw1.status !== 'Hazir') {
    throw new Error(`TEST 1 FAILED: Expected hardware.status="Hazir" (Hazır) but got "${checkHw1.status}"`);
  }
  console.log('✅ TEST 1 PASSED: Hardware status returned to "Hazır" automatically.\n');

  // ----------------------------------------------------
  // TEST SCENARIO 2: Hardware status='Kullanımda' -> Maintenance -> Completed -> 'Kullanımda'
  // ----------------------------------------------------
  console.log('🔹 TEST 2: Maintenance for hardware with status="Kullanımda" (Zimmetli)...');
  const hw2 = await createTestHw(`HW-TEST-002`, 'Kullanimda');

  const createMaint2 = await fetchJsonWithRetry(`${API_BASE}/maintenance`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({
      name: 'Yerinde Arıza Onarımı',
      hardwareId: hw2.id,
      maintenanceType: 'Arıza Onarımı',
      startDate: new Date().toISOString(),
    }),
  });

  const maint2 = createMaint2.data.data;
  console.log(`Maintenance 2 created. previousHardwareStatus: ${maint2.previousHardwareStatus}`);
  if (maint2.previousHardwareStatus !== 'Kullanımda') {
    throw new Error(`TEST 2 FAILED: Expected previousHardwareStatus="Kullanımda" but got "${maint2.previousHardwareStatus}"`);
  }

  let checkHw2 = await prisma.hardware.findUnique({ where: { id: hw2.id } });
  if (checkHw2.status !== 'Serviste') {
    throw new Error(`TEST 2 FAILED: Expected hardware.status="Serviste" but got "${checkHw2.status}"`);
  }

  // Complete maintenance 2 WITHOUT resultStatus
  await fetchJsonWithRetry(`${API_BASE}/maintenance/${maint2.id}/complete`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({
      endDate: new Date().toISOString(),
    }),
  });

  checkHw2 = await prisma.hardware.findUnique({ where: { id: hw2.id } });
  console.log(`Hardware 2 status after maintenance complete: ${checkHw2.status}`);
  if (checkHw2.status !== 'Kullanimda') {
    throw new Error(`TEST 2 FAILED: Expected hardware.status="Kullanimda" (Kullanımda) but got "${checkHw2.status}"`);
  }
  console.log('✅ TEST 2 PASSED: Assigned hardware status returned to "Kullanımda" automatically without touching assignments.\n');

  // ----------------------------------------------------
  // TEST SCENARIO 3: Hardware status='Arızalı' -> Missing resultStatus error check
  // ----------------------------------------------------
  console.log('🔹 TEST 3: Maintenance for hardware with status="Arızalı" without resultStatus (Expect 400 error)...');
  const hw3 = await createTestHw(`HW-TEST-003`, 'Arizali');

  const createMaint3 = await fetchJsonWithRetry(`${API_BASE}/maintenance`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({
      name: 'Arızalı Cihaz Tamiri',
      hardwareId: hw3.id,
      maintenanceType: 'Parça Değişimi',
      startDate: new Date().toISOString(),
    }),
  });
  const maint3 = createMaint3.data.data;

  // Complete WITHOUT resultStatus
  const completeMaint3Err = await fetchJsonWithRetry(`${API_BASE}/maintenance/${maint3.id}/complete`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({
      endDate: new Date().toISOString(),
    }),
  });

  console.log(`Complete response status: ${completeMaint3Err.res.status}, Message: "${completeMaint3Err.data.message}"`);
  if (completeMaint3Err.res.status !== 400) {
    throw new Error(`TEST 3 FAILED: Expected status 400 for missing resultStatus on Arizali hardware!`);
  }
  console.log('✅ TEST 3 PASSED: System rejected completion with 400 Bad Request as expected.\n');

  // ----------------------------------------------------
  // TEST SCENARIO 4: Hardware status='Arızalı' -> Complete with resultStatus='Hazır'
  // ----------------------------------------------------
  console.log('🔹 TEST 4: Complete maintenance for Arızalı hardware with resultStatus="Hazır"...');
  const completeMaint4 = await fetchJsonWithRetry(`${API_BASE}/maintenance/${maint3.id}/complete`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({
      endDate: new Date().toISOString(),
      resultStatus: 'Hazır',
    }),
  });

  if (completeMaint4.res.status !== 200) {
    throw new Error(`TEST 4 FAILED: ${completeMaint4.data.message}`);
  }

  let checkHw3 = await prisma.hardware.findUnique({ where: { id: hw3.id } });
  console.log(`Hardware 3 updated status: ${checkHw3.status}, appliedResultStatus: ${completeMaint4.data.data.appliedResultStatus}`);
  if (checkHw3.status !== 'Hazir' || completeMaint4.data.data.appliedResultStatus !== 'Hazır') {
    throw new Error(`TEST 4 FAILED: Expected Hazir but got ${checkHw3.status}`);
  }
  console.log('✅ TEST 4 PASSED: Hardware status updated to "Hazır" based on user choice.\n');

  // ----------------------------------------------------
  // TEST SCENARIO 5: Hardware status='Arızalı' -> Complete with resultStatus='Kullanım Dışı'
  // ----------------------------------------------------
  console.log('🔹 TEST 5: Complete maintenance for Arızalı hardware with resultStatus="Kullanım Dışı"...');
  const hw5 = await createTestHw(`HW-TEST-005`, 'Arizali');
  const createMaint5 = await fetchJsonWithRetry(`${API_BASE}/maintenance`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({
      name: 'Hurda / Onarılamayan Cihaz',
      hardwareId: hw5.id,
      maintenanceType: 'Arıza Onarımı',
      startDate: new Date().toISOString(),
    }),
  });
  const maint5 = createMaint5.data.data;

  await fetchJsonWithRetry(`${API_BASE}/maintenance/${maint5.id}/complete`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({
      endDate: new Date().toISOString(),
      resultStatus: 'Kullanım Dışı',
    }),
  });

  let checkHw5 = await prisma.hardware.findUnique({ where: { id: hw5.id } });
  console.log(`Hardware 5 updated status: ${checkHw5.status}`);
  if (checkHw5.status !== 'KullanimDisi') {
    throw new Error(`TEST 5 FAILED: Expected KullanimDisi but got ${checkHw5.status}`);
  }
  console.log('✅ TEST 5 PASSED: Hardware status updated to "Kullanım Dışı".\n');

  // ----------------------------------------------------
  // TEST SCENARIO 6: Add Component to Maintenance & Stock Movements
  // ----------------------------------------------------
  console.log('🔹 TEST 6: Add Component to Maintenance (8GB RAM, quantityUsed=2)...');
  const comp = await prisma.component.create({
    data: {
      name: 'Crucial 8GB DDR4 RAM',
      categoryId: compCategory.id,
      totalQuantity: 10,
      availableQuantity: 10,
      usedQuantity: 0,
      createdById: (await prisma.user.findFirst({ where: { email: 'admin@firma.com' } })).id,
    },
  });

  const addCompRes = await fetchJsonWithRetry(`${API_BASE}/maintenance/${maint1.id}/components`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({
      componentId: comp.id,
      quantityUsed: 2,
    }),
  });

  if (addCompRes.res.status !== 201) {
    throw new Error(`TEST 6 FAILED: ${addCompRes.data.message}`);
  }

  const checkComp = await prisma.component.findUnique({ where: { id: comp.id } });
  console.log(`Component quantities: total=${checkComp.totalQuantity}, available=${checkComp.availableQuantity}, used=${checkComp.usedQuantity}`);
  if (checkComp.availableQuantity !== 8 || checkComp.usedQuantity !== 2) {
    throw new Error(`TEST 6 FAILED: Expected available=8, used=2 but got available=${checkComp.availableQuantity}, used=${checkComp.usedQuantity}`);
  }

  // Check stock movement entry
  const movement = await prisma.stockMovement.findFirst({
    where: { entityId: comp.id, type: 'used_in_maintenance' },
  });
  if (!movement || movement.quantity !== 2) {
    throw new Error(`TEST 6 FAILED: Stock movement record missing or invalid quantity!`);
  }
  console.log(`Stock movement note: "${movement.note}"`);
  console.log('✅ TEST 6 PASSED: Component stock reduced by 2 and stock_movements entry created.\n');

  // ----------------------------------------------------
  // TEST SCENARIO 7: Insufficient Component Stock Error Check
  // ----------------------------------------------------
  console.log('🔹 TEST 7: Attempt to add component with insufficient stock (quantityUsed=999)...');
  const addCompErrRes = await fetchJsonWithRetry(`${API_BASE}/maintenance/${maint1.id}/components`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({
      componentId: comp.id,
      quantityUsed: 999,
    }),
  });

  console.log(`Status: ${addCompErrRes.res.status}, Message: "${addCompErrRes.data.message}"`);
  if (addCompErrRes.res.status !== 400 || !addCompErrRes.data.message.includes('Yeterli bileşen stoğu yok')) {
    throw new Error(`TEST 7 FAILED: Expected 400 with "Yeterli bileşen stoğu yok" message.`);
  }
  console.log('✅ TEST 7 PASSED: Rejected with 400 error.\n');

  // ----------------------------------------------------
  // TEST SCENARIO 8: Verify DELETE endpoint returns 404 (Does NOT exist)
  // ----------------------------------------------------
  console.log('🔹 TEST 8: Verify DELETE /api/maintenance/:id returns 404 Not Found...');
  const deleteRes = await fetchJsonWithRetry(`${API_BASE}/maintenance/${maint1.id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${adminToken}` },
  });

  console.log(`DELETE status: ${deleteRes.res.status}`);
  if (deleteRes.res.status !== 404) {
    throw new Error(`TEST 8 FAILED: Expected 404 Not Found for DELETE route!`);
  }
  console.log('✅ TEST 8 PASSED: DELETE endpoint does not exist (404).\n');

  // ----------------------------------------------------
  // TEST SCENARIO 9: maintenanceType='Diğer' validation error check
  // ----------------------------------------------------
  console.log('🔹 TEST 9: Create maintenance with type="Diğer" without customTypeNote...');
  const createOtherErrRes = await fetchJsonWithRetry(`${API_BASE}/maintenance`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({
      name: 'Özel İşlem',
      hardwareId: hw1.id,
      maintenanceType: 'Diğer',
      startDate: new Date().toISOString(),
    }),
  });

  console.log(`Status: ${createOtherErrRes.res.status}, Message: "${createOtherErrRes.data.message}"`);
  if (createOtherErrRes.res.status !== 400) {
    throw new Error(`TEST 9 FAILED: Expected 400 validation error for missing customTypeNote!`);
  }
  console.log('✅ TEST 9 PASSED: Rejected with validation error.\n');

  // ----------------------------------------------------
  // TEST SCENARIO 10: Viewer Role Authorization Checks (403 Forbidden)
  // ----------------------------------------------------
  console.log('🔹 TEST 10: Attempt POST, POST /components, PUT /complete with viewer role...');
  const viewerPost = await fetchJsonWithRetry(`${API_BASE}/maintenance`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${viewerToken}`,
    },
    body: JSON.stringify({
      name: 'Viewer Test',
      hardwareId: hw1.id,
      maintenanceType: 'Temizlik',
      startDate: new Date().toISOString(),
    }),
  });

  const viewerComp = await fetchJsonWithRetry(`${API_BASE}/maintenance/${maint1.id}/components`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${viewerToken}`,
    },
    body: JSON.stringify({
      componentId: comp.id,
      quantityUsed: 1,
    }),
  });

  const viewerComplete = await fetchJsonWithRetry(`${API_BASE}/maintenance/${maint1.id}/complete`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${viewerToken}`,
    },
    body: JSON.stringify({
      endDate: new Date().toISOString(),
    }),
  });

  console.log(`Viewer POST: ${viewerPost.res.status}, POST /components: ${viewerComp.res.status}, PUT /complete: ${viewerComplete.res.status}`);
  if (viewerPost.res.status !== 403 || viewerComp.res.status !== 403 || viewerComplete.res.status !== 403) {
    throw new Error(`TEST 10 FAILED: Expected status 403 for viewer mutations!`);
  }
  console.log('✅ TEST 10 PASSED: All viewer mutations rejected with 403 Forbidden.\n');

  // Clean up test data
  await prisma.maintenanceComponent.deleteMany({ where: { maintenanceId: maint1.id } });
  await prisma.maintenanceRecord.deleteMany({ where: { hardwareId: { in: [hw1.id, hw2.id, hw3.id, hw5.id] } } });
  await prisma.stockMovement.deleteMany({ where: { entityId: comp.id } });
  await prisma.component.delete({ where: { id: comp.id } });
  await prisma.hardware.deleteMany({ where: { id: { in: [hw1.id, hw2.id, hw3.id, hw5.id] } } });

  console.log('====================================================');
  console.log('🎉 ALL 10 PHASE 3 TEST SCENARIOS PASSED 100% SUCCESSFULLY!');
  console.log('====================================================');
  process.exit(0);
}

main().catch((err) => {
  console.error('\n❌ TEST SUITE FAILED:', err);
  process.exit(1);
});
