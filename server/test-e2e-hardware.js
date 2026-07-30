import prisma from './src/config/db.js';

const API_BASE = 'http://localhost:5000/api';

async function runE2ETests() {
  console.log('\n======================================================');
  console.log('  DASHBOARD & HARDWARE MODÜLÜ E2E TEST SENARYOLARI');
  console.log('======================================================\n');

  // Clear existing hardware items for a clean test state
  await prisma.hardware.deleteMany();
  console.log('🧹 [CLEANUP] Mevcut donanım test kayıtları temizlendi.');

  // 1. Admin Login
  console.log('\n--- SENARYO 1: Admin Girişi ve İstatistiklerin Doğrulanması ---');
  const adminLoginRes = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@firma.com', password: 'admin123' }),
  });
  const adminLoginData = await adminLoginRes.json();
  const adminToken = adminLoginData.data.accessToken;
  console.log('✅ Admin girişi başarılı!');

  // Initial Stats check
  const initialStatsRes = await fetch(`${API_BASE}/reports/dashboard-stats`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const initialStats = await initialStatsRes.json();
  console.log('✅ Başlangıç İstatistikleri:', {
    total: initialStats.data.totalCount,
    assigned: initialStats.data.assignedCount,
    ready: initialStats.data.readyCount,
    faulty: initialStats.data.faultyCount,
  });
  if (initialStats.data.totalCount !== 0) throw new Error('Başlangıçta toplam sayı 0 olmalıydı!');

  // 2. Add New Desktop Item (Auto DMB No)
  console.log('\n--- SENARYO 2: Otomatik DMB No ile Yeni Desktop Ekleme ---');
  const addAutoRes = await fetch(`${API_BASE}/hardware`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({
      mode: 'new',
      category: 'Desktop',
      brand: 'Dell',
      model: 'OptiPlex 7090',
      serial_no: 'SN-OPT-001',
      specs: { cpu: 'i7-12700', ram: '16GB', gpu: 'Intel UHD', dvd: true },
    }),
  });
  const addAutoData = await addAutoRes.json();
  const year = new Date().getFullYear();
  const expectedAutoDmb = `DMB-${year}-0001`;

  console.log('✅ Oluşturulan Ürün ID:', addAutoData.data.id);
  console.log('✅ Otomatik Demirbaş No:', addAutoData.data.demirbasNo);

  if (addAutoData.data.demirbasNo !== expectedAutoDmb) {
    throw new Error(`Beklenen DMB no ${expectedAutoDmb} fakat gelen: ${addAutoData.data.demirbasNo}`);
  }

  // 3. Add Existing Mode Item & Duplicate 409 Test
  console.log('\n--- SENARYO 3: Mevcut Ürün (Elle DMB No) & 409 Çakışma Testi ---');
  const addExistRes = await fetch(`${API_BASE}/hardware`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({
      mode: 'existing',
      demirbas_no: 'EXIST-1001',
      category: 'Laptop',
      brand: 'Lenovo',
      model: 'ThinkPad T14',
    }),
  });
  const addExistData = await addExistRes.json();
  console.log('✅ Manuel Demirbaş No ile Ürün Eklendi:', addExistData.data.demirbasNo);

  // Try adding duplicate
  const addDupRes = await fetch(`${API_BASE}/hardware`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({
      mode: 'existing',
      demirbas_no: 'EXIST-1001',
      category: 'Laptop',
      brand: 'Lenovo',
      model: 'ThinkPad T14',
    }),
  });
  const addDupData = await addDupRes.json();
  console.log('✅ Çakışan Demirbaş No İsteği Yanıtı:', addDupRes.status, addDupData.message);
  if (addDupRes.status !== 409) {
    throw new Error('Aynı demirbaş no ile tekrar ekleme 409 hatası vermeliydi!');
  }

  // 4. Pagination Test (Add 10 more items -> Total 12 items)
  console.log('\n--- SENARYO 4: Sayfalama (Pagination) Testi (12 Ürün) ---');
  for (let i = 1; i <= 10; i++) {
    await fetch(`${API_BASE}/hardware`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        mode: 'new',
        category: i % 2 === 0 ? 'Monitör' : 'Yazıcı',
        brand: `Marka-${i}`,
        model: `Model-${i}`,
      }),
    });
  }

  const page1Res = await fetch(`${API_BASE}/hardware?page=1`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const page1Data = await page1Res.json();
  console.log('✅ Page 1 Verisi:', {
    itemCount: page1Data.data.items.length,
    totalCount: page1Data.data.totalCount,
    totalPages: page1Data.data.totalPages,
  });

  const page2Res = await fetch(`${API_BASE}/hardware?page=2`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const page2Data = await page2Res.json();
  console.log('✅ Page 2 Verisi:', {
    itemCount: page2Data.data.items.length,
    page: page2Data.data.page,
  });

  if (page1Data.data.items.length !== 10 || page2Data.data.items.length !== 2) {
    throw new Error('Sayfalama 10 kayıt limitini düzgün uygulamıyor!');
  }

  // 5. Update Status & Dashboard Refresh Verification
  console.log('\n--- SENARYO 5: Ürün Durumunu "Arızalı" Yapma & Dashboard Güncellemesi ---');
  const targetId = addAutoData.data.id;
  const updateRes = await fetch(`${API_BASE}/hardware/${targetId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({ status: 'Arizali' }),
  });
  const updateData = await updateRes.json();
  console.log('✅ Güncellenen Ürün Durumu:', updateData.data.status);

  const updatedStatsRes = await fetch(`${API_BASE}/reports/dashboard-stats`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const updatedStats = await updatedStatsRes.json();
  console.log('✅ Dashboard Güncel İstatistikleri:', {
    total: updatedStats.data.totalCount,
    assigned: updatedStats.data.assignedCount,
    ready: updatedStats.data.readyCount,
    faulty: updatedStats.data.faultyCount,
    statusDistribution: updatedStats.data.statusDistribution,
  });

  if (updatedStats.data.faultyCount !== 1) {
    throw new Error('Dashboard Arızalı/Serviste sayacı 1 olmalıydı!');
  }

  // 6. Viewer Role Authorization Guards
  console.log('\n--- SENARYO 6: Viewer Rolü Yetki Kısıtlamaları ---');
  const viewerLoginRes = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'viewer@firma.com', password: 'viewer123' }),
  });
  const viewerLoginData = await viewerLoginRes.json();
  const viewerToken = viewerLoginData.data.accessToken;
  console.log('✅ Viewer girişi başarılı!');

  // Viewer attempt POST
  const viewerPostRes = await fetch(`${API_BASE}/hardware`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${viewerToken}`,
    },
    body: JSON.stringify({
      mode: 'new',
      category: 'Mouse',
      brand: 'Logitech',
      model: 'MX Master',
    }),
  });
  console.log('✅ Viewer POST Engelleme Yanıtı:', viewerPostRes.status);
  if (viewerPostRes.status !== 403) {
    throw new Error('Viewer kullanıcısının POST isteği 403 Forbidden ile engellenmeliydi!');
  }

  // Viewer attempt DELETE
  const viewerDeleteRes = await fetch(`${API_BASE}/hardware/${targetId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${viewerToken}` },
  });
  console.log('✅ Viewer DELETE Engelleme Yanıtı:', viewerDeleteRes.status);
  if (viewerDeleteRes.status !== 403) {
    throw new Error('Viewer kullanıcısının DELETE isteği 403 Forbidden ile engellenmeliydi!');
  }

  console.log('\n======================================================');
  console.log(' 🎉 TÜM TEST SENARYOLARI EKSİKSİZ BAŞARIYLA GEÇTİ!');
  console.log('======================================================\n');
}

runE2ETests()
  .catch((err) => {
    console.error('\n❌ E2E TEST HATASI:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
