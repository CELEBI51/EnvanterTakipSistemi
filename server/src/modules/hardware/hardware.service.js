import prisma from '../../config/db.js';
import bwipjs from 'bwip-js';
import PDFDocument from 'pdfkit';

async function resolveCategoryId(categoryId, categoryName, parentType = 'VARLIK') {
  if (categoryId && categoryId.trim() !== '') {
    const existingCat = await prisma.category.findUnique({ where: { id: categoryId } });
    if (existingCat) {
      return existingCat.id;
    }
  }
  const name = (categoryName || 'Diğer').trim();

  let cat = await prisma.category.findUnique({
    where: {
      parentType_name: {
        parentType,
        name,
      },
    },
  });

  if (!cat) {
    cat = await prisma.category.create({
      data: {
        parentType,
        name,
      },
    });
  }

  return cat.id;
}

function formatHardware(item) {
  if (!item) return null;
  const { category, _count, ...rest } = item;
  const hasActiveMaintenance = _count ? _count.maintenances > 0 : false;
  return {
    ...rest,
    category: category ? category.name : null,
    categoryId: item.categoryId,
    hasActiveMaintenance,
  };
}

export const createHardware = async (data, userId) => {
  const {
    category,
    categoryId,
    brand,
    model,
    serial_no,
    serialNo,
    demirbas_no,
    wifi_mac_address,
    wifiMacAddress,
    location,
    supplier,
    invoice_no,
    invoiceNo,
    purchase_date,
    purchaseDate,
    purchase_amount,
    purchaseAmount,
    warranty_start_date,
    warranty_end_date,
    warrantyStartDate,
    warrantyEndDate,
    specs,
  } = data;

  const finalDemirbasNo = demirbas_no ? demirbas_no.trim() : '';

  if (!finalDemirbasNo) {
    const error = new Error('Demirbaş numarası zorunludur.');
    error.statusCode = 400;
    throw error;
  }

  const existing = await prisma.hardware.findUnique({
    where: { demirbasNo: finalDemirbasNo },
  });

  if (existing) {
    const error = new Error(`Bu demirbaş numarası (${finalDemirbasNo}) zaten kayıtlı, lütfen farklı bir numara girin.`);
    error.statusCode = 409;
    throw error;
  }

  const resolvedCatId = await resolveCategoryId(categoryId, category, 'VARLIK');

  const startDateVal = warranty_start_date !== undefined ? warranty_start_date : warrantyStartDate;
  const endDateVal = warranty_end_date !== undefined ? warranty_end_date : warrantyEndDate;

  const serialNoVal = serial_no !== undefined ? serial_no : serialNo;
  const wifiMacVal = wifi_mac_address !== undefined ? wifi_mac_address : wifiMacAddress;
  const invoiceNoVal = invoice_no !== undefined ? invoice_no : invoiceNo;
  const purchaseDateVal = purchase_date !== undefined ? purchase_date : purchaseDate;
  const purchaseAmountVal = purchase_amount !== undefined ? purchase_amount : purchaseAmount;

  try {
    const newItem = await prisma.hardware.create({
      data: {
        categoryId: resolvedCatId,
        brand: brand.trim(),
        model: model && model.trim() !== '' ? model.trim() : null,
        serialNo: serialNoVal ? serialNoVal.trim() : '',
        demirbasNo: finalDemirbasNo,
        wifiMacAddress: wifiMacVal && wifiMacVal.trim() !== '' ? wifiMacVal.trim() : null,
        location: location && location.trim() !== '' ? location.trim() : null,
        supplier: supplier && supplier.trim() !== '' ? supplier.trim() : null,
        invoiceNo: invoiceNoVal && invoiceNoVal.trim() !== '' ? invoiceNoVal.trim() : null,
        purchaseDate: purchaseDateVal && String(purchaseDateVal).trim() !== '' ? new Date(purchaseDateVal) : null,
        purchaseAmount: purchaseAmountVal !== null && purchaseAmountVal !== undefined ? purchaseAmountVal : null,
        specs: specs || null,
        status: 'Hazir',
        warrantyStartDate: startDateVal && String(startDateVal).trim() !== '' ? new Date(startDateVal) : null,
        warrantyEndDate: endDateVal && String(endDateVal).trim() !== '' ? new Date(endDateVal) : null,
        createdById: userId,
      },
      include: {
        category: true,
        createdBy: {
          select: { id: true, fullName: true, email: true },
        },
      },
    });

    return formatHardware(newItem);
  } catch (err) {
    if (err.code === 'P2002') {
      const error = new Error(`Bu demirbaş numarası (${finalDemirbasNo}) zaten kayıtlı, lütfen farklı bir numara girin.`);
      error.statusCode = 409;
      throw error;
    }
    throw err;
  }
};

export const listHardware = async ({ page = 1, pageSize = 10, category, status, q }) => {
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const sizeNum = 10;
  const skip = (pageNum - 1) * sizeNum;

  const where = {};

  if (category) {
    where.category = {
      name: category,
    };
  }

  if (status) {
    where.status = status;
  }

  if (q && q.trim() !== '') {
    const searchTerm = q.trim();
    where.OR = [
      { brand: { contains: searchTerm, mode: 'insensitive' } },
      { model: { contains: searchTerm, mode: 'insensitive' } },
      { serialNo: { contains: searchTerm, mode: 'insensitive' } },
      { demirbasNo: { contains: searchTerm, mode: 'insensitive' } },
      { location: { contains: searchTerm, mode: 'insensitive' } },
      { supplier: { contains: searchTerm, mode: 'insensitive' } },
      { invoiceNo: { contains: searchTerm, mode: 'insensitive' } },
      { category: { name: { contains: searchTerm, mode: 'insensitive' } } },
    ];
  }

  const [totalCount, items] = await Promise.all([
    prisma.hardware.count({ where }),
    prisma.hardware.findMany({
      where,
      skip,
      take: sizeNum,
      orderBy: { createdAt: 'desc' },
      include: {
        category: true,
        createdBy: {
          select: { id: true, fullName: true, email: true, role: true },
        },
        _count: {
          select: {
            maintenances: {
              where: { status: 'Devam Ediyor' },
            },
          },
        },
      },
    }),
  ]);

  const totalPages = Math.ceil(totalCount / sizeNum) || 1;

  return {
    items: items.map(formatHardware),
    totalCount,
    totalPages,
    currentPage: pageNum,
  };
};

export const getHardwareById = async (id) => {
  const item = await prisma.hardware.findUnique({
    where: { id },
    include: {
      category: true,
      createdBy: {
        select: { id: true, fullName: true, email: true, role: true },
      },
      _count: {
        select: {
          maintenances: {
            where: { status: 'Devam Ediyor' },
          },
        },
      },
    },
  });

  if (!item) {
    const error = new Error('Ürün bulunamadı.');
    error.statusCode = 404;
    throw error;
  }

  return formatHardware(item);
};

export const updateHardware = async (id, data) => {
  const existing = await prisma.hardware.findUnique({ where: { id } });
  if (!existing) {
    const error = new Error('Güncellenecek ürün bulunamadı.');
    error.statusCode = 404;
    throw error;
  }

  const updateData = {};

  if (data.categoryId || data.category) {
    updateData.categoryId = await resolveCategoryId(data.categoryId, data.category, 'VARLIK');
  }

  if (data.brand !== undefined) updateData.brand = data.brand.trim();
  if (data.model !== undefined) updateData.model = data.model && data.model.trim() !== '' ? data.model.trim() : null;

  const serialNoVal = data.serial_no !== undefined ? data.serial_no : data.serialNo;
  if (serialNoVal !== undefined) updateData.serialNo = serialNoVal ? serialNoVal.trim() : '';

  const wifiMacVal = data.wifi_mac_address !== undefined ? data.wifi_mac_address : data.wifiMacAddress;
  if (wifiMacVal !== undefined) updateData.wifiMacAddress = wifiMacVal && wifiMacVal.trim() !== '' ? wifiMacVal.trim() : null;

  if (data.location !== undefined) updateData.location = data.location && data.location.trim() !== '' ? data.location.trim() : null;
  if (data.supplier !== undefined) updateData.supplier = data.supplier && data.supplier.trim() !== '' ? data.supplier.trim() : null;

  const invoiceNoVal = data.invoice_no !== undefined ? data.invoice_no : data.invoiceNo;
  if (invoiceNoVal !== undefined) updateData.invoiceNo = invoiceNoVal && invoiceNoVal.trim() !== '' ? invoiceNoVal.trim() : null;

  const purchaseDateVal = data.purchase_date !== undefined ? data.purchase_date : data.purchaseDate;
  if (purchaseDateVal !== undefined) {
    updateData.purchaseDate = purchaseDateVal && String(purchaseDateVal).trim() !== '' ? new Date(purchaseDateVal) : null;
  }

  const purchaseAmountVal = data.purchase_amount !== undefined ? data.purchase_amount : data.purchaseAmount;
  if (purchaseAmountVal !== undefined) {
    updateData.purchaseAmount = purchaseAmountVal !== null ? purchaseAmountVal : null;
  }

  if (data.status !== undefined) {
    // Statü elle değiştirilmek istendiğinde sadece 'Arizali' veya 'KullanimDisi' (veya mevcut statüsüne) çekilmesine izin verilir.
    // 'Hazir', 'Kullanimda' ve 'Serviste' durumları sistem otomatik süreçleriyle (Zimmetleme, İade, Bakım) yönetilir.
    const allowedManualStatuses = ['Arizali', 'KullanimDisi', existing.status];
    if (!allowedManualStatuses.includes(data.status)) {
      const error = new Error('"Hazır", "Kullanımda" veya "Serviste" durumları elle seçilemez. Bu durumlar Zimmetleme, İade ve Bakım modülleri tarafından otomatik yönetilir.');
      error.statusCode = 400;
      throw error;
    }
    updateData.status = data.status;
  }

  if (data.specs !== undefined) updateData.specs = data.specs;

  const startDateVal = data.warranty_start_date !== undefined ? data.warranty_start_date : data.warrantyStartDate;
  const endDateVal = data.warranty_end_date !== undefined ? data.warranty_end_date : data.warrantyEndDate;

  if (startDateVal !== undefined) {
    updateData.warrantyStartDate = startDateVal && String(startDateVal).trim() !== '' ? new Date(startDateVal) : null;
  }
  if (endDateVal !== undefined) {
    updateData.warrantyEndDate = endDateVal && String(endDateVal).trim() !== '' ? new Date(endDateVal) : null;
  }

  const updatedItem = await prisma.hardware.update({
    where: { id },
    data: updateData,
    include: {
      category: true,
      createdBy: {
        select: { id: true, fullName: true, email: true, role: true },
      },
    },
  });

  return formatHardware(updatedItem);
};

export const deleteHardware = async (id) => {
  const error = new Error('Varlık malzemeleri sistemden silinemez. Durumu "Kullanım Dışı" veya "Arızalı" olarak güncelleyebilirsiniz.');
  error.statusCode = 400;
  throw error;
};


/**
 * Get Hardware Statistics Summary (total, inUse, ready, needsAttention).
 */
export const getHardwareStats = async () => {
  const [total, inUse, ready, needsAttention] = await Promise.all([
    prisma.hardware.count(),
    prisma.hardware.count({ where: { status: 'Kullanimda' } }),
    prisma.hardware.count({ where: { status: 'Hazir' } }),
    prisma.hardware.count({ where: { status: { in: ['Arizali', 'Serviste', 'KullanimDisi'] } } }),
  ]);

  return {
    total,
    inUse,
    ready,
    needsAttention,
  };
};



export const exportHardware = async ({ category, status, q }, res) => {

  const where = {};

  if (category) {
    where.category = {
      name: category,
    };
  }

  if (status) {
    where.status = status;
  }

  if (q && q.trim() !== '') {
    const searchTerm = q.trim();
    where.OR = [
      { brand: { contains: searchTerm, mode: 'insensitive' } },
      { model: { contains: searchTerm, mode: 'insensitive' } },
      { serialNo: { contains: searchTerm, mode: 'insensitive' } },
      { demirbasNo: { contains: searchTerm, mode: 'insensitive' } },
      { location: { contains: searchTerm, mode: 'insensitive' } },
      { supplier: { contains: searchTerm, mode: 'insensitive' } },
      { invoiceNo: { contains: searchTerm, mode: 'insensitive' } },
      { category: { name: { contains: searchTerm, mode: 'insensitive' } } },
    ];
  }

  const items = await prisma.hardware.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: {
      category: true,
    },
  });

  const columns = [
    { header: 'Demirbaş No', key: 'demirbasNo', width: 18 },
    { header: 'Seri No', key: 'serialNo', width: 20 },
    { header: 'Kategori', key: 'categoryName', width: 18 },
    { header: 'Marka', key: 'brand', width: 16 },
    { header: 'Model', key: 'model', width: 16 },
    { header: 'Durum', key: 'statusText', width: 15 },
    { header: 'Lokasyon', key: 'location', width: 18 },
    { header: 'Garanti Bitiş Tarihi', key: 'warrantyEndDate', width: 20 },
    { header: 'Satın Alma Tarihi', key: 'purchaseDate', width: 18 },
    { header: 'Tedarikçi', key: 'supplier', width: 20 },
  ];

  const STATUS_TEXT_MAP = {
    Hazir: 'Hazır',
    Kullanimda: 'Kullanımda',
    Arizali: 'Arızalı',
    Serviste: 'Serviste',
    KullanimDisi: 'Kullanım Dışı',
  };

  const rows = items.map((item) => ({
    demirbasNo: item.demirbasNo || '-',
    serialNo: item.serialNo || '-',
    categoryName: item.category ? item.category.name : '-',
    brand: item.brand || '-',
    model: item.model || '-',
    statusText: STATUS_TEXT_MAP[item.status] || item.status,
    location: item.location || '-',
    warrantyEndDate: item.warrantyEndDate ? new Date(item.warrantyEndDate).toLocaleDateString('tr-TR') : '-',
    purchaseDate: item.purchaseDate ? new Date(item.purchaseDate).toLocaleDateString('tr-TR') : '-',
    supplier: item.supplier || '-',
  }));

  const { createExcelStream } = await import('../../services/excelExport.service.js');
  const todayStr = new Date().toISOString().split('T')[0];
  await createExcelStream('Varlıklar', columns, rows, res, `varlik_${todayStr}.xlsx`);
};


/**
 * Get assignment history for a specific hardware item.
 * Returns ONE record per assignment — if returned, return info is merged into the same record.
 */
export const getHardwareHistory = async (hardwareId) => {
  // 1. Get all AssignmentItems for this hardware, with return info
  const assignmentItems = await prisma.assignmentItem.findMany({
    where: { hardwareId },
    include: {
      assignment: {
        include: {
          employee: {
            select: {
              id: true,
              fullName: true,
              unit: { select: { name: true } },
            },
          },
          createdBy: {
            select: { id: true, fullName: true },
          },
          returns: {
            include: {
              items: {
                where: { hardwareId },
                select: { resultStatus: true },
              },
            },
            orderBy: { tarih: 'desc' },
            take: 1,
          },
        },
      },
    },
    orderBy: { assignment: { teslimTarihi: 'desc' } },
  });

  // 2. Build one card per assignment
  const history = assignmentItems.map((ai) => {
    const a = ai.assignment;
    const returnRecord = a.returns?.[0] || null;
    const returnItemForHw = returnRecord?.items?.[0] || null;

    return {
      id: ai.id,
      assignmentId: a.id,
      employeeName: a.employee?.fullName || '-',
      employeeUnit: a.employee?.unit?.name || null,
      teslimEden: a.teslimEden,
      teslimTarihi: a.teslimTarihi,
      createdBy: a.createdBy?.fullName || null,
      // Return info (merged into same record)
      returned: ai.returned,
      returnDate: ai.returnDate || (returnRecord?.tarih ?? null),
      teslimAlanIc: returnRecord?.teslimAlanIc || null,
      resultStatus: returnItemForHw?.resultStatus || null,
      returnNotes: returnRecord?.notes || null,
    };
  });

  return history;
};

export const getHardwareForBarcodes = async (hardwareIds) => {
  const where = {};
  if (Array.isArray(hardwareIds) && hardwareIds.length > 0) {
    where.id = { in: hardwareIds };
  }

  const items = await prisma.hardware.findMany({
    where,
    select: {
      id: true,
      demirbasNo: true,
      brand: true,
      model: true,
    },
    orderBy: {
      demirbasNo: 'asc',
    },
  });

  return items;
};

function toAsciiTurkish(str) {
  if (!str) return '';
  return String(str)
    .replace(/ğ/g, 'g').replace(/Ğ/g, 'G')
    .replace(/ü/g, 'u').replace(/Ü/g, 'U')
    .replace(/ş/g, 's').replace(/Ş/g, 'S')
    .replace(/ı/g, 'i').replace(/İ/g, 'I')
    .replace(/ö/g, 'o').replace(/Ö/g, 'O')
    .replace(/ç/g, 'c').replace(/Ç/g, 'C');
}

export const generateBarcodesPdf = async (hardwareIds) => {
  const items = await getHardwareForBarcodes(hardwareIds);

  const barcodeItems = await Promise.all(
    items.map(async (hw) => {
      const textToEncode = (hw.demirbasNo && hw.demirbasNo.trim()) || 'BARCODE';
      const pngBuffer = await bwipjs.toBuffer({
        bcid: 'code128',
        text: textToEncode,
        scale: 3,
        height: 10,
        includetext: false,
        backgroundcolor: 'ffffff',
      });

      const rawTitle = `${hw.brand || ''} ${hw.model || ''}`.trim() || 'Donanim Varligi';
      const productTitle = rawTitle.length > 22 ? `${rawTitle.slice(0, 22)}...` : rawTitle;

      return {
        id: hw.id,
        demirbasNo: textToEncode,
        productTitle: toAsciiTurkish(productTitle),
        pngBuffer,
      };
    })
  );

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 24 });
    const chunks = [];

    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const marginLeft = 24;
    const marginTop = 24;
    const labelWidth = 175;
    const labelHeight = 90;
    const gapX = 10;
    const gapY = 10;
    const cols = 3;
    const rows = 8;
    const maxPerPage = cols * rows;

    barcodeItems.forEach((item, index) => {
      if (index > 0 && index % maxPerPage === 0) {
        doc.addPage();
      }

      const itemOnPage = index % maxPerPage;
      const col = itemOnPage % cols;
      const row = Math.floor(itemOnPage / cols);

      const x = marginLeft + col * (labelWidth + gapX);
      const y = marginTop + row * (labelHeight + gapY);

      // Label border
      doc.roundedRect(x, y, labelWidth, labelHeight, 4).strokeColor('#cbd5e1').lineWidth(0.8).stroke();

      // Barcode Image
      try {
        doc.image(item.pngBuffer, x + (labelWidth - 130) / 2, y + 8, { width: 130, height: 38 });
      } catch (imgErr) {
        // Fallback if image fails
      }

      // Demirbaş No
      doc.font('Courier-Bold').fontSize(8.5).fillColor('#0f172a');
      doc.text(item.demirbasNo, x + 5, y + 50, { width: labelWidth - 10, align: 'center' });

      // Product Title
      doc.font('Helvetica').fontSize(7.5).fillColor('#475569');
      doc.text(item.productTitle, x + 5, y + 66, { width: labelWidth - 10, align: 'center' });
    });

    doc.end();
  });
};

