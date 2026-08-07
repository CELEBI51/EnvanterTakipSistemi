import XLSX from 'xlsx';
import prisma from './src/config/db.js';

async function run5ModulesComprehensiveTest() {
  console.log('====================================================');
  console.log('  5 MODULES EXCEL IMPORT FULL INTEGRATION TEST SUITE ');
  console.log('====================================================\n');

  // Authenticate Admin
  const adminLoginRes = await fetch('http://127.0.0.1:5000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@firma.com', password: 'admin123' })
  });
  const adminData = await adminLoginRes.json();
  const adminToken = adminData.data?.accessToken || adminData.accessToken;
  const adminHeaders = { 'Authorization': `Bearer ${adminToken}` };

  // Ensure default category & unit seeds exist for testing
  let accCat = await prisma.category.findFirst({ where: { name: 'Mouse', parentType: 'AKSESUAR' } });
  if (!accCat) accCat = await prisma.category.create({ data: { name: 'Mouse', parentType: 'AKSESUAR' } });

  let conCat = await prisma.category.findFirst({ where: { name: 'Kağıt', parentType: 'SARF_MALZEME' } });
  if (!conCat) conCat = await prisma.category.create({ data: { name: 'Kağıt', parentType: 'SARF_MALZEME' } });

  let cmpCat = await prisma.category.findFirst({ where: { name: 'RAM', parentType: 'BILESEN' } });
  if (!cmpCat) cmpCat = await prisma.category.create({ data: { name: 'RAM', parentType: 'BILESEN' } });

  let defaultUnit = await prisma.unit.findFirst({ where: { name: 'Bilgi İşlemleri' } });
  if (!defaultUnit) defaultUnit = await prisma.unit.create({ data: { name: 'Bilgi İşlemleri', isActive: true } });

  // Helper function to create Excel Buffer
  function createExcelBuffer(sheetName, rows) {
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
    return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  }

  // Helper to post validate
  async function postValidate(moduleKey, buffer, updateExisting = false) {
    const formData = new FormData();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    formData.append('file', blob, 'test.xlsx');

    const res = await fetch(`http://127.0.0.1:5000/api/import/${moduleKey}/validate?updateExisting=${updateExisting}`, {
      method: 'POST',
      headers: adminHeaders,
      body: formData
    });
    return res.json();
  }

  // ----------------------------------------------------
  // MODULE 1: ACCESSORY (Aksesuar)
  // ----------------------------------------------------
  console.log('--- MODULE 1: ACCESSORY (Aksesuar) INTEGRATION TEST ---');
  // 1a. Template
  const accTplRes = await fetch('http://127.0.0.1:5000/api/import/accessory/template', { headers: adminHeaders });
  const accTplBuf = await accTplRes.arrayBuffer();
  const accHeaders = XLSX.utils.sheet_to_json(XLSX.read(Buffer.from(accTplBuf)).Sheets['Aksesuar'], { header: 1 })[0];
  console.log('Accessory Headers:', accHeaders);

  // 1b. Batch Import 5 valid rows
  const accBatch = 'ACC-TEST-' + Math.floor(100 + Math.random() * 900);
  const accRows = [1, 2, 3, 4, 5].map(n => ({
    'Aksesuar Adı': `${accBatch}-${n}`,
    'Toplam Adet': 15,
    'Marka': 'Logitech',
    'Kategori Adı': 'Mouse'
  }));

  const accVal = await postValidate('accessory', createExcelBuffer('Aksesuar', accRows));
  console.log(`Accessory Validation: Valid=${accVal.validCount}/5, Invalid=${accVal.invalidCount}`);

  const accCommitRes = await fetch('http://127.0.0.1:5000/api/import/accessory/commit', {
    method: 'POST',
    headers: { ...adminHeaders, 'Content-Type': 'application/json' },
    body: JSON.stringify({ rows: accVal.rows.filter(r => r.isValid) })
  });
  const accCommitData = await accCommitRes.json();

  const accDb = await prisma.accessory.findMany({ where: { name: { startsWith: accBatch } } });
  console.log(`DB Verification: Created=${accCommitData.createdCount}, Real DB Count=${accDb.length}, AvailableQty=${accDb[0]?.availableQuantity}`);
  console.log(`RESULT ACCESSORY: ${accDb.length === 5 && accDb[0].availableQuantity === 15 ? 'PASSED' : 'FAILED'}\n`);

  // ----------------------------------------------------
  // MODULE 2: LICENSE (Lisans)
  // ----------------------------------------------------
  console.log('--- MODULE 2: LICENSE (Lisans) INTEGRATION TEST ---');
  // 2a. Template
  const licTplRes = await fetch('http://127.0.0.1:5000/api/import/license/template', { headers: adminHeaders });
  const licTplBuf = await licTplRes.arrayBuffer();
  const licHeaders = XLSX.utils.sheet_to_json(XLSX.read(Buffer.from(licTplBuf)).Sheets['Lisans'], { header: 1 })[0];
  console.log('License Headers:', licHeaders);

  // 2b. Batch Import 5 valid rows + uniqueKey duplicate check
  const licKeyUnique = 'KEY-' + Math.floor(1000 + Math.random() * 9000);
  const licRows = [
    { 'Marka': 'JetBrains', 'Ürün Bilgisi': 'WebStorm', 'Lisans Anahtarı': licKeyUnique, 'Başlangıç Tarihi': '2026-01-01', 'Bitiş Tarihi': '2027-01-01', 'Birim Adı': 'Bilgi İşlemleri' },
  ];

  const licVal1 = await postValidate('license', createExcelBuffer('Lisans', licRows));
  await fetch('http://127.0.0.1:5000/api/import/license/commit', {
    method: 'POST',
    headers: { ...adminHeaders, 'Content-Type': 'application/json' },
    body: JSON.stringify({ rows: licVal1.rows })
  });

  const licDb1 = await prisma.license.findFirst({ where: { licenseKey: licKeyUnique } });
  console.log(`DB Verification 1: License created with Unit ID=${licDb1?.unitId}`);

  // Test duplicate licenseKey with updateExisting=false vs true
  const licDupValOff = await postValidate('license', createExcelBuffer('Lisans', licRows), false);
  const licDupValOn = await postValidate('license', createExcelBuffer('Lisans', licRows), true);
  console.log(`License Duplicate Check: OFF Invalid=${licDupValOff.invalidCount}, ON Valid=${licDupValOn.validCount}, isUpdateAction=${licDupValOn.rows[0]?.isUpdateAction}`);
  console.log(`RESULT LICENSE: ${licDb1?.unitId && licDupValOff.invalidCount === 1 && licDupValOn.validCount === 1 ? 'PASSED' : 'FAILED'}\n`);

  // ----------------------------------------------------
  // MODULE 3: CONSUMABLE (Sarf Malzeme)
  // ----------------------------------------------------
  console.log('--- MODULE 3: CONSUMABLE (Sarf Malzeme) INTEGRATION TEST ---');
  const conBatch = 'CON-TEST-' + Math.floor(100 + Math.random() * 900);
  const conRows = [
    { 'Sarf Malzeme Adı': `${conBatch}-1`, 'Toplam Adet': 100, 'Kategori Adı': 'Kağıt' }
  ];

  const conVal = await postValidate('consumable', createExcelBuffer('Sarf Malzeme', conRows));
  await fetch('http://127.0.0.1:5000/api/import/consumable/commit', {
    method: 'POST',
    headers: { ...adminHeaders, 'Content-Type': 'application/json' },
    body: JSON.stringify({ rows: conVal.rows })
  });

  const conDb = await prisma.consumable.findFirst({ where: { name: `${conBatch}-1` } });
  console.log(`DB Verification: TotalQty=${conDb?.totalQuantity}, AvailableQty=${conDb?.availableQuantity}, ConsumedQty=${conDb?.consumedQuantity}`);
  console.log(`RESULT CONSUMABLE: ${conDb?.availableQuantity === 100 && conDb?.consumedQuantity === 0 ? 'PASSED' : 'FAILED'}\n`);

  // ----------------------------------------------------
  // MODULE 4: COMPONENT (Bileşen)
  // ----------------------------------------------------
  console.log('--- MODULE 4: COMPONENT (Bileşen) INTEGRATION TEST ---');
  const cmpBatch = 'CMP-TEST-' + Math.floor(100 + Math.random() * 900);
  const cmpRows = [
    { 'Bileşen Adı': `${cmpBatch}-1`, 'Toplam Adet': 25, 'Kategori Adı': 'RAM' }
  ];

  const cmpVal = await postValidate('component', createExcelBuffer('Bileşen', cmpRows));
  await fetch('http://127.0.0.1:5000/api/import/component/commit', {
    method: 'POST',
    headers: { ...adminHeaders, 'Content-Type': 'application/json' },
    body: JSON.stringify({ rows: cmpVal.rows })
  });

  const cmpDb = await prisma.component.findFirst({ where: { name: `${cmpBatch}-1` } });
  console.log(`DB Verification: TotalQty=${cmpDb?.totalQuantity}, AvailableQty=${cmpDb?.availableQuantity}`);
  console.log(`RESULT COMPONENT: ${cmpDb?.availableQuantity === 25 ? 'PASSED' : 'FAILED'}\n`);

  // ----------------------------------------------------
  // MODULE 5: EMPLOYEE (Personel) + TC REGEX VALIDATION
  // ----------------------------------------------------
  console.log('--- MODULE 5: EMPLOYEE (Personel) + TC REGEX TEST ---');
  const empTcValid = String(Math.floor(10000000000 + Math.random() * 89999999999));
  const empRows = [
    { 'Ad Soyad': 'Test Personel 11 Hane', 'TC No': empTcValid, 'Birim Adı': 'Bilgi İşlemleri' },
    { 'Ad Soyad': 'Hatalı Personel 10 Hane', 'TC No': '1234567890', 'Birim Adı': 'Bilgi İşlemleri' },
    { 'Ad Soyad': 'Hatalı Personel Harfli', 'TC No': '1234567890A', 'Birim Adı': 'Bilgi İşlemleri' }
  ];

  const empVal = await postValidate('employee', createExcelBuffer('Personel', empRows));
  console.log(`Employee Validation: Valid=${empVal.validCount}, Invalid=${empVal.invalidCount}`);
  console.log(`Row #1 (Valid TC):`, empVal.rows[0].errors);
  console.log(`Row #2 (10 Digit TC Error):`, empVal.rows[1].errors);
  console.log(`Row #3 (Alpha TC Error):`, empVal.rows[2].errors);

  const empCommitRes = await fetch('http://127.0.0.1:5000/api/import/employee/commit', {
    method: 'POST',
    headers: { ...adminHeaders, 'Content-Type': 'application/json' },
    body: JSON.stringify({ rows: empVal.rows.filter(r => r.isValid) })
  });
  const empCommitData = await empCommitRes.json();

  const empDb = await prisma.employee.findUnique({ where: { tcNo: empTcValid } });
  console.log(`DB Verification: Valid TC Created=${empCommitData.createdCount}, Real DB Employee Name=${empDb?.fullName}, UnitId=${empDb?.unitId}`);
  
  const tcRegexPassed = empVal.validCount === 1 && empVal.invalidCount === 2 && empDb?.tcNo === empTcValid;
  console.log(`RESULT EMPLOYEE (TC Regex + Import): ${tcRegexPassed ? 'PASSED' : 'FAILED'}\n`);

  console.log('====================================================');
  console.log('    ALL 5 MODULE INTEGRATION TESTS COMPLETED       ');
  console.log('====================================================');
}

run5ModulesComprehensiveTest().catch(err => {
  console.error('[SUITE ERROR]', err);
  process.exit(1);
});
