import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import puppeteer from 'puppeteer';
import prisma from '../../config/db.js';
import * as settingsService from '../settings/settings.service.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function injectCompanySettingsInfo(html) {
  let updatedHtml = html;
  const settings = await settingsService.getSettings();
  const logoInfo = await settingsService.getLogoInfo();

  const companyName = settings.companyName || 'DİTAŞ Otomotiv';
  updatedHtml = updatedHtml.replaceAll('{{companyName}}', companyName);

  // Logo rendering
  if (logoInfo && logoInfo.base64) {
    updatedHtml = updatedHtml.replace('{{#hasLogo}}', '');
    updatedHtml = updatedHtml.replace('{{/hasLogo}}', '');
    updatedHtml = updatedHtml.replaceAll('{{logoBase64}}', logoInfo.base64);
  } else {
    // Check fallback ditas-logo.png in templates if no logo in settings
    const fallbackLogoPath = path.join(__dirname, 'templates', 'ditas-logo.png');
    if (fs.existsSync(fallbackLogoPath)) {
      const fallbackBase64 = `data:image/png;base64,${fs.readFileSync(fallbackLogoPath).toString('base64')}`;
      updatedHtml = updatedHtml.replace('{{#hasLogo}}', '');
      updatedHtml = updatedHtml.replace('{{/hasLogo}}', '');
      updatedHtml = updatedHtml.replaceAll('{{logoBase64}}', fallbackBase64);
    } else {
      updatedHtml = updatedHtml.replace(/{{#hasLogo}}[\s\S]*?{{\/hasLogo}}/, '');
    }
  }

  // Company details (address, phone)
  const detailsParts = [];
  if (settings.companyAddress) detailsParts.push(settings.companyAddress);
  if (settings.companyPhone) detailsParts.push(`Tel: ${settings.companyPhone}`);
  if (settings.companyEmail) detailsParts.push(`E-posta: ${settings.companyEmail}`);

  if (detailsParts.length > 0) {
    updatedHtml = updatedHtml.replace('{{#hasCompanyDetails}}', '');
    updatedHtml = updatedHtml.replace('{{/hasCompanyDetails}}', '');
    updatedHtml = updatedHtml.replaceAll('{{companyDetails}}', detailsParts.join(' • '));
  } else {
    updatedHtml = updatedHtml.replace(/{{#hasCompanyDetails}}[\s\S]*?{{\/hasCompanyDetails}}/, '');
  }

  return updatedHtml;
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

  // Load HTML template
  const templatePath = path.join(__dirname, 'templates', 'assignment-form.html');
  let html = fs.readFileSync(templatePath, 'utf8');

  // Inject Company Settings Info (Logo, Name, Address)
  html = await injectCompanySettingsInfo(html);

  // Format Date
  const dateStr = new Date(assignment.teslimTarihi).toLocaleDateString('tr-TR');

  // Replace Basic Info
  html = html.replaceAll('{{employeeName}}', assignment.employee.fullName || '-');
  html = html.replaceAll('{{employeeTcNo}}', assignment.employee.tcNo || '-');
  html = html.replaceAll('{{employeeDepartment}}', assignment.employee.unit?.name || '-');
  html = html.replaceAll('{{teslimTarihi}}', dateStr);
  html = html.replaceAll('{{teslimEden}}', assignment.teslimEden || '-');

  // Hardware Items rendering
  const hasHardwareItems = assignment.items && assignment.items.length > 0;
  if (hasHardwareItems) {
    html = html.replace('{{#hasHardwareItems}}', '');
    html = html.replace('{{/hasHardwareItems}}', '');

    let hwRowsHtml = '';
    for (const item of assignment.items) {
      const hw = item.hardware;
      const specs = hw.specs || {};

      hwRowsHtml += `
      <div class="hardware-block">
        <table class="data-table" style="margin-bottom: 0;">
          <thead>
            <tr>
              <th>Cinsi (Kategori)</th>
              <th>Markası</th>
              <th>Modeli</th>
              <th>Seri No</th>
              <th>Demirbaş No</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><b>${hw.category?.name || 'Varlık'}</b></td>
              <td>${hw.brand || '-'}</td>
              <td>${hw.model || '-'}</td>
              <td>${hw.serialNo || '-'}</td>
              <td><b>${hw.demirbasNo || '-'}</b></td>
            </tr>
          </tbody>
        </table>
        <table class="specs-table">
          <tr>
            <td class="specs-label">İşlemci (CPU)</td>
            <td style="width: 17%;">${specs.cpu || '-'}</td>
            <td class="specs-label">Sabit Disk</td>
            <td style="width: 17%;">${specs.disk || specs.storage || '-'}</td>
            <td class="specs-label">Hafıza (RAM)</td>
            <td style="width: 17%;">${specs.ram || '-'}</td>
          </tr>
          <tr>
            <td class="specs-label">CD Sürücü</td>
            <td>${specs.dvd ? 'Var' : (specs.cd || 'Yok')}</td>
            <td class="specs-label">Ekran (GPU)</td>
            <td>${specs.gpu || specs.screen || '-'}</td>
            <td class="specs-label">Diğer / Ek</td>
            <td>${specs.other || '-'}</td>
          </tr>
        </table>
      </div>`;
    }

    const hwBlockRegex = /{{#hardwareItems}}[\s\S]*{{\/hardwareItems}}/;
    html = html.replace(hwBlockRegex, hwRowsHtml);
  } else {
    html = html.replace(/{{#hasHardwareItems}}[\s\S]*{{\/hasHardwareItems}}/, '');
  }

  // Additional Items rendering (Accessories, Consumables)
  const additionalList = [];
  if (assignment.accessoryItems) {
    for (const accItem of assignment.accessoryItems) {
      additionalList.push({
        name: accItem.accessory?.name || 'Aksesuar',
        category: accItem.accessory?.category?.name || 'Aksesuar',
        typeLabel: 'Aksesuar',
        quantity: accItem.quantityGiven,
      });
    }
  }
  if (assignment.consumableItems) {
    for (const conItem of assignment.consumableItems) {
      additionalList.push({
        name: conItem.consumable?.name || 'Sarf Malzeme',
        category: conItem.consumable?.category?.name || 'Sarf Malzeme',
        typeLabel: 'Sarf Malzeme (İadesiz)',
        quantity: conItem.quantityGiven,
      });
    }
  }

  const hasAdditionalItems = additionalList.length > 0;
  if (hasAdditionalItems) {
    html = html.replace('{{#hasAdditionalItems}}', '');
    html = html.replace('{{/hasAdditionalItems}}', '');

    let addRowsHtml = '';
    for (const add of additionalList) {
      addRowsHtml += `
      <tr>
        <td><b>${add.name}</b></td>
        <td>${add.category}</td>
        <td>${add.typeLabel}</td>
        <td style="text-align: center; font-weight: bold;">${add.quantity} adet</td>
      </tr>`;
    }

    const addBlockRegex = /{{#additionalItems}}[\s\S]*{{\/additionalItems}}/;
    html = html.replace(addBlockRegex, addRowsHtml);
  } else {
    html = html.replace(/{{#hasAdditionalItems}}[\s\S]*{{\/hasAdditionalItems}}/, '');
  }

  // Storage Dir
  const storageDir = path.resolve(__dirname, '..', '..', '..', 'storage', 'assignment-pdfs');
  if (!fs.existsSync(storageDir)) {
    fs.mkdirSync(storageDir, { recursive: true });
  }

  const pdfFileName = `${assignmentId}.pdf`;
  const pdfFilePath = path.join(storageDir, pdfFileName);

  // Puppeteer Render
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    await page.pdf({
      path: pdfFilePath,
      format: 'A4',
      preferCSSPageSize: true,
      printBackground: true,
      margin: { top: '0mm', right: '0mm', bottom: '0mm', left: '0mm' },
    });
  } finally {
    await browser.close();
  }

  // Update DB
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

  // Load HTML template
  const templatePath = path.join(__dirname, 'templates', 'assignment-form.html');
  let html = fs.readFileSync(templatePath, 'utf8');

  // Inject Company Settings Info (Logo, Name, Address)
  html = await injectCompanySettingsInfo(html);

  // Replace Titles for Return Form
  html = html.replace('ZİMMETLEME FORMU', 'ZİMMET İADE FORMU');
  html = html.replace('1. ZİMMET SAHİBİ & TESLİMAT BİLGİLERİ', '1. ZİMMET SAHİBİ & İADE BİLGİLERİ');
  html = html.replace('2. VARLIK / DONANIM BİLGİLERİ', '2. İADE EDİLEN VARLIK / DONANIMLAR');
  html = html.replace('3. DİĞER EK ZİMMET KALEMLERİ', '3. İADE EDİLEN DİĞER KALEMLER');

  // Format Dates
  const assignDateStr = new Date(assignment.teslimTarihi).toLocaleDateString('tr-TR');
  const returnDateStr = new Date(returnRecord.tarih).toLocaleDateString('tr-TR');

  // Replace Basic Info
  html = html.replaceAll('{{employeeName}}', assignment.employee.fullName || '-');
  html = html.replaceAll('{{employeeTcNo}}', assignment.employee.tcNo || '-');
  html = html.replaceAll('{{employeeDepartment}}', assignment.employee.unit?.name || '-');
  html = html.replaceAll('{{teslimTarihi}}', returnDateStr); // show return date as date
  html = html.replaceAll('{{teslimEden}}', returnRecord.teslimAlanIc || '-');

  // Hardware Items rendering
  const returnedHwItems = returnRecord.items && returnRecord.items.length > 0 ? returnRecord.items : [];
  const hasHardwareItems = returnedHwItems.length > 0;

  if (hasHardwareItems) {
    html = html.replace('{{#hasHardwareItems}}', '');
    html = html.replace('{{/hasHardwareItems}}', '');

    let hwRowsHtml = '';
    for (const item of returnedHwItems) {
      const hw = item.hardware;
      const specs = hw.specs || {};

      hwRowsHtml += `
      <div class="hardware-block">
        <table class="data-table" style="margin-bottom: 0;">
          <thead>
            <tr>
              <th>Cinsi (Kategori)</th>
              <th>Markası</th>
              <th>Modeli</th>
              <th>Seri No</th>
              <th>Demirbaş No</th>
              <th>İade Sonuç Durumu</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><b>${hw.category?.name || 'Varlık'}</b></td>
              <td>${hw.brand || '-'}</td>
              <td>${hw.model || '-'}</td>
              <td>${hw.serialNo || '-'}</td>
              <td><b>${hw.demirbasNo || '-'}</b></td>
              <td><b style="color: ${item.resultStatus === 'Arızalı' ? '#B91C1C' : '#047857'}">${item.resultStatus || 'Hazır'}</b></td>
            </tr>
          </tbody>
        </table>
        <table class="specs-table">
          <tr>
            <td class="specs-label">İşlemci (CPU)</td>
            <td style="width: 17%;">${specs.cpu || '-'}</td>
            <td class="specs-label">Sabit Disk</td>
            <td style="width: 17%;">${specs.disk || specs.storage || '-'}</td>
            <td class="specs-label">Hafıza (RAM)</td>
            <td style="width: 17%;">${specs.ram || '-'}</td>
          </tr>
          <tr>
            <td class="specs-label">CD Sürücü</td>
            <td>${specs.dvd ? 'Var' : (specs.cd || 'Yok')}</td>
            <td class="specs-label">Ekran (GPU)</td>
            <td>${specs.gpu || specs.screen || '-'}</td>
            <td class="specs-label">Diğer / Ek</td>
            <td>${specs.other || '-'}</td>
          </tr>
        </table>
      </div>`;
    }

    const hwBlockRegex = /{{#hardwareItems}}[\s\S]*{{\/hardwareItems}}/;
    html = html.replace(hwBlockRegex, hwRowsHtml);
  } else {
    html = html.replace(/{{#hasHardwareItems}}[\s\S]*{{\/hasHardwareItems}}/, '');
  }

  // Additional Returned Items rendering
  const additionalList = [];
  if (returnRecord.accessoryItems) {
    for (const accItem of returnRecord.accessoryItems) {
      additionalList.push({
        name: accItem.accessory?.name || 'Aksesuar',
        category: accItem.accessory?.category?.name || 'Aksesuar',
        typeLabel: `Aksesuar İadesi (${accItem.resultStatus || 'Hazır'})`,
        quantity: accItem.quantityReturned,
      });
    }
  }
  const hasAdditionalItems = additionalList.length > 0;
  if (hasAdditionalItems) {
    html = html.replace('{{#hasAdditionalItems}}', '');
    html = html.replace('{{/hasAdditionalItems}}', '');

    let addRowsHtml = '';
    for (const add of additionalList) {
      addRowsHtml += `
      <tr>
        <td><b>${add.name}</b></td>
        <td>${add.category}</td>
        <td>${add.typeLabel}</td>
        <td style="text-align: center; font-weight: bold;">${add.quantity} adet</td>
      </tr>`;
    }

    const addBlockRegex = /{{#additionalItems}}[\s\S]*{{\/additionalItems}}/;
    html = html.replace(addBlockRegex, addRowsHtml);
  } else {
    html = html.replace(/{{#hasAdditionalItems}}[\s\S]*{{\/hasAdditionalItems}}/, '');
  }

  // Replace Signature Table for Return Form (Exactly 1 table, 2 boxes)
  const returnSignatureHtml = `
  <div class="section-title">4. İADE TESLİM - TESLİM ALMA ONAYI</div>
  <table class="signatures-table">
    <tr>
      <td>
        <div class="sig-title">İADE EDEN (KULLANICI)</div>
        <div class="sig-row"><span class="label">Adı Soyadı:</span> ${assignment.employee.fullName || '-'}</div>
        <div class="sig-row"><span class="label">Departman:</span> ${assignment.employee.unit?.name || '-'}</div>
        <div class="sig-row"><span class="label">İade Tarihi:</span> ${returnDateStr}</div>
        <div class="sig-row"><span class="label">İmza:</span></div>
        <div class="sig-line"></div>
      </td>
      <td>
        <div class="sig-title">İADE ALAN (BİLGİ TEKNOLOJİLERİ)</div>
        <div class="sig-row"><span class="label">Teslim Alan IT:</span> ${returnRecord.teslimAlanIc || '-'}</div>
        <div class="sig-row"><span class="label">İade Tarihi:</span> ${returnDateStr}</div>
        <div class="sig-row"><span class="label">İmza:</span></div>
        <div class="sig-line"></div>
      </td>
    </tr>
  </table>`;

  const sigBlockRegex = /<div class="section-title"[^>]*id="sig-section-title"[\s\S]*?<\/table>/;
  html = html.replace(sigBlockRegex, returnSignatureHtml);

  // Storage Dir
  const storageDir = path.resolve(__dirname, '..', '..', '..', 'storage', 'return-pdfs');
  if (!fs.existsSync(storageDir)) {
    fs.mkdirSync(storageDir, { recursive: true });
  }

  const pdfFileName = `${returnId}.pdf`;
  const pdfFilePath = path.join(storageDir, pdfFileName);

  // Puppeteer Render
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    await page.pdf({
      path: pdfFilePath,
      format: 'A4',
      preferCSSPageSize: true,
      printBackground: true,
      margin: { top: '0mm', right: '0mm', bottom: '0mm', left: '0mm' },
    });
  } finally {
    await browser.close();
  }

  await prisma.return.update({
    where: { id: returnId },
    data: {
      pdfPath: pdfFilePath,
    },
  });

  return pdfFilePath;
};
