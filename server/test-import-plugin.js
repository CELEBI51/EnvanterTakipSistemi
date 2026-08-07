export async function runImportTest() {
  console.log('[TEST] Starting General Import Plugin System Integration Test...');

  // 1. Login
  const loginRes = await fetch('http://127.0.0.1:5000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@firma.com', password: 'admin123' })
  });
  const loginData = await loginRes.json();
  const token = loginData.data?.accessToken || loginData.accessToken || loginData.token;
  console.log('[TEST] Login successful as Admin. Token:', token ? 'OK' : 'MISSING');

  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };

  // 2. Test GET Template Endpoint for 'hardware'
  console.log('[TEST] Fetching template for moduleKey=hardware...');
  const templateRes = await fetch('http://127.0.0.1:5000/api/import/hardware/template', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  if (templateRes.status === 200) {
    const arrayBuf = await templateRes.arrayBuffer();
    console.log('[TEST] Template endpoint PASSED (Received XLSX buffer size: ' + arrayBuf.byteLength + ' bytes)');
  } else {
    const errText = await templateRes.text();
    throw new Error(`Template endpoint failed with status ${templateRes.status}: ${errText}`);
  }

  // 3. Test Validate & Commit for 'hardware'
  console.log('[TEST] Testing commit endpoint via registry for moduleKey=hardware...');
  const testDemirbasNo = 'DM-IMP-' + Math.floor(1000 + Math.random() * 9000);
  
  // Fetch a category first to resolve
  const categoriesRes = await fetch('http://127.0.0.1:5000/api/categories?parentType=Varlık', { headers });
  const categoriesData = await categoriesRes.json();
  let categoryId = null;
  if (categoriesData.data && categoriesData.data.length > 0) {
    categoryId = categoriesData.data[0].id;
  } else {
    throw new Error('No category found for testing!');
  }

  const mockCommitPayload = {
    rows: [
      {
        data: {
          demirbasNo: testDemirbasNo,
          brand: 'TestBrand',
          model: 'TestModel',
          status: 'Hazir',
          categoryName: 'Desktop'
        },
        resolvedRefs: {
          categoryId
        }
      }
    ]
  };

  const commitRes = await fetch('http://127.0.0.1:5000/api/import/hardware/commit', {
    method: 'POST',
    headers,
    body: JSON.stringify(mockCommitPayload)
  });
  const commitData = await commitRes.json();

  if (commitRes.status === 200 && commitData.success && commitData.createdCount === 1) {
    console.log(`[TEST] Commit endpoint PASSED (Created 1 hardware record with Demirbaş No: ${testDemirbasNo})`);
  } else {
    throw new Error('Commit endpoint failed: ' + JSON.stringify(commitData));
  }

  console.log('[TEST] All Import Plugin Registry tests COMPLETED SUCCESSFULLY!');
}

runImportTest().catch((err) => {
  console.error('[TEST ERROR]', err);
  process.exit(1);
});
