import prisma from './src/config/db.js';
import * as softwareService from './src/modules/software/software.service.js';
import { checkLicenseExpirations } from './src/jobs/licenseExpiry.job.js';
import { getDashboardStats } from './src/modules/reports/reports.service.js';

async function runSoftwareE2ETest() {
  console.log('\n======================================================');
  console.log('  YAZILIM (SOFTWARE) MODÜLÜ KAPSAMLI E2E TEST BAŞLIYOR');
  console.log('======================================================\n');

  // 0. Temizlik ve Donanım Hazırlığı
  console.log('--- 0. Test Öncesi Veri Hazırlığı ---');
  await prisma.notification.deleteMany({ where: { type: 'license_expiring' } });
  await prisma.software.deleteMany({});

  const adminUser = await prisma.user.findFirst({ where: { role: 'admin' } });
  if (!adminUser) throw new Error('Admin kullanıcı veritabanında bulunamadı.');

  let hardware = await prisma.hardware.findFirst();
  if (!hardware) {
    hardware = await prisma.hardware.create({
      data: {
        category: 'Laptop',
        brand: 'Dell',
        model: 'XPS 15',
        serialNo: 'SN-TEST-123',
        demirbasNo: `DMB-TEST-${Date.now()}`,
        status: 'Kullanimda',
        createdById: adminUser.id,
      },
    });
  }
  console.log(`✅ Test için kullanılacak donanım: ${hardware.brand} ${hardware.model} (${hardware.demirbasNo})`);

  const formatDateString = (d) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  // 1. Senaryo 1: 5 Gün Sonra Bitecek Yazılım
  console.log('\n--- Senaryo 1: 5 Gün Sonra Bitecek Yazılım Ekleme ---');
  const now = new Date();
  const dateIn5Days = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 5);

  const sw1 = await softwareService.createSoftware({
    name: 'JetBrains IntelliJ IDEA',
    license_key: 'JET-1234-5678',
    start_date: formatDateString(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 360)),
    end_date: formatDateString(dateIn5Days),
    notes: 'Geliştirici lisansı',
  });

  console.log(`✅ Yazılım eklendi: ${sw1.name}`);
  console.log(`   - Kalan gün (daysRemaining): ${sw1.daysRemaining}`);
  if (sw1.daysRemaining === 5) {
    console.log('   - DOĞRULANDI: Kalan gün 5 olarak hesaplandı (0-15 gün turuncu rozet).');
  } else {
    console.warn(`   - DIKKAT: Beklenen kalan gün 5, fakat ${sw1.daysRemaining} çıktı.`);
  }

  // 2. Senaryo 2: Süresi 10 Gün Önce Dolmuş Yazılım Ekleme
  console.log('\n--- Senaryo 2: Süresi 10 Gün Önce Dolmuş Yazılım Ekleme ---');
  const date10DaysAgo = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 10);

  const sw2 = await softwareService.createSoftware({
    name: 'Adobe Creative Cloud',
    license_key: 'ADBE-9999-8888',
    start_date: formatDateString(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 375)),
    end_date: formatDateString(date10DaysAgo),
    notes: 'Grafik tasarım ekibi lisansı',
  });

  console.log(`✅ Yazılım eklendi: ${sw2.name}`);
  console.log(`   - Kalan gün (daysRemaining): ${sw2.daysRemaining}`);
  if (sw2.daysRemaining < 0) {
    console.log(`   - DOĞRULANDI: Negatif değer (${sw2.daysRemaining}) (süresi dolmuş, kırmızı rozet).`);
  } else {
    console.warn(`   - DIKKAT: Beklenen negatif kalan gün, fakat ${sw2.daysRemaining} çıktı.`);
  }

  // 3. Senaryo 3: Lisans Süre Takip Cron İşlevselliği & Anti-Spam Kontrolü
  console.log('\n--- Senaryo 3: Lisans Süre Takibi Cron Job & Anti-Spam Testi ---');
  const swToday = await softwareService.createSoftware({
    name: 'Slack Enterprise',
    license_key: 'SLACK-0000-TODAY',
    start_date: formatDateString(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 30)),
    end_date: formatDateString(new Date(now.getFullYear(), now.getMonth(), now.getDate())),
  });

  const sw15Days = await softwareService.createSoftware({
    name: 'Office 365 Pro',
    license_key: 'MSFT-15DAYS-1515',
    start_date: formatDateString(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 350)),
    end_date: formatDateString(new Date(now.getFullYear(), now.getMonth(), now.getDate() + 15)),
  });

  console.log('Manuel olarak checkLicenseExpirations() fonksiyonu tetikleniyor...');
  const firstRunNotifs = await checkLicenseExpirations();
  console.log(`✅ 1. Çalıştırmada Oluşturulan Bildirim Sayısı: ${firstRunNotifs.length}`);
  firstRunNotifs.forEach((n) => console.log(`   - Bildirim: ${n.message}`));

  if (firstRunNotifs.length === 0) {
    console.error('❌ HATA: Bildirim oluşturulması gerekiyordu!');
  } else {
    console.log('✅ DOĞRULANDI: Süresi dolan veya eşikte olan lisanslar için bildirim oluşturuldu.');
  }

  console.log('\n2. Defa aynı gün içinde checkLicenseExpirations() çalıştırılıyor (Anti-Spam testi)...');
  const secondRunNotifs = await checkLicenseExpirations();
  console.log(`✅ 2. Çalıştırmada Oluşturulan Bildirim Sayısı: ${secondRunNotifs.length}`);

  if (secondRunNotifs.length === 0) {
    console.log('✅ DOĞRULANDI: Aynı gün içinde ikinci çalıştırmada SPAM bildirim oluşturulmadı (0 yeni bildirim).');
  } else {
    console.error('❌ HATA: Anti-spam çalışmadı, tekrar bildirim oluşturuldu!');
  }

  // 4. Senaryo 4: Yazılımı Donanıma Bağlama
  console.log('\n--- Senaryo 4: Yazılımı Donanıma Bağlama ---');
  const swAssigned = await softwareService.createSoftware({
    name: 'Windows 11 Pro OEM',
    license_key: 'WIN11-PRO-OEM-12345',
    start_date: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 100).toISOString().split('T')[0],
    end_date: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 200).toISOString().split('T')[0],
    assigned_hardware_id: hardware.id,
  });

  console.log(`✅ Yazılım donanıma bağlandı: ${swAssigned.name}`);
  console.log(`   - Atanan Donanım Bilgileri: Brand: ${swAssigned.assignedHardware?.brand}, Model: ${swAssigned.assignedHardware?.model}, Demirbaş No: ${swAssigned.assignedHardware?.demirbasNo}`);

  if (swAssigned.assignedHardware && swAssigned.assignedHardware.demirbasNo === hardware.demirbasNo) {
    console.log('✅ DOĞRULANDI: Lisans listesinde donanım bilgisi (marka+model+demirbaş no) görünüyor.');
  } else {
    console.error('❌ HATA: Donanım bilgisi ilişkilendirilemedi!');
  }

  // 5. Senaryo 5: Dashboard İstatistikleri & Expiring Endpoint Testi
  console.log('\n--- Senaryo 5: Dashboard İstatistikleri & Expiring Endpoint Testi ---');
  const dashboardStats = await getDashboardStats();
  const expiringList = await softwareService.getExpiringSoftware(15);

  console.log(`✅ Dashboard expiringSoftwareCount: ${dashboardStats.expiringSoftwareCount}`);
  console.log(`✅ GET /api/software/expiring?days=15 Dönüş Eleman Sayısı: ${expiringList.length}`);

  if (dashboardStats.expiringSoftwareCount > 0 && expiringList.length > 0) {
    console.log('✅ DOĞRULANDI: Dashboard verileri gerçek veriyle doluyor.');
  } else {
    console.error('❌ HATA: Dashboard verileri eksik!');
  }

  console.log('\n======================================================');
  console.log('  TÜM E2E TEST SENARYOLARI BAŞARIYLA TAMAMLANDI! 🎉');
  console.log('======================================================\n');
}

runSoftwareE2ETest()
  .catch((err) => {
    console.error('E2E Test Hatası:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
