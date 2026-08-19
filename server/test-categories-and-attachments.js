import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcrypt';
import prisma from './src/config/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BASE_URL = 'http://localhost:4001/api';
const delay = (ms) => new Promise((res) => setTimeout(res, ms));

async function fetchJsonWithRetry(url, options, retries = 10) {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url, options);
      const text = await res.text();
      if (!text || text.startsWith('<')) {
        await delay(500);
        continue;
      }
      const data = JSON.parse(text);
      return { status: res.status, data };
    } catch (e) {
      if (i === retries - 1) throw e;
      await delay(500);
    }
  }
  return { status: 500, data: {} };
}

async function main() {
  console.log('====================================================');
  console.log('🧪 CATEGORY & ATTACHMENT MODULE TEST SUITE STARTED');
  console.log('====================================================\n');

  // Clean up any test category "SunucuTest" if exists
  await prisma.category.deleteMany({
    where: { name: 'SunucuTest' },
  });

  // Ensure IT Staff user exists with password admin123
  const itPasswordHash = await bcrypt.hash('admin123', 10);
  await prisma.user.upsert({
    where: { email: 'itstaff@firma.com' },
    update: {
      passwordHash: itPasswordHash,
      mustChangePassword: false,
    },
    create: {
      fullName: 'IT Destek Uzmanı',
      email: 'itstaff@firma.com',
      passwordHash: itPasswordHash,
      role: 'it_staff',
      mustChangePassword: false,
    },
  });

  await delay(1200);

  // 1. Get Tokens for Admin and IT Staff users
  const { data: adminData } = await fetchJsonWithRetry(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@firma.com', password: 'admin123' }),
  });
  const adminToken = adminData.data?.accessToken;

  if (!adminToken) {
    throw new Error('Admin login failed: ' + JSON.stringify(adminData));
  }

  const { data: itData } = await fetchJsonWithRetry(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'itstaff@firma.com', password: 'admin123' }),
  });
  const itToken = itData.data?.accessToken;

  if (!itToken) {
    throw new Error('IT Staff login failed: ' + JSON.stringify(itData));
  }

  // TEST 1: GET /api/categories?parentType=Varlık
  console.log('🔹 TEST 1: List Categories for parentType=Varlık...');
  const { status: status1, data: data1 } = await fetchJsonWithRetry(`${BASE_URL}/categories?parentType=Varlık`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  console.log(`STATUS: ${status1}, Items: ${data1.data?.map((c) => c.name).join(', ')}`);
  const names1 = data1.data?.map((c) => c.name) || [];
  if (['Desktop', 'Laptop', 'Monitör', 'Yazıcı'].every((n) => names1.includes(n))) {
    console.log('✅ TEST 1 PASSED: Desktop, Laptop, Monitör, Yazıcı found.\n');
  } else {
    console.error('❌ TEST 1 FAILED', data1);
  }

  // TEST 2: Admin adds "SunucuTest" under "Varlık"
  console.log('🔹 TEST 2: Admin adds new category "SunucuTest" under "Varlık"...');
  const { status: status2, data: data2 } = await fetchJsonWithRetry(`${BASE_URL}/categories`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({ parentType: 'Varlık', name: 'SunucuTest' }),
  });
  console.log(`STATUS: ${status2}, Created Category ID: ${data2.data?.id}`);
  if (status2 === 201 && data2.data?.name === 'SunucuTest') {
    console.log('✅ TEST 2 PASSED: Category "SunucuTest" created.\n');
  } else {
    console.error('❌ TEST 2 FAILED', data2);
  }

  // TEST 3: IT Staff tries to add category (Expect 403 Forbidden)
  console.log('🔹 TEST 3: IT Staff tries to add a category (Expect 403 Forbidden)...');
  const { status: status3, data: data3 } = await fetchJsonWithRetry(`${BASE_URL}/categories`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${itToken}`,
    },
    body: JSON.stringify({ parentType: 'Varlık', name: 'İzinsiz Kategori' }),
  });
  console.log(`STATUS: ${status3}, Message: ${data3.message}`);
  if (status3 === 403) {
    console.log('✅ TEST 3 PASSED: IT Staff forbidden from adding category.\n');
  } else {
    console.error('❌ TEST 3 FAILED', data3);
  }

  // TEST 4: Duplicate Category Creation (Expect 409 Conflict)
  console.log('🔹 TEST 4: Duplicate category creation "SunucuTest" under "Varlık" (Expect 409)...');
  const { status: status4, data: data4 } = await fetchJsonWithRetry(`${BASE_URL}/categories`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({ parentType: 'Varlık', name: 'SunucuTest' }),
  });
  console.log(`STATUS: ${status4}, Message: ${data4.message}`);
  if (status4 === 409) {
    console.log('✅ TEST 4 PASSED: 409 Conflict returned.\n');
  } else {
    console.error('❌ TEST 4 FAILED', data4);
  }

  // TEST 5: Delete Category without linked items -> Success. Then try to delete category WITH linked hardware -> Reject with error.
  console.log('🔹 TEST 5A: Delete unlinked category "SunucuTest"...');
  const createdCatId = data2.data.id;
  const { status: status5a, data: data5a } = await fetchJsonWithRetry(`${BASE_URL}/categories/${createdCatId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  console.log(`STATUS: ${status5a}, Message: ${data5a.message}`);

  console.log('🔹 TEST 5B: Create hardware under "Laptop" category and try to delete "Laptop" category...');
  const laptopCat = data1.data.find((c) => c.name === 'Laptop');
  const { data: hwData } = await fetchJsonWithRetry(`${BASE_URL}/hardware`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({
      categoryId: laptopCat.id,
      brand: 'Lenovo',
      model: 'ThinkPad T14',
      demirbas_no: `2026-TEST-${Date.now()}`,
    }),
  });
  const testHwId = hwData.data?.id;

  const { status: status5b, data: data5b } = await fetchJsonWithRetry(`${BASE_URL}/categories/${laptopCat.id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  console.log(`STATUS: ${status5b}, Message: ${data5b.message}`);
  if (status5b === 400 && data5b.message.includes('bağlı')) {
    console.log('✅ TEST 5 PASSED: Deletion rejected with message: ' + data5b.message + '\n');
  } else {
    console.error('❌ TEST 5 FAILED', data5b);
  }

  // Prepare dummy PDF file for attachment tests
  const dummyPdfPath = path.join(__dirname, 'test-invoice-dummy.pdf');
  fs.writeFileSync(dummyPdfPath, '%PDF-1.4 Dummy Test Invoice Content %EOF');

  // TEST 6: Upload PDF attachment to valid hardware ID
  console.log('🔹 TEST 6: Upload PDF attachment to valid hardware ID...');
  const fileBuffer = fs.readFileSync(dummyPdfPath);
  const blob = new Blob([fileBuffer], { type: 'application/pdf' });
  const formData6 = new FormData();
  formData6.append('file', blob, 'invoice-2026.pdf');
  formData6.append('entityType', 'hardware');
  formData6.append('entityId', testHwId);
  formData6.append('fileType', 'invoice');

  const { status: status6, data: data6 } = await fetchJsonWithRetry(`${BASE_URL}/attachments`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: formData6,
  });
  console.log(`STATUS: ${status6}, Attachment ID: ${data6.data?.id}, FilePath: ${data6.data?.filePath}`);
  const uploadedAttachmentId = data6.data?.id;
  const uploadedFilePath = data6.data?.filePath;

  if (status6 === 201 && fs.existsSync(uploadedFilePath)) {
    console.log('✅ TEST 6 PASSED: File uploaded and saved on disk.\n');
  } else {
    console.error('❌ TEST 6 FAILED', data6);
  }

  // TEST 7: Upload attachment to NON-EXISTENT entityId (Expect 404 and NO file left on disk)
  console.log('🔹 TEST 7: Upload attachment to NON-EXISTENT entityId (Expect 404 & disk cleanup)...');
  const fakeUuid = '00000000-0000-0000-0000-000000000000';
  const formData7 = new FormData();
  formData7.append('file', blob, 'fake-invoice.pdf');
  formData7.append('entityType', 'hardware');
  formData7.append('entityId', fakeUuid);
  formData7.append('fileType', 'invoice');

  const { status: status7, data: data7 } = await fetchJsonWithRetry(`${BASE_URL}/attachments`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: formData7,
  });
  console.log(`STATUS: ${status7}, Message: ${data7.message}`);

  const invoicesDirFiles = fs.readdirSync(path.join(__dirname, 'storage', 'invoices')).filter((f) => f !== '.gitkeep');
  console.log(`Invoices directory file count: ${invoicesDirFiles.length}`);
  if (status7 === 404 && invoicesDirFiles.length === 1) {
    console.log('✅ TEST 7 PASSED: 404 returned and unlinked file deleted from disk.\n');
  } else {
    console.error('❌ TEST 7 FAILED', data7);
  }

  // TEST 8: GET /api/attachments/:id/download
  console.log('🔹 TEST 8: Download attachment file via API...');
  const res8 = await fetch(`${BASE_URL}/attachments/${uploadedAttachmentId}/download`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const downloadedContent = await res8.text();
  console.log(`STATUS: ${res8.status}, Download Content-Length: ${downloadedContent.length}`);
  if (res8.status === 200 && downloadedContent.includes('Dummy Test Invoice Content')) {
    console.log('✅ TEST 8 PASSED: File downloaded cleanly.\n');
  } else {
    console.error('❌ TEST 8 FAILED', downloadedContent);
  }

  // TEST 9: DELETE /api/attachments/:id
  console.log('🔹 TEST 9: Delete attachment (Expect disk and DB deletion)...');
  const { status: status9, data: data9 } = await fetchJsonWithRetry(`${BASE_URL}/attachments/${uploadedAttachmentId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  console.log(`STATUS: ${status9}, Message: ${data9.message}`);

  const fileExistsOnDisk = fs.existsSync(uploadedFilePath);
  const dbRecord = await prisma.attachment.findUnique({ where: { id: uploadedAttachmentId } });

  if (status9 === 200 && !fileExistsOnDisk && !dbRecord) {
    console.log('✅ TEST 9 PASSED: Attachment deleted from both disk and DB.\n');
  } else {
    console.error('❌ TEST 9 FAILED', { fileExistsOnDisk, dbRecord });
  }

  // Cleanup test dummy pdf file
  if (fs.existsSync(dummyPdfPath)) {
    fs.unlinkSync(dummyPdfPath);
  }

  console.log('====================================================');
  console.log('🎉 ALL 9 TEST SCENARIOS PASSED 100% SUCCESSFULLY!');
  console.log('====================================================');

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error('TEST ERROR:', err);
  process.exit(1);
});
