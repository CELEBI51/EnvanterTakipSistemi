import XLSX from 'xlsx';
import prisma from './src/config/db.js';

async function runComprehensiveTestSuite() {
  console.log('====================================================');
  console.log('  EXCEL IMPORT SUBSYSTEM FULL COMPREHENSIVE TEST SUITE  ');
  console.log('====================================================\n');

  // 1. Authenticate Admin
  const adminLoginRes = await fetch('http://127.0.0.1:5000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@firma.com', password: 'admin123' })
  });
  const adminData = await adminLoginRes.json();
  const adminToken = adminData.data?.accessToken || adminData.accessToken;

  // 2. Authenticate Viewer
  const viewerLoginRes = await fetch('http://127.0.0.1:5000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'viewer@firma.com', password: 'viewer123' })
  });
  const viewerData = await viewerLoginRes.json();
  const viewerToken = viewerData.data?.accessToken || viewerData.accessToken;

  const adminHeaders = { 'Authorization': `Bearer ${adminToken}` };
  const viewerHeaders = { 'Authorization': `Bearer ${viewerToken}` };

  // Ensure Desktop category exists for Varlık
  let desktopCategory = await prisma.category.findFirst({
    where: { name: 'Desktop', parentType: 'VARLIK' }
  });
  if (!desktopCategory) {
    desktopCategory = await prisma.category.create({
      data: { name: 'Desktop', parentType: 'VARLIK' }
    });
  }

  // ----------------------------------------------------
  // TEST SCENARIO 1: Template Download & Column Structure
  // ----------------------------------------------------
  console.log('--- TEST SCENARIO 1: Template Download & Column Structure ---');
  const tplRes = await fetch('http://127.0.0.1:5000/api/import/hardware/template', { headers: adminHeaders });
  if (tplRes.status === 200) {
    const arrayBuf = await tplRes.arrayBuffer();
    const wb = XLSX.read(Buffer.from(arrayBuf));
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const headers = XLSX.utils.sheet_to_json(sheet, { header: 1 })[0];
    console.log('Downloaded Headers:', headers);
    
    const expectedHeaders = ['Demirbaş No', 'Seri No', 'Marka', 'Model', 'Durum', 'Kategori Adı', 'Birim Adı'];
    const matches = expectedHeaders.every(h => headers.includes(h));
    if (matches) {
      console.log('RESULT SENARYO 1: PASSED (Tüm sütun başlıkları eksiksiz ve doğru)\n');
    } else {
      console.error('RESULT SENARYO 1: FAILED (Sütunlar eşleşmedi)\n');
    }
  } else {
    console.error('RESULT SENARYO 1: FAILED (HTTP Status != 200)\n');
  }

  // Helper to create Excel Buffer
  function createExcelBuffer(rows) {
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Varlık');
    return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  }

  // Helper to post formData
  async function postValidate(buffer, updateExisting = false) {
    const formData = new FormData();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    formData.append('file', blob, 'test.xlsx');

    const res = await fetch(`http://127.0.0.1:5000/api/import/hardware/validate?updateExisting=${updateExisting}`, {
      method: 'POST',
      headers: adminHeaders,
      body: formData
    });
    return res.json();
  }

  // ----------------------------------------------------
  // TEST SCENARIO 2: 5/5 Valid Rows Batch Import
  // ----------------------------------------------------
  console.log('--- TEST SCENARIO 2: 5 Valid Rows Preview & DB Commit ---');
  const batch2Prefix = 'DM-TEST2-' + Math.floor(100 + Math.random() * 900);
  const rows5 = [1, 2, 3, 4, 5].map(n => ({
    'Demirbaş No': `${batch2Prefix}-${n}`,
    'Seri No': `SN-${batch2Prefix}-${n}`,
    'Marka': 'Dell',
    'Model': 'OptiPlex 7090',
    'Durum': 'Hazir',
    'Kategori Adı': 'Desktop'
  }));

  const val2Result = await postValidate(createExcelBuffer(rows5));
  console.log(`Preview Validated Count: ${val2Result.validCount}/5, Invalid: ${val2Result.invalidCount}`);

  if (val2Result.validCount === 5) {
    const commit2Res = await fetch('http://127.0.0.1:5000/api/import/hardware/commit', {
      method: 'POST',
      headers: { ...adminHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ rows: val2Result.rows.filter(r => r.isValid) })
    });
    const commit2Data = await commit2Res.json();
    
    // Verify in DB directly
    const dbRecords = await prisma.hardware.findMany({
      where: { demirbasNo: { startsWith: batch2Prefix } }
    });

    if (commit2Data.createdCount === 5 && dbRecords.length === 5) {
      console.log(`DB Verification: Real DB count matches 5! Created records: ${dbRecords.map(r => r.demirbasNo).join(', ')}`);
      console.log('RESULT SENARYO 2: PASSED\n');
    } else {
      console.error('RESULT SENARYO 2: FAILED (DB count mismatch)\n');
    }
  } else {
    console.error('RESULT SENARYO 2: FAILED (Validation count not 5)\n');
  }

  // ----------------------------------------------------
  // TEST SCENARIO 3: 1 Invalid Category + 4 Valid Rows
  // ----------------------------------------------------
  console.log('--- TEST SCENARIO 3: 1 Invalid Category + 4 Valid Rows ---');
  const batch3Prefix = 'DM-TEST3-' + Math.floor(100 + Math.random() * 900);
  const rowsMix = [
    { 'Demirbaş No': `${batch3Prefix}-1`, 'Seri No': `SN-${batch3Prefix}-1`, 'Marka': 'HP', 'Model': 'ProDesk', 'Kategori Adı': 'BilinmeyenKategori123' },
    { 'Demirbaş No': `${batch3Prefix}-2`, 'Seri No': `SN-${batch3Prefix}-2`, 'Marka': 'HP', 'Model': 'ProDesk', 'Kategori Adı': 'Desktop' },
    { 'Demirbaş No': `${batch3Prefix}-3`, 'Seri No': `SN-${batch3Prefix}-3`, 'Marka': 'HP', 'Model': 'ProDesk', 'Kategori Adı': 'Desktop' },
    { 'Demirbaş No': `${batch3Prefix}-4`, 'Seri No': `SN-${batch3Prefix}-4`, 'Marka': 'HP', 'Model': 'ProDesk', 'Kategori Adı': 'Desktop' },
    { 'Demirbaş No': `${batch3Prefix}-5`, 'Seri No': `SN-${batch3Prefix}-5`, 'Marka': 'HP', 'Model': 'ProDesk', 'Kategori Adı': 'Desktop' },
  ];

  const val3Result = await postValidate(createExcelBuffer(rowsMix));
  console.log(`Validation Results: Valid=${val3Result.validCount}, Invalid=${val3Result.invalidCount}`);
  console.log(`Row #2 Error Message:`, val3Result.rows[0].errors);

  const validOnly4 = val3Result.rows.filter(r => r.isValid);
  const commit3Res = await fetch('http://127.0.0.1:5000/api/import/hardware/commit', {
    method: 'POST',
    headers: { ...adminHeaders, 'Content-Type': 'application/json' },
    body: JSON.stringify({ rows: validOnly4 })
  });
  const commit3Data = await commit3Res.json();

  const dbRecords3 = await prisma.hardware.findMany({
    where: { demirbasNo: { startsWith: batch3Prefix } }
  });

  if (val3Result.invalidCount === 1 && commit3Data.createdCount === 4 && dbRecords3.length === 4) {
    console.log(`DB Verification: Hatalı satır elendi, 4 geçerli kayıt DB'ye aktarıldı (${dbRecords3.map(r => r.demirbasNo).join(', ')})`);
    console.log('RESULT SENARYO 3: PASSED\n');
  } else {
    console.error('RESULT SENARYO 3: FAILED\n');
  }

  // ----------------------------------------------------
  // TEST SCENARIO 4: Existing Record Checkbox OFF vs ON
  // ----------------------------------------------------
  console.log('--- TEST SCENARIO 4: Update Existing Record Checkbox OFF vs ON ---');
  const targetDemirbasNo = `${batch2Prefix}-1`; // Already in DB from scenario 2
  const dupRow = [{
    'Demirbaş No': targetDemirbasNo,
    'Marka': 'Dell-GUNCEL',
    'Model': 'OptiPlex 9999-GUNCEL',
    'Kategori Adı': 'Desktop'
  }];

  // 4a. Checkbox OFF (updateExisting = false)
  console.log('Testing Checkbox OFF (updateExisting=false)...');
  const val4Off = await postValidate(createExcelBuffer(dupRow), false);
  console.log(`Checkbox OFF Result: Valid=${val4Off.validCount}, Invalid=${val4Off.invalidCount}, Error:`, val4Off.rows[0].errors);

  // 4b. Checkbox ON (updateExisting = true)
  console.log('Testing Checkbox ON (updateExisting=true)...');
  const val4On = await postValidate(createExcelBuffer(dupRow), true);
  console.log(`Checkbox ON Result: Valid=${val4On.validCount}, Invalid=${val4On.invalidCount}, isUpdateAction=${val4On.rows[0].isUpdateAction}`);

  const commit4Res = await fetch('http://127.0.0.1:5000/api/import/hardware/commit', {
    method: 'POST',
    headers: { ...adminHeaders, 'Content-Type': 'application/json' },
    body: JSON.stringify({ rows: val4On.rows.filter(r => r.isValid) })
  });
  const commit4Data = await commit4Res.json();

  const updatedDbRec = await prisma.hardware.findUnique({
    where: { demirbasNo: targetDemirbasNo }
  });

  if (val4Off.invalidCount === 1 && val4On.validCount === 1 && commit4Data.updatedCount === 1 && updatedDbRec.brand === 'Dell-GUNCEL') {
    console.log(`DB Verification: Record ${targetDemirbasNo} successfully updated to brand='${updatedDbRec.brand}', model='${updatedDbRec.model}'`);
    console.log('RESULT SENARYO 4: PASSED\n');
  } else {
    console.error('RESULT SENARYO 4: FAILED\n');
  }

  // ----------------------------------------------------
  // TEST SCENARIO 5: Viewer Role Authorization & Button Visibility
  // ----------------------------------------------------
  console.log('--- TEST SCENARIO 5: Viewer Role Authorization & UI Button Check ---');
  // Attempting template download with Viewer Token
  const viewerTplRes = await fetch('http://127.0.0.1:5000/api/import/hardware/template', { headers: viewerHeaders });
  console.log(`Viewer API Access Status: ${viewerTplRes.status}`);

  // Inspect React UI HardwareList.jsx code rule for viewer button check
  const fs = await import('fs');
  const hardwareListCode = fs.readFileSync('../client/src/features/hardware/pages/HardwareList.jsx', 'utf-8');
  const hasCanAddProtection = hardwareListCode.includes('canAdd &&') && hardwareListCode.includes('Excel\'den Aktar');
  
  if (viewerTplRes.status === 200 && hasCanAddProtection) {
    console.log(`UI Code Verification: Excel'den Aktar button is wrapped with 'canAdd' (admin & it_staff only). Viewer users cannot see the button.`);
    console.log('RESULT SENARYO 5: PASSED\n');
  } else {
    console.error('RESULT SENARYO 5: FAILED\n');
  }

  console.log('====================================================');
  console.log('          ALL 5 TEST SCENARIOS COMPLETED           ');
  console.log('====================================================');
}

runComprehensiveTestSuite().catch(err => {
  console.error('[SUITE ERROR]', err);
  process.exit(1);
});
