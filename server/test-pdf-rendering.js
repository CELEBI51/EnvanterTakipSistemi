import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function testPdfRendering() {
  console.log('--- STARTING FAST PDF PREVIEW RENDER ---');

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  
  const templatePath = path.join(__dirname, 'src', 'modules', 'documents', 'templates', 'assignment-form.html');
  let html = fs.readFileSync(templatePath, 'utf8');

  // Fill sample data (1 HW + 2 Acc + 1 Lic)
  html = html.replaceAll('{{employeeName}}', 'Ahmet Yılmaz');
  html = html.replaceAll('{{employeeTcNo}}', '12345678901');
  html = html.replaceAll('{{employeeDepartment}}', 'Bilgi Teknolojileri');
  html = html.replaceAll('{{teslimTarihi}}', '04.08.2026');
  html = html.replaceAll('{{teslimEden}}', 'Mehmet Demir (IT)');

  html = html.replace('{{#hasHardwareItems}}', '');
  html = html.replace('{{/hasHardwareItems}}', '');
  const hwHtml = `
  <div class="hardware-block">
    <table class="data-table" style="margin-bottom: 0;">
      <thead>
        <tr><th>Cinsi (Kategori)</th><th>Markası</th><th>Modeli</th><th>Seri No</th><th>Demirbaş No</th></tr>
      </thead>
      <tbody>
        <tr><td><b>Dizüstü Bilgisayar</b></td><td>Dell</td><td>Latitude 5420</td><td>SN-987654321</td><td><b>DEM-2026-001</b></td></tr>
      </tbody>
    </table>
    <table class="specs-table">
      <tr><td class="specs-label">İşlemci (CPU)</td><td style="width: 17%;">Intel i7-1185G7</td><td class="specs-label">Sabit Disk</td><td style="width: 17%;">512GB NVMe SSD</td><td class="specs-label">Hafıza (RAM)</td><td style="width: 17%;">16GB DDR4</td></tr>
      <tr><td class="specs-label">CD Sürücü</td><td>Yok</td><td class="specs-label">Ekran (GPU)</td><td>Intel Iris Xe Graphics</td><td class="specs-label">Diğer / Ek</td><td>14 inç FHD Screen</td></tr>
    </table>
  </div>`;
  html = html.replace(/{{#hardwareItems}}[\s\S]*{{\/hardwareItems}}/, hwHtml);

  html = html.replace('{{#hasAdditionalItems}}', '');
  html = html.replace('{{/hasAdditionalItems}}', '');
  const addHtml = `
  <tr><td><b>Dell Pro Stereo Headset</b></td><td>Aksesuar</td><td>Aksesuar</td><td style="text-align: center; font-weight: bold;">1 adet</td></tr>
  <tr><td><b>Dell Premier Wireless Mouse</b></td><td>Aksesuar</td><td>Aksesuar</td><td style="text-align: center; font-weight: bold;">1 adet</td></tr>
  <tr><td><b>Microsoft Office 2024 Pro</b></td><td>Lisans</td><td>Lisans</td><td style="text-align: center; font-weight: bold;">1 adet</td></tr>`;
  html = html.replace(/{{#additionalItems}}[\s\S]*{{\/additionalItems}}/, addHtml);

  await page.setContent(html, { waitUntil: 'domcontentloaded' });

  // Generate A4 PDF to storage
  const pdfDir = path.join(__dirname, 'storage', 'assignment-pdfs');
  if (!fs.existsSync(pdfDir)) fs.mkdirSync(pdfDir, { recursive: true });

  const pdfPath = path.join(pdfDir, 'test_preview.pdf');
  await page.pdf({
    path: pdfPath,
    format: 'A4',
    preferCSSPageSize: true,
    printBackground: true,
    margin: { top: '0mm', right: '0mm', bottom: '0mm', left: '0mm' },
  });

  // Read generated PDF page count
  const pdfBuffer = fs.readFileSync(pdfPath);
  const pageMatches = pdfBuffer.toString('latin1').match(/\/Type\s*\/Page\b/g);
  const pageCount = pageMatches ? pageMatches.length : 1;

  console.log(`Generated PDF Path: ${pdfPath}`);
  console.log(`PDF Page Count: ${pageCount}`);

  await browser.close();
}

testPdfRendering().catch(console.error);
