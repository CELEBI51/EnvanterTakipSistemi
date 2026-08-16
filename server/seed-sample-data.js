import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('[SEED-DATA] Gerçekçi örnek veriler ekleniyor...\n');

  // ── Mevcut referansları al ──
  const adminUser = await prisma.user.findFirst({ where: { role: 'admin' } });
  if (!adminUser) throw new Error('Admin kullanıcı bulunamadı! Önce seed.js çalıştırın.');

  const units = await prisma.unit.findMany();
  const categories = await prisma.category.findMany();

  const cat = (parentType, name) => categories.find(c => c.parentType === parentType && c.name === name);
  const unit = (name) => units.find(u => u.name === name);

  const arge = unit('Ar-Ge');
  const bilgiIslem = unit('Bilgi İşlemleri');
  const satis = unit('Satış-Pazarlama');

  // Yeni birimler ekle
  const muhasebe = await prisma.unit.upsert({
    where: { name: 'Muhasebe' },
    update: {},
    create: { name: 'Muhasebe', address: 'Merkez Ofis Kat 2', phone: '0212 555 30 30', contactPerson: 'Zeynep Kara', isActive: true },
  });
  const ik = await prisma.unit.upsert({
    where: { name: 'İnsan Kaynakları' },
    update: {},
    create: { name: 'İnsan Kaynakları', address: 'Merkez Ofis Kat 1', phone: '0212 555 40 40', contactPerson: 'Elif Demir', isActive: true },
  });
  console.log('[SEED-DATA] Birimler oluşturuldu.');

  // ══════════════════════════════════════════
  // 1. PERSONELLER (Employees)
  // ══════════════════════════════════════════
  const employeesData = [
    { fullName: 'Ahmet Yılmaz',    tcNo: '10234567890', unitId: arge.id,        phone: '0532 111 22 33', email: 'ahmet.yilmaz@firma.com',    hireDate: new Date('2019-03-15'), isActive: true },
    { fullName: 'Elif Kaya',       tcNo: '20345678901', unitId: bilgiIslem.id,  phone: '0533 222 33 44', email: 'elif.kaya@firma.com',       hireDate: new Date('2020-06-01'), isActive: true },
    { fullName: 'Mehmet Demir',    tcNo: '30456789012', unitId: satis.id,       phone: '0534 333 44 55', email: 'mehmet.demir@firma.com',    hireDate: new Date('2018-01-10'), isActive: true },
    { fullName: 'Fatma Çelik',     tcNo: '40567890123', unitId: muhasebe.id,    phone: '0535 444 55 66', email: 'fatma.celik@firma.com',     hireDate: new Date('2021-09-20'), isActive: true },
    { fullName: 'Mustafa Aksoy',   tcNo: '50678901234', unitId: ik.id,          phone: '0536 555 66 77', email: 'mustafa.aksoy@firma.com',   hireDate: new Date('2017-05-01'), isActive: true },
    { fullName: 'Zeynep Şahin',    tcNo: '60789012345', unitId: arge.id,        phone: '0537 666 77 88', email: 'zeynep.sahin@firma.com',    hireDate: new Date('2022-02-14'), isActive: true },
    { fullName: 'Ali Öztürk',      tcNo: '70890123456', unitId: bilgiIslem.id,  phone: '0538 777 88 99', email: 'ali.ozturk@firma.com',      hireDate: new Date('2016-11-01'), isActive: false, terminationDate: new Date('2024-08-31') },
    { fullName: 'Ayşe Yıldırım',   tcNo: '80901234567', unitId: satis.id,       phone: '0539 888 99 00', email: 'ayse.yildirim@firma.com',   hireDate: new Date('2023-04-10'), isActive: true },
  ];

  const employees = [];
  for (const empData of employeesData) {
    const emp = await prisma.employee.upsert({
      where: { tcNo: empData.tcNo },
      update: {},
      create: empData,
    });
    employees.push(emp);
  }
  console.log(`[SEED-DATA] ${employees.length} personel oluşturuldu.`);

  // ══════════════════════════════════════════
  // 2. VARLIKLAR (Hardware)
  // ══════════════════════════════════════════
  const hardwareData = [
    {
      categoryId: cat('VARLIK', 'Laptop').id, brand: 'Lenovo', model: 'ThinkPad T14s Gen 4', serialNo: 'PF4CXYZ1',
      demirbasNo: 'DM-2024-001', location: 'Ar-Ge Ofis', supplier: 'Vatan Bilgisayar', invoiceNo: 'VB-2024-10234',
      purchaseDate: new Date('2024-01-15'), purchaseAmount: 42500.00, status: 'Kullanimda',
      warrantyStartDate: new Date('2024-01-15'), warrantyEndDate: new Date('2027-01-15'),
      specs: { processor: 'Intel Core i7-1365U', ram: '16 GB', storage: '512 GB NVMe SSD', screen: '14" FHD IPS' },
      createdById: adminUser.id,
    },
    {
      categoryId: cat('VARLIK', 'Laptop').id, brand: 'Dell', model: 'Latitude 5540', serialNo: 'SVCTG83K2',
      demirbasNo: 'DM-2024-002', location: 'Satış Ofis', supplier: 'Teknosa', invoiceNo: 'TK-2024-7821',
      purchaseDate: new Date('2024-03-20'), purchaseAmount: 38900.00, status: 'Kullanimda',
      warrantyStartDate: new Date('2024-03-20'), warrantyEndDate: new Date('2026-03-20'),
      specs: { processor: 'Intel Core i5-1345U', ram: '16 GB', storage: '256 GB NVMe SSD', screen: '15.6" FHD' },
      createdById: adminUser.id,
    },
    {
      categoryId: cat('VARLIK', 'Desktop').id, brand: 'HP', model: 'ProDesk 400 G9', serialNo: 'CZC4125XYZ',
      demirbasNo: 'DM-2023-015', location: 'Muhasebe', supplier: 'Bimeks', invoiceNo: 'BM-2023-4412',
      purchaseDate: new Date('2023-06-10'), purchaseAmount: 28750.00, status: 'Hazir',
      warrantyStartDate: new Date('2023-06-10'), warrantyEndDate: new Date('2025-06-10'),
      specs: { processor: 'Intel Core i5-13500', ram: '8 GB', storage: '256 GB SSD', os: 'Windows 11 Pro' },
      createdById: adminUser.id,
    },
    {
      categoryId: cat('VARLIK', 'Monitör').id, brand: 'Samsung', model: 'S24D330H 24"', serialNo: 'H4ZP900123',
      demirbasNo: 'DM-2023-020', location: 'Ar-Ge Ofis', supplier: 'MediaMarkt', invoiceNo: 'MM-2023-8891',
      purchaseDate: new Date('2023-02-01'), purchaseAmount: 4250.00, status: 'Kullanimda',
      warrantyStartDate: new Date('2023-02-01'), warrantyEndDate: new Date('2026-02-01'),
      specs: { panel: 'TN', resolution: '1920x1080', refreshRate: '75Hz', ports: 'HDMI, VGA' },
      createdById: adminUser.id,
    },
    {
      categoryId: cat('VARLIK', 'Yazıcı').id, brand: 'HP', model: 'LaserJet Pro M404dn', serialNo: 'VNB3K72401',
      demirbasNo: 'DM-2022-008', location: 'Ortak Alan - 2. Kat', supplier: 'D&R Teknoloji', invoiceNo: 'DR-2022-3341',
      purchaseDate: new Date('2022-09-05'), purchaseAmount: 7800.00, status: 'Kullanimda',
      warrantyStartDate: new Date('2022-09-05'), warrantyEndDate: new Date('2024-09-05'),
      specs: { type: 'Lazer', duplexPrint: true, networkPrint: true, ppm: 38 },
      createdById: adminUser.id,
    },
    {
      categoryId: cat('VARLIK', 'Laptop').id, brand: 'Apple', model: 'MacBook Pro 14" M3', serialNo: 'FVFXM3A0Q1',
      demirbasNo: 'DM-2024-005', location: 'Bilgi İşlem', supplier: 'Apple Yetkili', invoiceNo: 'APL-2024-002',
      purchaseDate: new Date('2024-05-10'), purchaseAmount: 89500.00, status: 'Arizali',
      warrantyStartDate: new Date('2024-05-10'), warrantyEndDate: new Date('2026-05-10'),
      specs: { processor: 'Apple M3 Pro', ram: '18 GB', storage: '512 GB SSD', screen: '14.2" Liquid Retina XDR' },
      createdById: adminUser.id,
    },
    {
      categoryId: cat('VARLIK', 'Desktop').id, brand: 'Casper', model: 'Nirvana N200', serialNo: 'CSP78412X',
      demirbasNo: 'DM-2021-003', location: 'Depo', supplier: 'Casper Bayi', invoiceNo: 'CSP-2021-1102',
      purchaseDate: new Date('2021-04-18'), purchaseAmount: 15200.00, status: 'KullanimDisi',
      warrantyStartDate: new Date('2021-04-18'), warrantyEndDate: new Date('2023-04-18'),
      specs: { processor: 'Intel Core i3-10100', ram: '4 GB', storage: '256 GB SSD' },
      createdById: adminUser.id,
    },
    {
      categoryId: cat('VARLIK', 'Laptop').id, brand: 'Lenovo', model: 'ThinkPad X1 Carbon Gen 11', serialNo: 'PF4DW9K3',
      demirbasNo: 'DM-2024-010', location: 'Servis - TeknoServis', supplier: 'Vatan Bilgisayar', invoiceNo: 'VB-2024-11002',
      purchaseDate: new Date('2024-02-28'), purchaseAmount: 62000.00, status: 'Serviste',
      warrantyStartDate: new Date('2024-02-28'), warrantyEndDate: new Date('2027-02-28'),
      specs: { processor: 'Intel Core i7-1365U', ram: '32 GB', storage: '1 TB NVMe SSD', screen: '14" 2.8K OLED' },
      createdById: adminUser.id,
    },
  ];

  const hardwareItems = [];
  for (const hw of hardwareData) {
    const existing = await prisma.hardware.findUnique({ where: { demirbasNo: hw.demirbasNo } });
    if (!existing) {
      const created = await prisma.hardware.create({ data: hw });
      hardwareItems.push(created);
    } else {
      hardwareItems.push(existing);
    }
  }
  console.log(`[SEED-DATA] ${hardwareItems.length} varlık oluşturuldu.`);

  // ══════════════════════════════════════════
  // 3. LİSANSLAR (Licenses)
  // ══════════════════════════════════════════
  const now = new Date();
  const daysFromNow = (d) => { const dt = new Date(now); dt.setDate(dt.getDate() + d); return dt; };

  const licensesData = [
    // Aktif - uzun süreli
    { unitId: bilgiIslem.id, brand: 'Microsoft', productInfo: 'Microsoft 365 Business Premium (25 Kullanıcı)', licenseKey: 'XXXXX-XXXXX-XXXXX-MSFBP-2024A',
      startDate: new Date('2024-01-01'), endDate: new Date('2025-12-31'), paymentType: 'KREDI_KARTI', status: 'AKTIF',
      invoiceNumber: 'MS-2024-ENT-001', invoiceAmount: 187500.00, notes: '25 kullanıcılık yıllık plan', createdById: adminUser.id },
    // Süresi 5 gün sonra dolacak (yaklaşan!)
    { unitId: arge.id, brand: 'JetBrains', productInfo: 'IntelliJ IDEA Ultimate (5 Lisans)', licenseKey: 'JB-IDEA-2024-ARGE5',
      startDate: new Date('2023-08-20'), endDate: daysFromNow(5), paymentType: 'KREDI_KARTI', status: 'AKTIF',
      invoiceNumber: 'JB-2023-4421', invoiceAmount: 42000.00, notes: 'Ar-Ge ekibi için 5 developer lisansı', createdById: adminUser.id },
    // Süresi 12 gün sonra dolacak (yaklaşan!)
    { unitId: bilgiIslem.id, brand: 'Kaspersky', productInfo: 'Kaspersky Endpoint Security (50 Cihaz)', licenseKey: 'KES-2024-50DEV-CORP',
      startDate: new Date('2023-08-25'), endDate: daysFromNow(12), paymentType: 'NAKIT', status: 'AKTIF',
      invoiceNumber: 'KSP-2023-8812', invoiceAmount: 35000.00, notes: '50 cihaz uç nokta güvenliği', createdById: adminUser.id },
    // Süresi 2 gün sonra dolacak (kritik!)
    { unitId: satis.id, brand: 'Adobe', productInfo: 'Adobe Creative Cloud - All Apps (3 Kullanıcı)', licenseKey: 'ADO-CC-2024-SALES3',
      startDate: new Date('2023-08-10'), endDate: daysFromNow(2), paymentType: 'VADELI', status: 'AKTIF',
      invoiceNumber: 'ADO-2023-TR-559', invoiceAmount: 28800.00, notes: 'Pazarlama görselleri için 3 kişilik plan', createdById: adminUser.id },
    // Yenilendi
    { unitId: bilgiIslem.id, brand: 'VMware', productInfo: 'VMware vSphere Standard (2 CPU)', licenseKey: 'VMW-VS-STD-2CPU-23',
      startDate: new Date('2022-06-01'), endDate: new Date('2023-05-31'), paymentType: 'NAKIT', status: 'YENILENDI',
      invoiceNumber: 'VMW-2022-1123', invoiceAmount: 52000.00, notes: 'Sunucu sanallaştırma - yenilendi', createdById: adminUser.id },
    // Süresi doldu
    { unitId: arge.id, brand: 'Autodesk', productInfo: 'AutoCAD LT 2023 (1 Kullanıcı)', licenseKey: 'ADSK-ACLT-2023-001',
      startDate: new Date('2023-01-01'), endDate: new Date('2023-12-31'), paymentType: 'KREDI_KARTI', status: 'SURESI_DOLDU',
      invoiceNumber: 'ADSK-2023-TR-441', invoiceAmount: 18500.00, notes: 'Süresi doldu, yenileme bekliyor', createdById: adminUser.id },
    // İptal edildi
    { unitId: muhasebe.id, brand: 'Zoom', productInfo: 'Zoom Business (10 Host)', licenseKey: 'ZM-BIZ-10H-2023',
      startDate: new Date('2023-03-01'), endDate: new Date('2024-02-28'), paymentType: 'KREDI_KARTI', status: 'IPTAL_EDILDI',
      invoiceNumber: 'ZM-2023-TR-098', invoiceAmount: 14400.00, notes: 'Teams\'e geçiş nedeniyle iptal', createdById: adminUser.id },
    // Yenilenmeyecek
    { unitId: ik.id, brand: 'Slack', productInfo: 'Slack Pro (15 Kullanıcı)', licenseKey: 'SLK-PRO-15U-2024',
      startDate: new Date('2024-01-01'), endDate: new Date('2024-12-31'), paymentType: 'VADELI', status: 'YENILENMEYECEK',
      invoiceNumber: 'SLK-2024-TR-012', invoiceAmount: 9600.00, notes: 'MS Teams kullanımına geçildiği için yenilenmeyecek', createdById: adminUser.id },
  ];

  let licCount = 0;
  for (const lic of licensesData) {
    const exists = await prisma.license.findFirst({ where: { licenseKey: lic.licenseKey } });
    if (!exists) {
      await prisma.license.create({ data: lic });
      licCount++;
    }
  }
  console.log(`[SEED-DATA] ${licCount} lisans oluşturuldu.`);

  // ══════════════════════════════════════════
  // 4. AKSESUARLAR (Accessories)
  // ══════════════════════════════════════════
  const accessoriesData = [
    { name: 'Logitech MX Master 3S', categoryId: cat('AKSESUAR', 'Mouse').id, brand: 'Logitech',
      supplier: 'Hepsiburada', invoiceNo: 'HB-2024-44521', purchaseDate: new Date('2024-02-10'), purchaseAmount: 2350.00,
      totalQuantity: 15, availableQuantity: 8, assignedQuantity: 7, minThreshold: 3,
      notes: 'Ergonomik kablosuz mouse', createdById: adminUser.id },
    { name: 'Logitech K380 Bluetooth Klavye', categoryId: cat('AKSESUAR', 'Klavye').id, brand: 'Logitech',
      supplier: 'Trendyol', invoiceNo: 'TY-2024-9981', purchaseDate: new Date('2024-03-05'), purchaseAmount: 890.00,
      totalQuantity: 10, availableQuantity: 4, assignedQuantity: 6, minThreshold: 2,
      notes: 'Çoklu cihaz desteği olan kompakt klavye', createdById: adminUser.id },
    { name: 'Jabra Evolve2 75 Kulaklık', categoryId: cat('AKSESUAR', 'Kulaklık').id, brand: 'Jabra',
      supplier: 'Vatan Bilgisayar', invoiceNo: 'VB-2024-5532', purchaseDate: new Date('2024-01-20'), purchaseAmount: 8900.00,
      totalQuantity: 5, availableQuantity: 1, assignedQuantity: 4, minThreshold: 1,
      notes: 'ANC özellikli profesyonel kulaklık - Toplantı kullanımı', createdById: adminUser.id },
    { name: 'Logitech C920 HD Pro Webcam', categoryId: cat('AKSESUAR', 'Kamera').id, brand: 'Logitech',
      supplier: 'Amazon TR', invoiceNo: 'AMZ-2023-TR-7721', purchaseDate: new Date('2023-11-15'), purchaseAmount: 2100.00,
      totalQuantity: 8, availableQuantity: 3, assignedQuantity: 5, minThreshold: 2,
      notes: '1080p webcam - Video konferans', createdById: adminUser.id },
    { name: 'Apple Magic Mouse', categoryId: cat('AKSESUAR', 'Mouse').id, brand: 'Apple',
      supplier: 'Apple Yetkili', invoiceNo: 'APL-2024-ACC-011', purchaseDate: new Date('2024-05-10'), purchaseAmount: 3500.00,
      totalQuantity: 3, availableQuantity: 0, assignedQuantity: 3, minThreshold: 1,
      notes: 'MacBook kullanıcıları için - Stok kritik', createdById: adminUser.id },
  ];

  let accCount = 0;
  for (const acc of accessoriesData) {
    const exists = await prisma.accessory.findFirst({ where: { name: acc.name, brand: acc.brand } });
    if (!exists) {
      await prisma.accessory.create({ data: acc });
      accCount++;
    }
  }
  console.log(`[SEED-DATA] ${accCount} aksesuar oluşturuldu.`);

  // ══════════════════════════════════════════
  // 5. SARF MALZEMELER (Consumables)
  // ══════════════════════════════════════════
  const consumablesData = [
    { name: 'HP A4 Fotokopi Kağıdı (80gr, 500 yaprak)', categoryId: cat('SARF_MALZEME', 'Kağıt').id, manufacturer: 'HP',
      supplier: 'Metro Gross', location: 'Depo - Raf A3', totalQuantity: 50, availableQuantity: 32, consumedQuantity: 18,
      invoiceNo: 'MG-2024-3341', purchaseDate: new Date('2024-06-01'), purchaseAmount: 4500.00,
      notes: '80 gr/m² - 500 yaprak/paket', createdById: adminUser.id },
    { name: 'HP 58A Orijinal Toner (CF258A)', categoryId: cat('SARF_MALZEME', 'Toner').id, manufacturer: 'HP',
      supplier: 'Toner Dünyası', location: 'Depo - Raf B1', totalQuantity: 6, availableQuantity: 2, consumedQuantity: 4,
      invoiceNo: 'TD-2024-1123', purchaseDate: new Date('2024-04-12'), purchaseAmount: 5400.00,
      notes: 'LaserJet Pro M404dn uyumlu - Stok azaldı', createdById: adminUser.id },
    { name: 'Cat6 UTP Ethernet Kablo (305m Kutu)', categoryId: cat('SARF_MALZEME', 'Kablo').id, manufacturer: 'Vention',
      supplier: 'Elektrik Market', location: 'Depo - Raf C2', totalQuantity: 4, availableQuantity: 3, consumedQuantity: 1,
      invoiceNo: 'EM-2024-5521', purchaseDate: new Date('2024-07-10'), purchaseAmount: 3200.00,
      notes: '305 metre kutu - Altyapı çalışmaları için', createdById: adminUser.id },
    { name: 'HDMI 2.1 Kablo 2m', categoryId: cat('SARF_MALZEME', 'Kablo').id, manufacturer: 'Ugreen',
      supplier: 'Amazon TR', location: 'Depo - Raf C1', totalQuantity: 20, availableQuantity: 11, consumedQuantity: 9,
      invoiceNo: 'AMZ-2024-TR-8821', purchaseDate: new Date('2024-05-22'), purchaseAmount: 3000.00,
      notes: '4K 120Hz destekli - Monitör bağlantısı', createdById: adminUser.id },
  ];

  let conCount = 0;
  for (const con of consumablesData) {
    const exists = await prisma.consumable.findFirst({ where: { name: con.name } });
    if (!exists) {
      await prisma.consumable.create({ data: con });
      conCount++;
    }
  }
  console.log(`[SEED-DATA] ${conCount} sarf malzeme oluşturuldu.`);

  // ══════════════════════════════════════════
  // 6. BİLEŞENLER (Components)
  // ══════════════════════════════════════════
  const componentsData = [
    { name: 'Kingston Fury Beast 16GB DDR4 3200MHz', categoryId: cat('BILESEN', 'RAM').id, brand: 'Kingston', model: 'KF432C16BB/16',
      location: 'Depo - Raf D1', supplier: 'Vatan Bilgisayar', totalQuantity: 10, availableQuantity: 6, usedQuantity: 4,
      invoiceNo: 'VB-2024-RAM-001', purchaseDate: new Date('2024-03-15'), purchaseAmount: 7500.00,
      notes: 'Desktop RAM yükseltme stoğu', createdById: adminUser.id },
    { name: 'Samsung 870 EVO 500GB SATA SSD', categoryId: cat('BILESEN', 'SSD/HDD').id, brand: 'Samsung', model: 'MZ-77E500B',
      location: 'Depo - Raf D2', supplier: 'Teknosa', totalQuantity: 8, availableQuantity: 3, usedQuantity: 5,
      invoiceNo: 'TK-2024-SSD-003', purchaseDate: new Date('2024-02-20'), purchaseAmount: 9600.00,
      notes: 'Yavaş bilgisayarlar için SSD yükseltme', createdById: adminUser.id },
    { name: 'Corsair CV550 550W 80+ Bronze PSU', categoryId: cat('BILESEN', 'Güç Kaynağı').id, brand: 'Corsair', model: 'CP-9020210',
      location: 'Depo - Raf D3', supplier: 'İtopya', totalQuantity: 4, availableQuantity: 2, usedQuantity: 2,
      invoiceNo: 'ITP-2024-PSU-001', purchaseDate: new Date('2024-04-05'), purchaseAmount: 5200.00,
      notes: 'Arızalı güç kaynağı değişimi için yedek', createdById: adminUser.id },
    { name: 'Gigabyte B660M DS3H DDR4 Anakart', categoryId: cat('BILESEN', 'Anakart').id, brand: 'Gigabyte', model: 'B660M DS3H',
      location: 'Depo - Raf D4', supplier: 'Bimeks', totalQuantity: 3, availableQuantity: 2, usedQuantity: 1,
      invoiceNo: 'BM-2024-MB-002', purchaseDate: new Date('2024-01-25'), purchaseAmount: 8400.00,
      notes: 'LGA1700 soket - Desktop anakart yedek', createdById: adminUser.id },
  ];

  let compCount = 0;
  for (const comp of componentsData) {
    const exists = await prisma.component.findFirst({ where: { name: comp.name } });
    if (!exists) {
      await prisma.component.create({ data: comp });
      compCount++;
    }
  }
  console.log(`[SEED-DATA] ${compCount} bileşen oluşturuldu.`);

  // ══════════════════════════════════════════
  // ÖZET
  // ══════════════════════════════════════════
  console.log('\n════════════════════════════════════════');
  console.log('  SEED TAMAMLANDI - ÖZET');
  console.log('════════════════════════════════════════');
  console.log(`  Personel:       ${employees.length} kayıt`);
  console.log(`  Varlık:         ${hardwareItems.length} kayıt`);
  console.log(`  Lisans:         ${licCount} kayıt`);
  console.log(`  Aksesuar:       ${accCount} kayıt`);
  console.log(`  Sarf Malzeme:   ${conCount} kayıt`);
  console.log(`  Bileşen:        ${compCount} kayıt`);
  console.log('════════════════════════════════════════\n');
}

main()
  .catch((e) => {
    console.error('[SEED-DATA ERROR]', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
