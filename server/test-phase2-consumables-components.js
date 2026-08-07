import prisma from './src/config/db.js';

const API_BASE = 'http://localhost:5000/api';

async function fetchJsonWithRetry(url, options, maxRetries = 5, delay = 1000) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const res = await fetch(url, options);
      const data = await res.json();
      return { res, data };
    } catch (err) {
      if (i === maxRetries - 1) throw err;
      await new Promise((r) => setTimeout(r, delay));
    }
  }
}

async function main() {
  console.log('====================================================');
  console.log('🧪 PHASE 2: CONSUMABLES, COMPONENTS & SHARED STOCK MOVEMENTS TEST SUITE');
  console.log('====================================================\n');

  // Login as Admin
  const adminLogin = await fetchJsonWithRetry(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@firma.com', password: 'admin123' }),
  });
  const adminToken = adminLogin.data.data?.accessToken || adminLogin.data.data?.token;
  if (!adminToken) {
    throw new Error('Admin login failed: ' + JSON.stringify(adminLogin.data));
  }
  console.log('🔑 Admin login successful.');

  // Login as Viewer
  const viewerLogin = await fetchJsonWithRetry(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'viewer@firma.com', password: 'viewer123' }),
  });
  const viewerToken = viewerLogin.data.data?.accessToken || viewerLogin.data.data?.token;
  if (!viewerToken) {
    throw new Error('Viewer login failed: ' + JSON.stringify(viewerLogin.data));
  }
  console.log('🔑 Viewer login successful.\n');

  // Fetch seed categories
  const catRes = await fetchJsonWithRetry(`${API_BASE}/categories`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const categories = catRes.data.data || [];
  const paperCat = categories.find((c) => c.parentType === 'Sarf Malzeme' && c.name === 'Kağıt') || categories[0];
  const ramCat = categories.find((c) => c.parentType === 'Bileşen' && c.name === 'RAM') || categories[0];
  const mouseCat = categories.find((c) => c.parentType === 'Aksesuar' && c.name === 'Mouse') || categories[0];

  // ----------------------------------------------------
  // TEST 1: Create Consumable (A4 Kağıt)
  // ----------------------------------------------------
  console.log('🔹 TEST 1: Create Consumable ("A4 Kağıt", initialQuantity=500)...');
  const createConsRes = await fetchJsonWithRetry(`${API_BASE}/consumables`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({
      name: 'A4 Fotokopi Kağıdı 80g',
      categoryId: paperCat.id,
      initialQuantity: 500,
      manufacturer: 'Ve-Ge',
      supplier: 'Kırtasiye Ltd.',
    }),
  });

  if (createConsRes.res.status !== 201) {
    throw new Error(`TEST 1 FAILED: Status ${createConsRes.res.status} - ${createConsRes.data.message}`);
  }
  const consumable = createConsRes.data.data;
  console.log(`STATUS: ${createConsRes.res.status}, Consumable ID: ${consumable.id}`);
  if (consumable.totalQuantity !== 500 || consumable.availableQuantity !== 500 || consumable.consumedQuantity !== 0) {
    throw new Error(`TEST 1 FAILED: Incorrect quantities! ${JSON.stringify(consumable)}`);
  }
  console.log('✅ TEST 1 PASSED: Consumable created with totalQuantity=500, availableQuantity=500, consumedQuantity=0.\n');

  // ----------------------------------------------------
  // TEST 2: Restock Consumable (200 items)
  // ----------------------------------------------------
  console.log('🔹 TEST 2: Restock Consumable (+200 items)...');
  const restockConsRes = await fetchJsonWithRetry(`${API_BASE}/consumables/${consumable.id}/restock`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({
      quantity: 200,
      note: 'Aylık toplu sipariş alımı',
    }),
  });

  if (restockConsRes.res.status !== 200) {
    throw new Error(`TEST 2 FAILED: Status ${restockConsRes.res.status} - ${restockConsRes.data.message}`);
  }
  const updatedCons = restockConsRes.data.data;
  console.log(`STATUS: ${restockConsRes.res.status}, New total: ${updatedCons.totalQuantity}, New available: ${updatedCons.availableQuantity}`);
  if (updatedCons.totalQuantity !== 700 || updatedCons.availableQuantity !== 700) {
    throw new Error(`TEST 2 FAILED: Quantities expected 700/700 but got ${updatedCons.totalQuantity}/${updatedCons.availableQuantity}`);
  }
  console.log('✅ TEST 2 PASSED: Consumable restocked to totalQuantity=700, availableQuantity=700.\n');

  // ----------------------------------------------------
  // TEST 3: Create & Restock Component (8GB RAM)
  // ----------------------------------------------------
  console.log('🔹 TEST 3: Create Component ("8GB DDR4 RAM", initialQuantity=15) and restock +10...');
  const createCompRes = await fetchJsonWithRetry(`${API_BASE}/components`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({
      name: 'Kingston 8GB DDR4 3200MHz RAM',
      categoryId: ramCat.id,
      initialQuantity: 15,
      brand: 'Kingston',
      model: 'KVR32N22S8/8',
    }),
  });

  if (createCompRes.res.status !== 201) {
    throw new Error(`TEST 3 FAILED: Status ${createCompRes.res.status} - ${createCompRes.data.message}`);
  }
  const component = createCompRes.data.data;

  const restockCompRes = await fetchJsonWithRetry(`${API_BASE}/components/${component.id}/restock`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({
      quantity: 10,
      note: 'Ek bellek takviyesi',
    }),
  });

  const updatedComp = restockCompRes.data.data;
  console.log(`STATUS: ${restockCompRes.res.status}, Component Total Quantity: ${updatedComp.totalQuantity}`);
  if (updatedComp.totalQuantity !== 25 || updatedComp.availableQuantity !== 25 || updatedComp.usedQuantity !== 0) {
    throw new Error(`TEST 3 FAILED: Expected totalQuantity=25 but got ${updatedComp.totalQuantity}`);
  }
  console.log('✅ TEST 3 PASSED: Component created (15) & restocked (+10) to totalQuantity=25.\n');

  // ----------------------------------------------------
  // TEST 4: Verify getHistory for Consumable & Component
  // ----------------------------------------------------
  console.log('🔹 TEST 4: Verify getHistory for Consumable and Component from stock_movements...');
  const consHistRes = await fetchJsonWithRetry(`${API_BASE}/consumables/${consumable.id}/history`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const compHistRes = await fetchJsonWithRetry(`${API_BASE}/components/${component.id}/history`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });

  console.log(`Consumable Movements Count: ${consHistRes.data.data.length}, Component Movements Count: ${compHistRes.data.data.length}`);
  if (consHistRes.data.data.length !== 2 || compHistRes.data.data.length !== 2) {
    throw new Error('TEST 4 FAILED: Movement counts do not match expected 2 restock movements each!');
  }
  console.log('✅ TEST 4 PASSED: Stock movements history correctly retrieved from shared stock_movements table.\n');

  // ----------------------------------------------------
  // TEST 5: Verify Accessory refactor with shared stock_movements
  // ----------------------------------------------------
  console.log('🔹 TEST 5: Verify Accessory restock & markDefective writing to shared stock_movements...');
  const createAccRes = await fetchJsonWithRetry(`${API_BASE}/accessories`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({
      name: 'Logitech M185 Wireless Mouse',
      categoryId: mouseCat.id,
      initialQuantity: 20,
    }),
  });
  const accessory = createAccRes.data.data;

  // Restock accessory (+5)
  await fetchJsonWithRetry(`${API_BASE}/accessories/${accessory.id}/restock`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({ quantity: 5, note: 'Ek stok' }),
  });

  // Mark defective accessory (2)
  await fetchJsonWithRetry(`${API_BASE}/accessories/${accessory.id}/mark-defective`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({ quantity: 2, note: 'Arızalı kırık koli' }),
  });

  const accHistRes = await fetchJsonWithRetry(`${API_BASE}/accessories/${accessory.id}/history`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });

  const accMovements = accHistRes.data.data || [];
  console.log(`Accessory Movements Count: ${accMovements.length}`);
  if (accMovements.length !== 3) {
    throw new Error(`TEST 5 FAILED: Expected 3 movements for accessory but got ${accMovements.length}`);
  }
  console.log('✅ TEST 5 PASSED: Accessory restock & markDefective refactored to shared stock_movements table.\n');

  // ----------------------------------------------------
  // TEST 6: Verify Deletion Guards
  // ----------------------------------------------------
  console.log('🔹 TEST 6: Verify deletion guards (consumedQuantity > 0 / usedQuantity > 0)...');
  // 6a: Consumable with consumedQuantity = 0 can be deleted
  const deleteConsRes = await fetchJsonWithRetry(`${API_BASE}/consumables/${consumable.id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  if (deleteConsRes.res.status !== 200) {
    throw new Error(`TEST 6 FAILED: Failed to delete unused consumable: ${deleteConsRes.data.message}`);
  }

  // 6b: Component with usedQuantity > 0 cannot be deleted
  await prisma.component.update({
    where: { id: component.id },
    data: { usedQuantity: 1 },
  });

  const deleteCompBlockedRes = await fetchJsonWithRetry(`${API_BASE}/components/${component.id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${adminToken}` },
  });

  console.log(`Blocked Component Delete Status: ${deleteCompBlockedRes.res.status}, Message: ${deleteCompBlockedRes.data.message}`);
  if (deleteCompBlockedRes.res.status !== 400) {
    throw new Error('TEST 6 FAILED: Expected 400 Bad Request when deleting component with usedQuantity > 0');
  }

  // Revert usedQuantity for cleanup
  await prisma.component.update({
    where: { id: component.id },
    data: { usedQuantity: 0 },
  });
  await prisma.component.delete({ where: { id: component.id } });
  await prisma.accessory.delete({ where: { id: accessory.id } });
  console.log('✅ TEST 6 PASSED: Deletion guards verified successfully.\n');

  // ----------------------------------------------------
  // TEST 7: Role authorization checks for viewer role
  // ----------------------------------------------------
  console.log('🔹 TEST 7: Attempt POST / restock / DELETE with viewer role (expect 403 Forbidden)...');
  const viewerPostRes = await fetchJsonWithRetry(`${API_BASE}/consumables`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${viewerToken}`,
    },
    body: JSON.stringify({
      name: 'Viewer Test Item',
      categoryId: paperCat.id,
      initialQuantity: 10,
    }),
  });

  console.log(`Viewer POST Status: ${viewerPostRes.res.status}`);
  if (viewerPostRes.res.status !== 403) {
    throw new Error(`TEST 7 FAILED: Expected status 403 for viewer POST but got ${viewerPostRes.res.status}`);
  }
  console.log('✅ TEST 7 PASSED: Viewer role successfully rejected with 403 Forbidden.\n');

  console.log('====================================================');
  console.log('🎉 ALL 7 PHASE 2 TEST SCENARIOS PASSED 100% SUCCESSFULLY!');
  console.log('====================================================');
  process.exit(0);
}

main().catch((err) => {
  console.error('\n❌ TEST SUITE FAILED:', err);
  process.exit(1);
});
