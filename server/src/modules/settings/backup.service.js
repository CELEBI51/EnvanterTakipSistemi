import prisma from '../../config/db.js';
import ExcelJS from 'exceljs';
import XLSX from 'xlsx';

// 11 Desteklenen Modül ve Sheet isimleri Haritası
export const MODULE_SHEET_MAP = {
  hardware: 'Varlıklar',
  accessories: 'Aksesuarlar',
  consumables: 'Sarf Malzemeler',
  components: 'Bileşenler',
  licenses: 'Lisanslar',
  employees: 'Personel',
  assignments: 'Zimmetler',
  returns: 'İadeler',
  users: 'Kullanıcılar',
  categories: 'Kategoriler',
  units: 'Birimler',
};

// Modül isimlerinin ters haritası (Sheet adı -> Modül anahtarı)
export const SHEET_MODULE_MAP = Object.entries(MODULE_SHEET_MAP).reduce((acc, [modKey, sheetName]) => {
  acc[sheetName] = modKey;
  return acc;
}, {});

// Overwrite silme sırası (Foreign Key bağımlılığı önceliği)
export const OVERWRITE_DELETE_ORDER = [
  'returns',
  'assignments',
  'employees',
  'accessories',
  'consumables',
  'components',
  'licenses',
  'hardware',
  'users',
  'categories',
  'units',
];

// Helper: Güvenli Sayı Parse (NaN durumunda null veya varsayılan değer döner)
const safeFloat = (val) => {
  if (val === null || val === undefined || val === '') return null;
  const num = parseFloat(String(val).replace(',', '.'));
  return isNaN(num) ? null : num;
};

const safeInt = (val, fallback = 0) => {
  if (val === null || val === undefined || val === '') return fallback;
  const num = parseInt(val, 10);
  return isNaN(num) ? fallback : num;
};

/**
 * Tüm modüller için veritabanı kayıt sayılarını döner
 */
export const getBackupCounts = async () => {
  const [
    hardware,
    accessories,
    consumables,
    components,
    licenses,
    employees,
    assignments,
    returns,
    users,
    categories,
    units,
  ] = await Promise.all([
    prisma.hardware.count(),
    prisma.accessory.count(),
    prisma.consumable.count(),
    prisma.component.count(),
    prisma.license.count(),
    prisma.employee.count(),
    prisma.assignment.count(),
    prisma.return.count(),
    prisma.user.count(),
    prisma.category.count(),
    prisma.unit.count(),
  ]);

  return {
    hardware,
    accessories,
    consumables,
    components,
    licenses,
    employees,
    assignments,
    returns,
    users,
    categories,
    units,
  };
};

/**
 * Seçili modülleri Excel workbook (.xlsx) olarak oluşturur
 */
export const generateBackupWorkbook = async (selectedModules = []) => {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'DİTAŞ Demirbaş Takip Sistemi';
  workbook.created = new Date();

  const activeModules = selectedModules.length > 0
    ? selectedModules.filter((m) => MODULE_SHEET_MAP[m])
    : Object.keys(MODULE_SHEET_MAP);

  for (const modKey of activeModules) {
    const sheetName = MODULE_SHEET_MAP[modKey];

    switch (modKey) {
      case 'hardware': {
        const sheet = workbook.addWorksheet(sheetName);
        sheet.columns = [
          { header: 'Demirbaş No', key: 'demirbasNo', width: 18 },
          { header: 'Kategori', key: 'category', width: 18 },
          { header: 'Marka', key: 'brand', width: 18 },
          { header: 'Model', key: 'model', width: 18 },
          { header: 'Seri No', key: 'serialNo', width: 20 },
          { header: 'Durum', key: 'status', width: 15 },
          { header: 'Fatura No', key: 'invoiceNo', width: 18 },
          { header: 'Satın Alma Tarihi', key: 'purchaseDate', width: 15 },
          { header: 'Satın Alma Tutarı', key: 'purchaseAmount', width: 18 },
          { header: 'Konum', key: 'location', width: 18 },
          { header: 'Tedarikçi', key: 'supplier', width: 18 },
        ];

        const records = await prisma.hardware.findMany({ include: { category: true } });
        records.forEach((r) => {
          sheet.addRow({
            demirbasNo: r.demirbasNo,
            category: r.category?.name || '',
            brand: r.brand,
            model: r.model || '',
            serialNo: r.serialNo || '',
            status: r.status,
            invoiceNo: r.invoiceNo || '',
            purchaseDate: r.purchaseDate ? new Date(r.purchaseDate).toLocaleDateString('tr-TR') : '',
            purchaseAmount: r.purchaseAmount !== null ? Number(r.purchaseAmount) : '',
            location: r.location || '',
            supplier: r.supplier || '',
          });
        });
        break;
      }

      case 'accessories': {
        const sheet = workbook.addWorksheet(sheetName);
        sheet.columns = [
          { header: 'Ürün Adı', key: 'name', width: 25 },
          { header: 'Kategori', key: 'category', width: 18 },
          { header: 'Marka', key: 'brand', width: 18 },
          { header: 'Toplam Stok', key: 'totalQuantity', width: 15 },
          { header: 'Kullanılabilir Stok', key: 'availableQuantity', width: 18 },
          { header: 'Satın Alma Tutarı', key: 'purchaseAmount', width: 18 },
          { header: 'Tedarikçi', key: 'supplier', width: 18 },
          { header: 'Notlar', key: 'notes', width: 30 },
        ];

        const records = await prisma.accessory.findMany({ include: { category: true } });
        records.forEach((r) => {
          sheet.addRow({
            name: r.name,
            category: r.category?.name || '',
            brand: r.brand || '',
            totalQuantity: r.totalQuantity,
            availableQuantity: r.availableQuantity,
            purchaseAmount: r.purchaseAmount !== null ? Number(r.purchaseAmount) : '',
            supplier: r.supplier || '',
            notes: r.notes || '',
          });
        });
        break;
      }

      case 'consumables': {
        const sheet = workbook.addWorksheet(sheetName);
        sheet.columns = [
          { header: 'Ürün Adı', key: 'name', width: 25 },
          { header: 'Kategori', key: 'category', width: 18 },
          { header: 'Üretici', key: 'manufacturer', width: 18 },
          { header: 'Toplam Stok', key: 'totalQuantity', width: 15 },
          { header: 'Kullanılabilir Stok', key: 'availableQuantity', width: 18 },
          { header: 'Satın Alma Tutarı', key: 'purchaseAmount', width: 18 },
          { header: 'Konum', key: 'location', width: 18 },
          { header: 'Notlar', key: 'notes', width: 30 },
        ];

        const records = await prisma.consumable.findMany({ include: { category: true } });
        records.forEach((r) => {
          sheet.addRow({
            name: r.name,
            category: r.category?.name || '',
            manufacturer: r.manufacturer || '',
            totalQuantity: r.totalQuantity,
            availableQuantity: r.availableQuantity,
            purchaseAmount: r.purchaseAmount !== null ? Number(r.purchaseAmount) : '',
            location: r.location || '',
            notes: r.notes || '',
          });
        });
        break;
      }

      case 'components': {
        const sheet = workbook.addWorksheet(sheetName);
        sheet.columns = [
          { header: 'Bileşen Adı', key: 'name', width: 25 },
          { header: 'Kategori', key: 'category', width: 18 },
          { header: 'Marka', key: 'brand', width: 18 },
          { header: 'Model', key: 'model', width: 18 },
          { header: 'Toplam Stok', key: 'totalQuantity', width: 15 },
          { header: 'Kullanılabilir Stok', key: 'availableQuantity', width: 18 },
          { header: 'Satın Alma Tutarı', key: 'purchaseAmount', width: 18 },
          { header: 'Notlar', key: 'notes', width: 30 },
        ];

        const records = await prisma.component.findMany({ include: { category: true } });
        records.forEach((r) => {
          sheet.addRow({
            name: r.name,
            category: r.category?.name || '',
            brand: r.brand || '',
            model: r.model || '',
            totalQuantity: r.totalQuantity,
            availableQuantity: r.availableQuantity,
            purchaseAmount: r.purchaseAmount !== null ? Number(r.purchaseAmount) : '',
            notes: r.notes || '',
          });
        });
        break;
      }

      case 'licenses': {
        const sheet = workbook.addWorksheet(sheetName);
        sheet.columns = [
          { header: 'Yazılım / Marka', key: 'brand', width: 22 },
          { header: 'Ürün Bilgisi', key: 'productInfo', width: 25 },
          { header: 'Lisans Anahtarı', key: 'licenseKey', width: 28 },
          { header: 'Birim', key: 'unit', width: 18 },
          { header: 'Başlangıç Tarihi', key: 'startDate', width: 15 },
          { header: 'Bitiş Tarihi', key: 'endDate', width: 15 },
          { header: 'Fatura Tutarı', key: 'invoiceAmount', width: 18 },
          { header: 'Ödeme Türü', key: 'paymentType', width: 15 },
          { header: 'Durum', key: 'status', width: 15 },
          { header: 'Notlar', key: 'notes', width: 30 },
        ];

        const records = await prisma.license.findMany({ include: { unit: true } });
        records.forEach((r) => {
          sheet.addRow({
            brand: r.brand,
            productInfo: r.productInfo,
            licenseKey: r.licenseKey || '',
            unit: r.unit?.name || '',
            startDate: r.startDate ? new Date(r.startDate).toLocaleDateString('tr-TR') : '',
            endDate: r.endDate ? new Date(r.endDate).toLocaleDateString('tr-TR') : '',
            invoiceAmount: r.invoiceAmount !== null ? Number(r.invoiceAmount) : '',
            paymentType: r.paymentType || 'KREDI_KARTI',
            status: r.status,
            notes: r.notes || '',
          });
        });
        break;
      }

      case 'employees': {
        const sheet = workbook.addWorksheet(sheetName);
        sheet.columns = [
          { header: 'T.C. Kimlik / Sicil No', key: 'tcNo', width: 20 },
          { header: 'Ad Soyad', key: 'fullName', width: 22 },
          { header: 'E-posta', key: 'email', width: 25 },
          { header: 'Telefon', key: 'phone', width: 18 },
          { header: 'Birim', key: 'unit', width: 18 },
          { header: 'Aktif mi', key: 'isActive', width: 12 },
        ];

        const records = await prisma.employee.findMany({ include: { unit: true } });
        records.forEach((r) => {
          sheet.addRow({
            tcNo: r.tcNo || '',
            fullName: r.fullName,
            email: r.email || '',
            phone: r.phone || '',
            unit: r.unit?.name || '',
            isActive: r.isActive ? 'Evet' : 'Hayır',
          });
        });
        break;
      }

      case 'assignments': {
        const sheet = workbook.addWorksheet(sheetName);
        sheet.columns = [
          { header: 'Zimmet ID', key: 'id', width: 36 },
          { header: 'Personel T.C. / Sicil No', key: 'employeeTcNo', width: 20 },
          { header: 'Personel Ad Soyad', key: 'employeeName', width: 22 },
          { header: 'Teslim Eden', key: 'teslimEden', width: 20 },
          { header: 'Teslim Tarihi', key: 'teslimTarihi', width: 15 },
        ];

        const records = await prisma.assignment.findMany({ include: { employee: true } });
        records.forEach((r) => {
          sheet.addRow({
            id: r.id,
            employeeTcNo: r.employee?.tcNo || '',
            employeeName: r.employee?.fullName || '',
            teslimEden: r.teslimEden || '',
            teslimTarihi: r.teslimTarihi ? new Date(r.teslimTarihi).toLocaleDateString('tr-TR') : '',
          });
        });
        break;
      }

      case 'returns': {
        const sheet = workbook.addWorksheet(sheetName);
        sheet.columns = [
          { header: 'İade ID', key: 'id', width: 36 },
          { header: 'Zimmet ID', key: 'assignmentId', width: 36 },
          { header: 'İade Tarihi', key: 'tarih', width: 15 },
          { header: 'Teslim Alan IT', key: 'teslimAlanIc', width: 20 },
          { header: 'Notlar', key: 'notes', width: 30 },
        ];

        const records = await prisma.return.findMany();
        records.forEach((r) => {
          sheet.addRow({
            id: r.id,
            assignmentId: r.assignmentId,
            tarih: r.tarih ? new Date(r.tarih).toLocaleDateString('tr-TR') : '',
            teslimAlanIc: r.teslimAlanIc || '',
            notes: r.notes || '',
          });
        });
        break;
      }

      case 'users': {
        const sheet = workbook.addWorksheet(sheetName);
        sheet.columns = [
          { header: 'E-posta', key: 'email', width: 25 },
          { header: 'Ad Soyad', key: 'fullName', width: 22 },
          { header: 'Rol', key: 'role', width: 15 },
          { header: 'Şifre Değiştirmeli mi', key: 'mustChangePassword', width: 20 },
        ];

        // CRITICAL SECURITY RULE: NEVER EXPORT passwordHash or refreshToken
        const records = await prisma.user.findMany({
          select: {
            email: true,
            fullName: true,
            role: true,
            mustChangePassword: true,
          },
        });

        records.forEach((r) => {
          sheet.addRow({
            email: r.email,
            fullName: r.fullName,
            role: r.role,
            mustChangePassword: r.mustChangePassword ? 'Evet' : 'Hayır',
          });
        });
        break;
      }

      case 'categories': {
        const sheet = workbook.addWorksheet(sheetName);
        sheet.columns = [
          { header: 'Ana Tür', key: 'parentType', width: 18 },
          { header: 'Kategori Adı', key: 'name', width: 22 },
        ];

        const records = await prisma.category.findMany();
        records.forEach((r) => {
          sheet.addRow({
            parentType: r.parentType,
            name: r.name,
          });
        });
        break;
      }

      case 'units': {
        const sheet = workbook.addWorksheet(sheetName);
        sheet.columns = [
          { header: 'Birim Adı', key: 'name', width: 22 },
          { header: 'Adres', key: 'address', width: 30 },
          { header: 'Telefon', key: 'phone', width: 18 },
          { header: 'Yetkili Kişi', key: 'contactPerson', width: 20 },
          { header: 'E-posta', key: 'email', width: 25 },
          { header: 'Aktif mi', key: 'isActive', width: 12 },
        ];

        const records = await prisma.unit.findMany();
        records.forEach((r) => {
          sheet.addRow({
            name: r.name,
            address: r.address || '',
            phone: r.phone || '',
            contactPerson: r.contactPerson || '',
            email: r.email || '',
            isActive: r.isActive ? 'Evet' : 'Hayır',
          });
        });
        break;
      }
    }

    // Sheet Stil Giydirme (Header Koyu Lacivert)
    const currentSheet = workbook.getWorksheet(sheetName);
    if (currentSheet) {
      currentSheet.getRow(1).eachCell((cell) => {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { ARGB: 'FF1E2534' },
        };
        cell.font = {
          color: { ARGB: 'FFFFFFFF' },
          bold: true,
          size: 10,
        };
        cell.alignment = { vertical: 'middle', horizontal: 'left' };
      });
    }
  }

  return workbook;
};

/**
 * Excel Dosyasını Yükler ve Veritabanına Aktarır (Restore)
 */
export const restoreBackupFromBuffer = async (fileBuffer, strategies = {}) => {
  const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
  const sheetNames = workbook.SheetNames;

  const results = {
    success: true,
    imported: {},
    errors: [],
  };

  // 1. Admin Kullanıcı ID'sini Bul (Zorunlu ilişkiler için)
  const adminUser = await prisma.user.findFirst({ where: { role: 'admin' } });
  if (!adminUser) {
    throw new Error('Sistemde varsayılan Admin kullanıcısı bulunamadı.');
  }
  const defaultCreatedById = adminUser.id;

  // 2. Overwrite silme sırasına göre silinecek modülleri tespit et
  const activeModulesToRestore = [];
  sheetNames.forEach((name) => {
    const modKey = SHEET_MODULE_MAP[name];
    if (modKey) activeModulesToRestore.push(modKey);
  });

  const overwriteModules = activeModulesToRestore.filter((modKey) => strategies[modKey] === 'overwrite');

  if (overwriteModules.length > 0) {
    const orderedToOverwrite = OVERWRITE_DELETE_ORDER.filter((modKey) => overwriteModules.includes(modKey));

    for (const modKey of orderedToOverwrite) {
      try {
        switch (modKey) {
          case 'returns':
            await prisma.returnItem.deleteMany({});
            await prisma.returnAccessoryItem.deleteMany({});
            await prisma.return.deleteMany({});
            break;
          case 'assignments':
            await prisma.assignmentItem.deleteMany({});
            await prisma.assignmentAccessoryItem.deleteMany({});
            await prisma.assignmentConsumableItem.deleteMany({});
            await prisma.assignment.deleteMany({});
            break;
          case 'employees':
            await prisma.employee.deleteMany({});
            break;
          case 'accessories':
            await prisma.accessory.deleteMany({});
            break;
          case 'consumables':
            await prisma.consumable.deleteMany({});
            break;
          case 'components':
            await prisma.component.deleteMany({});
            break;
          case 'licenses':
            await prisma.license.deleteMany({});
            break;
          case 'hardware':
            await prisma.hardware.deleteMany({});
            break;
          case 'users':
            await prisma.user.deleteMany({ where: { role: { not: 'admin' } } });
            break;
          case 'categories':
            await prisma.category.deleteMany({});
            break;
          case 'units':
            await prisma.unit.deleteMany({});
            break;
        }
      } catch (err) {
        results.errors.push(`'${MODULE_SHEET_MAP[modKey]}' tablosu silinirken hata: ${err.message}`);
      }
    }
  }

  // 3. Sheet verilerini sırayla içeri aktar
  for (const sheetName of sheetNames) {
    const modKey = SHEET_MODULE_MAP[sheetName];
    if (!modKey) continue;

    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(sheet);
    let count = 0;

    for (const row of rows) {
      try {
        switch (modKey) {
          case 'units': {
            const name = String(row['Birim Adı'] || '').trim();
            if (name) {
              await prisma.unit.upsert({
                where: { name },
                update: {
                  address: row['Adres'] ? String(row['Adres']).trim() : null,
                  phone: row['Telefon'] ? String(row['Telefon']).trim() : null,
                  contactPerson: row['Yetkili Kişi'] ? String(row['Yetkili Kişi']).trim() : null,
                  email: row['E-posta'] ? String(row['E-posta']).trim() : null,
                  isActive: String(row['Aktif mi']).toLowerCase() !== 'hayır',
                },
                create: {
                  name,
                  address: row['Adres'] ? String(row['Adres']).trim() : null,
                  phone: row['Telefon'] ? String(row['Telefon']).trim() : null,
                  contactPerson: row['Yetkili Kişi'] ? String(row['Yetkili Kişi']).trim() : null,
                  email: row['E-posta'] ? String(row['E-posta']).trim() : null,
                  isActive: String(row['Aktif mi']).toLowerCase() !== 'hayır',
                },
              });
              count++;
            }
            break;
          }

          case 'categories': {
            const name = String(row['Kategori Adı'] || '').trim();
            const parentType = String(row['Ana Tür'] || 'VARLIK').trim().toUpperCase();
            if (name && parentType) {
              await prisma.category.upsert({
                where: {
                  parentType_name: { parentType, name },
                },
                update: {},
                create: { parentType, name },
              });
              count++;
            }
            break;
          }

          case 'hardware': {
            const demirbasNo = String(row['Demirbaş No'] || '').trim();
            const brand = String(row['Marka'] || '').trim();
            const categoryName = String(row['Kategori'] || '').trim();

            if (demirbasNo && brand) {
              let category = null;
              if (categoryName) {
                category = await prisma.category.findFirst({ where: { name: categoryName, parentType: 'VARLIK' } });
              }
              if (!category) {
                category = await prisma.category.findFirst({ where: { parentType: 'VARLIK' } });
              }
              if (!category) {
                category = await prisma.category.create({ data: { parentType: 'VARLIK', name: categoryName || 'Genel Varlık' } });
              }

              const purchaseAmount = safeFloat(row['Satın Alma Tutarı'] || row['Fiyat']);
              const serialNo = row['Seri No'] && String(row['Seri No']).trim() !== '' ? String(row['Seri No']).trim() : demirbasNo;

              await prisma.hardware.upsert({
                where: { demirbasNo },
                update: {
                  brand,
                  model: row['Model'] ? String(row['Model']).trim() : null,
                  serialNo,
                  status: row['Durum'] ? String(row['Durum']).trim() : 'Hazir',
                  purchaseAmount,
                  location: row['Konum'] ? String(row['Konum']).trim() : null,
                  supplier: row['Tedarikçi'] ? String(row['Tedarikçi']).trim() : null,
                  invoiceNo: row['Fatura No'] ? String(row['Fatura No']).trim() : null,
                  category: { connect: { id: category.id } },
                },
                create: {
                  demirbasNo,
                  brand,
                  model: row['Model'] ? String(row['Model']).trim() : null,
                  serialNo,
                  status: row['Durum'] ? String(row['Durum']).trim() : 'Hazir',
                  purchaseAmount,
                  location: row['Konum'] ? String(row['Konum']).trim() : null,
                  supplier: row['Tedarikçi'] ? String(row['Tedarikçi']).trim() : null,
                  invoiceNo: row['Fatura No'] ? String(row['Fatura No']).trim() : null,
                  category: { connect: { id: category.id } },
                  createdBy: { connect: { id: defaultCreatedById } },
                },
              });
              count++;
            }
            break;
          }

          case 'accessories': {
            const name = String(row['Ürün Adı'] || '').trim();
            const categoryName = String(row['Kategori'] || '').trim();

            if (name) {
              let category = null;
              if (categoryName) {
                category = await prisma.category.findFirst({ where: { name: categoryName, parentType: 'AKSESUAR' } });
              }
              if (!category) {
                category = await prisma.category.findFirst({ where: { parentType: 'AKSESUAR' } });
              }
              if (!category) {
                category = await prisma.category.create({ data: { parentType: 'AKSESUAR', name: categoryName || 'Genel Aksesuar' } });
              }

              const totalQuantity = safeInt(row['Toplam Stok'], 0);
              const availableQuantity = safeInt(row['Kullanılabilir Stok'], totalQuantity);
              const purchaseAmount = safeFloat(row['Satın Alma Tutarı'] || row['Birim Fiyat']);

              const existing = await prisma.accessory.findFirst({ where: { name } });
              if (existing) {
                await prisma.accessory.update({
                  where: { id: existing.id },
                  data: {
                    totalQuantity,
                    availableQuantity,
                    purchaseAmount,
                    brand: row['Marka'] ? String(row['Marka']).trim() : null,
                    supplier: row['Tedarikçi'] ? String(row['Tedarikçi']).trim() : null,
                    notes: row['Notlar'] || row['Açıklama'] || null,
                  },
                });
              } else {
                await prisma.accessory.create({
                  data: {
                    name,
                    totalQuantity,
                    availableQuantity,
                    purchaseAmount,
                    brand: row['Marka'] ? String(row['Marka']).trim() : null,
                    supplier: row['Tedarikçi'] ? String(row['Tedarikçi']).trim() : null,
                    notes: row['Notlar'] || row['Açıklama'] || null,
                    category: { connect: { id: category.id } },
                    createdBy: { connect: { id: defaultCreatedById } },
                  },
                });
              }
              count++;
            }
            break;
          }

          case 'consumables': {
            const name = String(row['Ürün Adı'] || '').trim();
            const categoryName = String(row['Kategori'] || '').trim();

            if (name) {
              let category = null;
              if (categoryName) {
                category = await prisma.category.findFirst({ where: { name: categoryName, parentType: 'SARF_MALZEME' } });
              }
              if (!category) {
                category = await prisma.category.findFirst({ where: { parentType: 'SARF_MALZEME' } });
              }
              if (!category) {
                category = await prisma.category.create({ data: { parentType: 'SARF_MALZEME', name: categoryName || 'Genel Sarf' } });
              }

              const totalQuantity = safeInt(row['Toplam Stok'], 0);
              const availableQuantity = safeInt(row['Kullanılabilir Stok'], totalQuantity);
              const purchaseAmount = safeFloat(row['Satın Alma Tutarı'] || row['Birim Fiyat']);

              const existing = await prisma.consumable.findFirst({ where: { name } });
              if (existing) {
                await prisma.consumable.update({
                  where: { id: existing.id },
                  data: {
                    totalQuantity,
                    availableQuantity,
                    purchaseAmount,
                    manufacturer: row['Üretici'] ? String(row['Üretici']).trim() : null,
                    location: row['Konum'] ? String(row['Konum']).trim() : null,
                    notes: row['Notlar'] || row['Açıklama'] || null,
                  },
                });
              } else {
                await prisma.consumable.create({
                  data: {
                    name,
                    totalQuantity,
                    availableQuantity,
                    purchaseAmount,
                    manufacturer: row['Üretici'] ? String(row['Üretici']).trim() : null,
                    location: row['Konum'] ? String(row['Konum']).trim() : null,
                    notes: row['Notlar'] || row['Açıklama'] || null,
                    category: { connect: { id: category.id } },
                    createdBy: { connect: { id: defaultCreatedById } },
                  },
                });
              }
              count++;
            }
            break;
          }

          case 'components': {
            const name = String(row['Bileşen Adı'] || row['Ürün Adı'] || '').trim();
            const categoryName = String(row['Kategori'] || '').trim();

            if (name) {
              let category = null;
              if (categoryName) {
                category = await prisma.category.findFirst({ where: { name: categoryName, parentType: 'BILESEN' } });
              }
              if (!category) {
                category = await prisma.category.findFirst({ where: { parentType: 'BILESEN' } });
              }
              if (!category) {
                category = await prisma.category.create({ data: { parentType: 'BILESEN', name: categoryName || 'Genel Bileşen' } });
              }

              const totalQuantity = safeInt(row['Toplam Stok'], 0);
              const availableQuantity = safeInt(row['Kullanılabilir Stok'], totalQuantity);
              const purchaseAmount = safeFloat(row['Satın Alma Tutarı'] || row['Birim Fiyat']);

              const existing = await prisma.component.findFirst({ where: { name } });
              if (existing) {
                await prisma.component.update({
                  where: { id: existing.id },
                  data: {
                    totalQuantity,
                    availableQuantity,
                    purchaseAmount,
                    brand: row['Marka'] ? String(row['Marka']).trim() : null,
                    model: row['Model'] ? String(row['Model']).trim() : null,
                    notes: row['Notlar'] || row['Açıklama'] || null,
                  },
                });
              } else {
                await prisma.component.create({
                  data: {
                    name,
                    totalQuantity,
                    availableQuantity,
                    purchaseAmount,
                    brand: row['Marka'] ? String(row['Marka']).trim() : null,
                    model: row['Model'] ? String(row['Model']).trim() : null,
                    notes: row['Notlar'] || row['Açıklama'] || null,
                    category: { connect: { id: category.id } },
                    createdBy: { connect: { id: defaultCreatedById } },
                  },
                });
              }
              count++;
            }
            break;
          }

          case 'employees': {
            const tcNo = String(row['T.C. Kimlik / Sicil No'] || '').trim();
            const fullName = String(row['Ad Soyad'] || '').trim();
            if (fullName) {
              let unitId = null;
              if (row['Birim']) {
                const u = await prisma.unit.findUnique({ where: { name: String(row['Birim']).trim() } });
                if (u) unitId = u.id;
              }
              if (!unitId) {
                const defaultUnit = await prisma.unit.findFirst();
                if (defaultUnit) unitId = defaultUnit.id;
              }

              if (tcNo && unitId) {
                await prisma.employee.upsert({
                  where: { tcNo },
                  update: {
                    fullName,
                    email: row['E-posta'] ? String(row['E-posta']).trim() : null,
                    phone: row['Telefon'] ? String(row['Telefon']).trim() : null,
                    unitId,
                    isActive: String(row['Aktif mi']).toLowerCase() !== 'hayır',
                  },
                  create: {
                    tcNo,
                    fullName,
                    email: row['E-posta'] ? String(row['E-posta']).trim() : null,
                    phone: row['Telefon'] ? String(row['Telefon']).trim() : null,
                    unitId,
                    isActive: String(row['Aktif mi']).toLowerCase() !== 'hayır',
                  },
                });
                count++;
              }
            }
            break;
          }
        }
      } catch (rowErr) {
        results.errors.push(`[${sheetName}] Satır aktarılırken hata: ${rowErr.message}`);
      }
    }

    results.imported[modKey] = count;
  }

  return results;
};
