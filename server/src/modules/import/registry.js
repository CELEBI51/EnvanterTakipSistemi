import prisma from '../../config/db.js';

export const importRegistry = {
  hardware: {
    key: 'hardware',
    label: 'Varlık (Demirbaş)',
    prismaModel: 'hardware',
    uniqueKey: 'demirbasNo',
    columns: [
      { key: 'demirbasNo', header: 'Demirbaş No', required: true, type: 'string' },
      { key: 'serialNo', header: 'Seri No', required: false, type: 'string' },
      { key: 'brand', header: 'Marka', required: true, type: 'string' },
      { key: 'model', header: 'Model', required: true, type: 'string' },
      { key: 'status', header: 'Durum', required: false, type: 'string', defaultValue: 'Hazir' },
      {
        key: 'categoryName',
        header: 'Kategori Adı',
        required: true,
        type: 'reference',
        resolveTo: 'categoryId',
        lookupModel: 'category',
        lookupField: 'name',
        extraFilter: { parentType: 'VARLIK' }
      },
      {
        key: 'unitName',
        header: 'Birim Adı',
        required: false,
        type: 'reference',
        resolveTo: 'unitId',
        lookupModel: 'unit',
        lookupField: 'name'
      }
    ],
    transformRow: (row, resolvedRefs, userId) => ({
      demirbasNo: String(row.demirbasNo).trim(),
      serialNo: row.serialNo ? String(row.serialNo).trim() : `SN-${String(row.demirbasNo).trim()}`,
      brand: String(row.brand).trim(),
      model: String(row.model).trim(),
      status: row.status ? String(row.status).trim() : 'Hazir',
      category: { connect: { id: resolvedRefs.categoryId } },
      createdBy: { connect: { id: userId } },
    }),
  },
  accessory: {
    key: 'accessory',
    label: 'Aksesuar',
    prismaModel: 'accessory',
    uniqueKey: null,
    columns: [
      { key: 'name', header: 'Aksesuar Adı', required: true, type: 'string' },
      { key: 'totalQuantity', header: 'Toplam Adet', required: true, type: 'number' },
      { key: 'brand', header: 'Marka', required: false, type: 'string' },
      { key: 'supplier', header: 'Tedarikçi', required: false, type: 'string' },
      {
        key: 'categoryName',
        header: 'Kategori Adı',
        required: true,
        type: 'reference',
        resolveTo: 'categoryId',
        lookupModel: 'category',
        lookupField: 'name',
        extraFilter: { parentType: 'AKSESUAR' }
      }
    ],
    transformRow: (row, resolvedRefs, userId) => {
      const qty = parseInt(row.totalQuantity, 10) || 1;
      return {
        name: String(row.name).trim(),
        brand: row.brand ? String(row.brand).trim() : null,
        supplier: row.supplier ? String(row.supplier).trim() : null,
        totalQuantity: qty,
        availableQuantity: qty,
        assignedQuantity: 0,
        outOfUseQuantity: 0,
        category: { connect: { id: resolvedRefs.categoryId } },
        createdBy: { connect: { id: userId } },
      };
    },
  },
  license: {
    key: 'license',
    label: 'Lisans',
    prismaModel: 'license',
    uniqueKey: 'licenseKey',
    columns: [
      { key: 'brand', header: 'Marka', required: true, type: 'string' },
      { key: 'productInfo', header: 'Ürün Bilgisi', required: true, type: 'string' },
      { key: 'licenseKey', header: 'Lisans Anahtarı', required: false, type: 'string' },
      { key: 'startDate', header: 'Başlangıç Tarihi', required: true, type: 'date' },
      { key: 'endDate', header: 'Bitiş Tarihi', required: true, type: 'date' },
      { key: 'paymentType', header: 'Ödeme Tipi', required: false, type: 'string', defaultValue: 'KREDI_KARTI' },
      { key: 'status', header: 'Durum', required: false, type: 'string', defaultValue: 'AKTIF' },
      {
        key: 'unitName',
        header: 'Birim Adı',
        required: true,
        type: 'reference',
        resolveTo: 'unitId',
        lookupModel: 'unit',
        lookupField: 'name'
      }
    ],
    transformRow: (row, resolvedRefs, userId) => {
      return {
        brand: String(row.brand).trim(),
        productInfo: String(row.productInfo).trim(),
        licenseKey: row.licenseKey ? String(row.licenseKey).trim() : null,
        startDate: new Date(row.startDate),
        endDate: new Date(row.endDate),
        paymentType: row.paymentType ? String(row.paymentType).trim() : 'KREDI_KARTI',
        status: row.status ? String(row.status).trim() : 'AKTIF',
        unit: { connect: { id: resolvedRefs.unitId } },
        createdBy: { connect: { id: userId } },
      };
    },
  },
  consumable: {
    key: 'consumable',
    label: 'Sarf Malzeme',
    prismaModel: 'consumable',
    uniqueKey: null,
    columns: [
      { key: 'name', header: 'Sarf Malzeme Adı', required: true, type: 'string' },
      { key: 'totalQuantity', header: 'Toplam Adet', required: true, type: 'number' },
      { key: 'manufacturer', header: 'Üretici', required: false, type: 'string' },
      { key: 'supplier', header: 'Tedarikçi', required: false, type: 'string' },
      {
        key: 'categoryName',
        header: 'Kategori Adı',
        required: true,
        type: 'reference',
        resolveTo: 'categoryId',
        lookupModel: 'category',
        lookupField: 'name',
        extraFilter: { parentType: 'SARF_MALZEME' }
      }
    ],
    transformRow: (row, resolvedRefs, userId) => {
      const qty = parseInt(row.totalQuantity, 10) || 1;
      return {
        name: String(row.name).trim(),
        manufacturer: row.manufacturer ? String(row.manufacturer).trim() : null,
        supplier: row.supplier ? String(row.supplier).trim() : null,
        totalQuantity: qty,
        availableQuantity: qty,
        consumedQuantity: 0,
        category: { connect: { id: resolvedRefs.categoryId } },
        createdBy: { connect: { id: userId } },
      };
    },
  },
  component: {
    key: 'component',
    label: 'Bileşen',
    prismaModel: 'component',
    uniqueKey: null,
    columns: [
      { key: 'name', header: 'Bileşen Adı', required: true, type: 'string' },
      { key: 'totalQuantity', header: 'Toplam Adet', required: true, type: 'number' },
      { key: 'brand', header: 'Marka', required: false, type: 'string' },
      { key: 'model', header: 'Model', required: false, type: 'string' },
      {
        key: 'categoryName',
        header: 'Kategori Adı',
        required: true,
        type: 'reference',
        resolveTo: 'categoryId',
        lookupModel: 'category',
        lookupField: 'name',
        extraFilter: { parentType: 'BILESEN' }
      }
    ],
    transformRow: (row, resolvedRefs, userId) => {
      const qty = parseInt(row.totalQuantity, 10) || 1;
      return {
        name: String(row.name).trim(),
        brand: row.brand ? String(row.brand).trim() : null,
        model: row.model ? String(row.model).trim() : null,
        totalQuantity: qty,
        availableQuantity: qty,
        usedQuantity: 0,
        category: { connect: { id: resolvedRefs.categoryId } },
        createdBy: { connect: { id: userId } },
      };
    },
  },
  employee: {
    key: 'employee',
    label: 'Personel',
    prismaModel: 'employee',
    uniqueKey: 'tcNo',
    columns: [
      { key: 'fullName', header: 'Ad Soyad', required: true, type: 'string' },
      { 
        key: 'tcNo', 
        header: 'Sicil No', 
        required: true, 
        type: 'string',
        patternMessage: '"Sicil No" alanı zorunludur.'
      },

      { key: 'phone', header: 'Telefon', required: false, type: 'string' },
      { key: 'email', header: 'E-posta', required: false, type: 'string' },
      {
        key: 'unitName',
        header: 'Birim Adı',
        required: true,
        type: 'reference',
        resolveTo: 'unitId',
        lookupModel: 'unit',
        lookupField: 'name'
      }
    ],
    transformRow: (row, resolvedRefs) => ({
      fullName: String(row.fullName).trim(),
      tcNo: String(row.tcNo).trim(),
      phone: row.phone ? String(row.phone).trim() : null,
      email: row.email ? String(row.email).trim() : null,
      unit: { connect: { id: resolvedRefs.unitId } },
    }),
  }
};
