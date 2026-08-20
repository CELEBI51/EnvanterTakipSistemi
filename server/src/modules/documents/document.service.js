import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import PDFDocument from 'pdfkit';
import prisma from '../../config/db.js';
import * as settingsService from '../settings/settings.service.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

async function getCompanyHeaderData() {
  const settings = await settingsService.getSettings();
  const logoInfo = await settingsService.getLogoInfo();

  const companyName = toAsciiTurkish(settings.companyName || 'DITAS');
  let logoPath = null;

  if (settings && settings.logoPath) {
    const absolutePath = path.isAbsolute(settings.logoPath)
      ? settings.logoPath
      : path.join(process.cwd(), settings.logoPath);
    if (fs.existsSync(absolutePath)) logoPath = absolutePath;
  }

  if (!logoPath) {
    const fallbackPaths = [
      path.join(__dirname, 'templates', 'ditas-logo.png'),
      path.join(process.cwd(), 'client/public/ditas-logo.png'),
      path.join(process.cwd(), 'public/ditas-logo.png'),
    ];
    for (const p of fallbackPaths) {
      if (fs.existsSync(p)) {
        logoPath = p;
        break;
      }
    }
  }

  return { companyName, logoPath, settings };
}

function renderEk10Pdf(doc, data) {
  const leftMargin = 36;
  const pageWidth = 523;

  // --- Top EK10 Label ---
  doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#000000');
  doc.text(toAsciiTurkish(data.ek_no || 'EK10'), leftMargin, 20, { width: pageWidth, align: 'right' });

  // --- Header Box (logo + title) ---
  const headerY = 30;
  const headerH = 40;
  doc.rect(leftMargin, headerY, pageWidth, headerH).strokeColor('#000000').lineWidth(0.8).stroke();
  doc.moveTo(leftMargin + 145, headerY).lineTo(leftMargin + 145, headerY + headerH).stroke();

  // Logo / Company Name in Col 1
  if (data.logoPath && fs.existsSync(data.logoPath)) {
    try {
      doc.image(data.logoPath, leftMargin + 8, headerY + 6, { fit: [130, 28] });
    } catch (e) {
      doc.font('Helvetica-Bold').fontSize(14).fillColor('#1c3f94').text(toAsciiTurkish(data.sirket_adi || 'DITAS'), leftMargin + 10, headerY + 12);
    }
  } else {
    doc.font('Helvetica-Bold').fontSize(14).fillColor('#1c3f94').text(toAsciiTurkish(data.sirket_adi || 'DITAS'), leftMargin + 10, headerY + 12);
  }

  // Header Title in the area beside the logo
  doc.font('Helvetica-Bold').fontSize(13).fillColor('#000000');
  doc.text(toAsciiTurkish(data.baslik || 'ZIMMETLEME FORMU'), leftMargin + 145, headerY + 13, { width: pageWidth - 145, align: 'center' });

  // --- Demirbas No Row ---
  const demirbasY = 76;
  const demirbasH = 20;
  doc.rect(leftMargin, demirbasY, pageWidth, demirbasH).strokeColor('#000000').stroke();
  doc.moveTo(leftMargin + 190, demirbasY).lineTo(leftMargin + 190, demirbasY + demirbasH).stroke();

  doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#000000');
  doc.text('BILGI ISLEM DEMIRBAS NO :', leftMargin + 8, demirbasY + 6);
  doc.font('Helvetica').fontSize(9);
  doc.text(toAsciiTurkish(data.demirbas_no || ''), leftMargin + 198, demirbasY + 6);

  // --- Cihaz Temel Bilgileri Tablosu ---
  const cihazY = 102;
  const cihazColW = pageWidth / 4; // 130.75
  doc.rect(leftMargin, cihazY, pageWidth, 30).strokeColor('#000000').stroke();
  doc.rect(leftMargin, cihazY, pageWidth, 14).fill('#eeeeee');
  doc.moveTo(leftMargin, cihazY + 14).lineTo(leftMargin + pageWidth, cihazY + 14).strokeColor('#000000').stroke();

  // Vertical dividers
  for (let c = 1; c < 4; c++) {
    doc.moveTo(leftMargin + c * cihazColW, cihazY).lineTo(leftMargin + c * cihazColW, cihazY + 30).stroke();
  }

  const cihazHeaders = ['CINSI', 'MARKASI', 'MODELI', 'SERI NUMARASI'];
  const cihazValues = [
    toAsciiTurkish(data.cinsi || ''),
    toAsciiTurkish(data.markasi || ''),
    toAsciiTurkish(data.modeli || ''),
    toAsciiTurkish(data.seri_no || ''),
  ];

  doc.font('Helvetica-Bold').fontSize(8).fillColor('#000000');
  cihazHeaders.forEach((h, i) => {
    doc.text(h, leftMargin + i * cihazColW, cihazY + 3, { width: cihazColW, align: 'center' });
  });

  doc.font('Helvetica').fontSize(8).fillColor('#000000');
  cihazValues.forEach((v, i) => {
    doc.text(v, leftMargin + i * cihazColW, cihazY + 18, { width: cihazColW, align: 'center' });
  });

  // --- Parca Detay Tablosu (11 Rows EK10 Standard) ---
  const parcaY = 138;
  const colW = [105, 130, 105, 90, 93]; // Total 523
  const colX = [
    leftMargin,
    leftMargin + 105,
    leftMargin + 235,
    leftMargin + 340,
    leftMargin + 430,
  ];

  const parcalar = data.parcalar || [];
  const parcaRowH = 14;
  const parcaHeaderH = 15;
  const totalParcaRows = Math.max(parcalar.length, 11);
  const totalParcaH = parcaHeaderH + totalParcaRows * parcaRowH;

  doc.rect(leftMargin, parcaY, pageWidth, totalParcaH).strokeColor('#000000').stroke();
  doc.rect(leftMargin, parcaY, pageWidth, parcaHeaderH).fill('#eeeeee');
  doc.moveTo(leftMargin, parcaY + parcaHeaderH).lineTo(leftMargin + pageWidth, parcaY + parcaHeaderH).strokeColor('#000000').stroke();

  // Vertical dividers
  for (let i = 1; i < colX.length; i++) {
    doc.moveTo(colX[i], parcaY).lineTo(colX[i], parcaY + totalParcaH).strokeColor('#000000').stroke();
  }

  const parcaHeaders = ['PARCA CINSI', 'PARCA OZELLIGI', 'PARCA MARKASI', 'PARCA SERI NO', 'ACIKLAMA'];
  doc.font('Helvetica-Bold').fontSize(8).fillColor('#000000');
  parcaHeaders.forEach((h, idx) => {
    doc.text(h, colX[idx], parcaY + 3, { width: colW[idx], align: 'center' });
  });

  doc.font('Helvetica').fontSize(8).fillColor('#000000');
  for (let r = 0; r < totalParcaRows; r++) {
    const rowY = parcaY + parcaHeaderH + r * parcaRowH;
    if (r > 0) {
      doc.moveTo(leftMargin, rowY).lineTo(leftMargin + pageWidth, rowY).strokeColor('#cccccc').stroke();
    }
    const p = parcalar[r] || {};
    const c1 = toAsciiTurkish(p.cins || '');
    const c2 = toAsciiTurkish(p.ozellik || '');
    const c3 = toAsciiTurkish(p.marka || '');
    const c4 = toAsciiTurkish(p.seri || '');
    const c5 = toAsciiTurkish(p.aciklama || '');

    doc.text(c1, colX[0] + 4, rowY + 3, { width: colW[0] - 8, align: 'left' });
    doc.text(c2, colX[1] + 4, rowY + 3, { width: colW[1] - 8, align: 'left' });
    doc.text(c3, colX[2] + 4, rowY + 3, { width: colW[2] - 8, align: 'left' });
    doc.text(c4, colX[3] + 4, rowY + 3, { width: colW[3] - 8, align: 'left' });
    doc.text(c5, colX[4] + 4, rowY + 3, { width: colW[4] - 8, align: 'left' });
  }

  // --- ZIMMETLEME & IADE BOLUMLERI ---
  let nextY = parcaY + totalParcaH + 6;
  const drawDeliveryBlock = (title, tarih, edenLok, edenIsim, alanLok, alanIsim) => {
    const blockWidth = pageWidth;
    const halfWidth = blockWidth / 2;

    // Title & Date Row
    doc.rect(leftMargin, nextY, blockWidth, 15).strokeColor('#000000').stroke();
    doc.moveTo(leftMargin + halfWidth, nextY).lineTo(leftMargin + halfWidth, nextY + 15).stroke();
    doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#000000');
    doc.text(toAsciiTurkish(title), leftMargin + 6, nextY + 3.5);
    doc.text(`TARIH : ${tarih || ''}`, leftMargin + halfWidth + 6, nextY + 3.5);
    nextY += 15;

    // Subheader (TESLIM EDEN / TESLIM ALAN)
    doc.rect(leftMargin, nextY, blockWidth, 14).fill('#eeeeee');
    doc.rect(leftMargin, nextY, blockWidth, 14).strokeColor('#000000').stroke();
    doc.moveTo(leftMargin + halfWidth, nextY).lineTo(leftMargin + halfWidth, nextY + 14).stroke();
    doc.font('Helvetica-Bold').fontSize(8).fillColor('#000000');
    doc.text('TESLIM EDEN', leftMargin, nextY + 3, { width: halfWidth, align: 'center' });
    doc.text('TESLIM ALAN', leftMargin + halfWidth, nextY + 3, { width: halfWidth, align: 'center' });
    nextY += 14;

    // Body (Isim Soyisim / Imza)
    const bodyH = 50;
    doc.rect(leftMargin, nextY, blockWidth, bodyH).strokeColor('#000000').stroke();
    doc.moveTo(leftMargin + halfWidth, nextY).lineTo(leftMargin + halfWidth, nextY + bodyH).stroke();

    // Left Col
    doc.font('Helvetica-Bold').fontSize(8).fillColor('#000000');
    doc.text('ISIM SOYISIM :', leftMargin + 6, nextY + 10);
    doc.font('Helvetica').text(toAsciiTurkish(edenIsim), leftMargin + 75, nextY + 10);
    doc.font('Helvetica-Bold').text('IMZA :', leftMargin + 6, nextY + 32);

    // Right Col
    doc.font('Helvetica-Bold').text('ISIM SOYISIM :', leftMargin + halfWidth + 6, nextY + 10);
    doc.font('Helvetica').text(toAsciiTurkish(alanIsim), leftMargin + halfWidth + 75, nextY + 10);
    doc.font('Helvetica-Bold').text('IMZA :', leftMargin + halfWidth + 6, nextY + 32);

    nextY += bodyH + 5;
  };

  // Zimmetleme Block
  drawDeliveryBlock(
    'ZIMMETLEME',
    data.zimmet_tarihi,
    data.zimmet_teslim_eden_lokasyon,
    data.zimmet_teslim_eden_isim,
    data.zimmet_teslim_alan_lokasyon,
    data.zimmet_teslim_alan_isim
  );

  // Iade Block
  drawDeliveryBlock(
    'I A D E',
    data.iade_tarihi,
    data.iade_teslim_eden_lokasyon,
    data.iade_teslim_eden_isim,
    data.iade_teslim_alan_lokasyon,
    data.iade_teslim_alan_isim
  );

  // --- Declaration Text ---
  doc.font('Helvetica').fontSize(7.5).fillColor('#000000');
  const onayMetni = 'Is bu zimmet formunda yer alan cihazin kullanici kaynakli hasarlarinin tarafimca karsilanacagini beyan, kabul ve taahhut ederim.';
  doc.text(toAsciiTurkish(onayMetni), leftMargin, nextY, { width: pageWidth });
  nextY += 18;

  // --- Right Aligned Footer Signature Block ---
  doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#000000');
  doc.text('Ad/Soyad', leftMargin, nextY, { width: pageWidth, align: 'right' });
  doc.text('Imza', leftMargin, nextY + 12, { width: pageWidth, align: 'right' });
}

export const generateAssignmentPdf = async (assignmentId) => {
  const assignment = await prisma.assignment.findUnique({
    where: { id: assignmentId },
    include: {
      employee: {
        include: { unit: true },
      },
      createdBy: true,
      items: {
        include: {
          hardware: {
            include: { category: true },
          },
        },
      },
      accessoryItems: {
        include: {
          accessory: {
            include: { category: true },
          },
        },
      },
      consumableItems: {
        include: {
          consumable: {
            include: { category: true },
          },
        },
      },
    },
  });

  if (!assignment) {
    const error = new Error('PDF üretilecek zimmet kaydı bulunamadı.');
    error.statusCode = 404;
    throw error;
  }

  const storageDir = path.resolve(__dirname, '..', '..', '..', 'storage', 'assignment-pdfs');
  if (!fs.existsSync(storageDir)) {
    fs.mkdirSync(storageDir, { recursive: true });
  }

  const pdfFileName = `${assignmentId}.pdf`;
  const pdfFilePath = path.join(storageDir, pdfFileName);

  const headerData = await getCompanyHeaderData();
  const primaryHw = assignment.items[0]?.hardware || {};
  const specs = primaryHw.specs || {};

  // Build EK10 parts array
  const parcalar = [
    { cins: 'ISLEMCI', ozellik: specs.cpu || '-', marka: specs.cpuBrand || '', seri: '', aciklama: '' },
    { cins: 'SABIT DISK', ozellik: specs.disk || specs.storage || '-', marka: '', seri: '', aciklama: '' },
    { cins: 'HAFIZA', ozellik: specs.ram || '-', marka: '', seri: '', aciklama: '' },
    { cins: 'CD SURUCU', ozellik: specs.dvd ? 'Var' : (specs.cd || '-'), marka: '', seri: '', aciklama: '' },
    { cins: 'EKRAN', ozellik: specs.gpu || specs.screen || '-', marka: '', seri: '', aciklama: '' },
    { cins: 'HARICI BELLEK', ozellik: specs.externalDrive || '-', marka: '', seri: '', aciklama: '' },
    { cins: 'TARAYICI', ozellik: specs.scanner || '-', marka: '', seri: '', aciklama: '' },
    { cins: 'YAZICI', ozellik: specs.printer || '-', marka: '', seri: '', aciklama: '' },
  ];

  if (assignment.accessoryItems) {
    for (const a of assignment.accessoryItems) {
      parcalar.push({
        cins: 'DIGER',
        ozellik: `${a.accessory?.name || 'Aksesuar'} (${a.quantityGiven} adet)`,
        marka: a.accessory?.brand || '',
        seri: '',
        aciklama: a.accessory?.category?.name || 'Aksesuar',
      });
    }
  }
  if (assignment.consumableItems) {
    for (const c of assignment.consumableItems) {
      parcalar.push({
        cins: 'DIGER',
        ozellik: `${c.consumable?.name || 'Sarf Malzeme'} (${c.quantityGiven} adet)`,
        marka: '',
        seri: '',
        aciklama: 'Sarf Malzeme',
      });
    }
  }
  if (specs.other && parcalar.length < 11) {
    parcalar.push({ cins: 'DIGER', ozellik: specs.other, marka: '', seri: '', aciklama: '' });
  }

  const ek10Data = {
    sirket_adi: headerData.companyName,
    logoPath: headerData.logoPath,
    baslik: 'ZIMMETLEME FORMU',
    ek_no: 'EK10',
    demirbas_no: primaryHw.demirbasNo || '-',
    cinsi: primaryHw.category?.name || 'LAPTOP',
    markasi: primaryHw.brand || '-',
    modeli: primaryHw.model || '-',
    seri_no: primaryHw.serialNo || '-',
    parcalar,
    zimmet_tarihi: new Date(assignment.teslimTarihi).toLocaleDateString('tr-TR'),
    zimmet_teslim_eden_lokasyon: '',
    zimmet_teslim_eden_isim: assignment.teslimEden || '',
    zimmet_teslim_alan_lokasyon: assignment.employee?.unit?.name || '',
    zimmet_teslim_alan_isim: assignment.employee?.fullName || '',
    iade_tarihi: '',
    iade_teslim_eden_lokasyon: '',
    iade_teslim_eden_isim: '',
    iade_teslim_alan_lokasyon: '',
    iade_teslim_alan_isim: '',
  };

  await new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 36 });
    const writeStream = fs.createWriteStream(pdfFilePath);
    doc.pipe(writeStream);

    writeStream.on('finish', resolve);
    writeStream.on('error', reject);
    doc.on('error', reject);

    renderEk10Pdf(doc, ek10Data);
    doc.end();
  });

  await prisma.assignment.update({
    where: { id: assignmentId },
    data: {
      pdfPath: pdfFilePath,
      pdfUrl: `/api/assignments/${assignmentId}/pdf`,
    },
  });

  return pdfFilePath;
};

export const generateReturnPdf = async (returnId) => {
  const returnRecord = await prisma.return.findUnique({
    where: { id: returnId },
    include: {
      assignment: {
        include: {
          employee: {
            include: { unit: true },
          },
          items: { include: { hardware: { include: { category: true } } } },
          accessoryItems: { include: { accessory: { include: { category: true } } } },
          consumableItems: { include: { consumable: { include: { category: true } } } },
        },
      },
      items: { include: { hardware: { include: { category: true } } } },
      accessoryItems: { include: { accessory: { include: { category: true } } } },
    },
  });

  if (!returnRecord) {
    const error = new Error('PDF üretilecek iade kaydı bulunamadı.');
    error.statusCode = 404;
    throw error;
  }

  const assignment = returnRecord.assignment;

  const storageDir = path.resolve(__dirname, '..', '..', '..', 'storage', 'return-pdfs');
  if (!fs.existsSync(storageDir)) {
    fs.mkdirSync(storageDir, { recursive: true });
  }

  const pdfFileName = `${returnId}.pdf`;
  const pdfFilePath = path.join(storageDir, pdfFileName);

  const headerData = await getCompanyHeaderData();
  const returnedHw = returnRecord.items[0]?.hardware || assignment.items[0]?.hardware || {};
  const specs = returnedHw.specs || {};

  const parcalar = [
    { cins: 'ISLEMCI', ozellik: specs.cpu || '-', marka: specs.cpuBrand || '', seri: '', aciklama: '' },
    { cins: 'SABIT DISK', ozellik: specs.disk || specs.storage || '-', marka: '', seri: '', aciklama: '' },
    { cins: 'HAFIZA', ozellik: specs.ram || '-', marka: '', seri: '', aciklama: '' },
    { cins: 'CD SURUCU', ozellik: specs.dvd ? 'Var' : (specs.cd || '-'), marka: '', seri: '', aciklama: '' },
    { cins: 'EKRAN', ozellik: specs.gpu || specs.screen || '-', marka: '', seri: '', aciklama: '' },
    { cins: 'HARICI BELLEK', ozellik: specs.externalDrive || '-', marka: '', seri: '', aciklama: '' },
    { cins: 'TARAYICI', ozellik: specs.scanner || '-', marka: '', seri: '', aciklama: '' },
    { cins: 'YAZICI', ozellik: specs.printer || '-', marka: '', seri: '', aciklama: '' },
  ];

  if (returnRecord.accessoryItems) {
    for (const a of returnRecord.accessoryItems) {
      parcalar.push({
        cins: 'DIGER',
        ozellik: `${a.accessory?.name || 'Aksesuar'} (${a.quantityReturned} adet iade)`,
        marka: a.accessory?.brand || '',
        seri: '',
        aciklama: a.resultStatus || 'Iade',
      });
    }
  }

  const ek10Data = {
    sirket_adi: headerData.companyName,
    logoPath: headerData.logoPath,
    baslik: 'ZIMMET IADE FORMU',
    ek_no: 'EK10',
    demirbas_no: returnedHw.demirbasNo || '-',
    cinsi: returnedHw.category?.name || 'LAPTOP',
    markasi: returnedHw.brand || '-',
    modeli: returnedHw.model || '-',
    seri_no: returnedHw.serialNo || '-',
    parcalar,
    zimmet_tarihi: new Date(assignment.teslimTarihi).toLocaleDateString('tr-TR'),
    zimmet_teslim_eden_lokasyon: '',
    zimmet_teslim_eden_isim: assignment.teslimEden || '',
    zimmet_teslim_alan_lokasyon: assignment.employee?.unit?.name || '',
    zimmet_teslim_alan_isim: assignment.employee?.fullName || '',
    iade_tarihi: new Date(returnRecord.tarih).toLocaleDateString('tr-TR'),
    iade_teslim_eden_lokasyon: assignment.employee?.unit?.name || '',
    iade_teslim_eden_isim: assignment.employee?.fullName || '',
    iade_teslim_alan_lokasyon: '',
    iade_teslim_alan_isim: returnRecord.teslimAlanIc || '',
  };

  await new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 36 });
    const writeStream = fs.createWriteStream(pdfFilePath);
    doc.pipe(writeStream);

    writeStream.on('finish', resolve);
    writeStream.on('error', reject);
    doc.on('error', reject);

    renderEk10Pdf(doc, ek10Data);
    doc.end();
  });

  await prisma.return.update({
    where: { id: returnId },
    data: {
      pdfPath: pdfFilePath,
    },
  });

  return pdfFilePath;
};
