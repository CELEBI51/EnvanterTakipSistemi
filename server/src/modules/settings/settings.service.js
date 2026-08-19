import prisma from '../../config/db.js';
import fs from 'fs';
import path from 'path';

const LOGO_DIR = path.join(process.cwd(), 'storage', 'logo');

// Ensure logo directory exists
if (!fs.existsSync(LOGO_DIR)) {
  fs.mkdirSync(LOGO_DIR, { recursive: true });
}

export const getSettings = async () => {
  let settings = await prisma.systemSettings.findUnique({
    where: { id: 1 },
  });

  if (!settings) {
    settings = await prisma.systemSettings.create({
      data: {
        id: 1,
        companyName: 'DİTAŞ Otomotiv',
      },
    });
  }

  return settings;
};

export const updateSettings = async (data) => {
  const {
    companyName,
    companyAddress,
    companyPhone,
    companyEmail,
    companyTaxNo,
    logoPath,
    criticalStockThreshold,
    licenseWarningDays,
  } = data;

  const settings = await prisma.systemSettings.upsert({
    where: { id: 1 },
    update: {
      ...(companyName !== undefined && { companyName: companyName.trim() }),
      ...(companyAddress !== undefined && { companyAddress: companyAddress ? companyAddress.trim() : null }),
      ...(companyPhone !== undefined && { companyPhone: companyPhone ? companyPhone.trim() : null }),
      ...(companyEmail !== undefined && { companyEmail: companyEmail ? companyEmail.trim() : null }),
      ...(companyTaxNo !== undefined && { companyTaxNo: companyTaxNo ? companyTaxNo.trim() : null }),
      ...(logoPath !== undefined && { logoPath }),
      ...(criticalStockThreshold !== undefined && { criticalStockThreshold: Number(criticalStockThreshold) }),
      ...(licenseWarningDays !== undefined && { licenseWarningDays: Number(licenseWarningDays) }),
    },
    create: {
      id: 1,
      companyName: companyName ? companyName.trim() : 'DİTAŞ Otomotiv',
      companyAddress: companyAddress ? companyAddress.trim() : null,
      companyPhone: companyPhone ? companyPhone.trim() : null,
      companyEmail: companyEmail ? companyEmail.trim() : null,
      companyTaxNo: companyTaxNo ? companyTaxNo.trim() : null,
      logoPath: logoPath || null,
      criticalStockThreshold: criticalStockThreshold !== undefined ? Number(criticalStockThreshold) : 5,
      licenseWarningDays: licenseWarningDays !== undefined ? Number(licenseWarningDays) : 15,
    },
  });

  try {
    const { createLog } = await import('../../services/log.service.js');
    const updatedKeys = Object.keys(data).filter((k) => data[k] !== undefined).join(', ');
    await createLog({
      action: 'UPDATE',
      module: 'settings',
      description: `Sistem ayarları güncellendi: ${updatedKeys || 'Şirket/Sistem Bilgileri'}`,
      entityId: '1',
      statusCode: 200,
    });
  } catch (lErr) {}

  return settings;
};

export const getLogoInfo = async () => {
  const settings = await getSettings();
  if (!settings.logoPath) {
    return null;
  }

  const absolutePath = path.isAbsolute(settings.logoPath)
    ? settings.logoPath
    : path.join(process.cwd(), settings.logoPath);

  if (!fs.existsSync(absolutePath)) {
    return null;
  }

  const ext = path.extname(absolutePath).toLowerCase().replace('.', '');
  let mimeType = 'image/png';
  if (ext === 'jpg' || ext === 'jpeg') mimeType = 'image/jpeg';
  else if (ext === 'svg') mimeType = 'image/svg+xml';
  else if (ext === 'webp') mimeType = 'image/webp';

  const buffer = fs.readFileSync(absolutePath);
  const base64 = `data:${mimeType};base64,${buffer.toString('base64')}`;

  return {
    absolutePath,
    mimeType,
    buffer,
    base64,
  };
};

export const listEmailTemplates = async () => {
  const templates = await prisma.emailTemplate.findMany({
    orderBy: { id: 'asc' },
  });
  return templates;
};

export const getEmailTemplateByType = async (type) => {
  const template = await prisma.emailTemplate.findUnique({
    where: { type },
  });

  if (!template) {
    const error = new Error(`'${type}' türünde e-posta şablonu bulunamadı.`);
    error.statusCode = 404;
    throw error;
  }

  return template;
};

export const updateEmailTemplate = async (type, { subject, bodyText }) => {
  if (!subject || !subject.trim()) {
    const error = new Error('E-posta konusu boş olamaz.');
    error.statusCode = 400;
    throw error;
  }

  if (!bodyText || !bodyText.trim()) {
    const error = new Error('E-posta içeriği boş olamaz.');
    error.statusCode = 400;
    throw error;
  }

  const updated = await prisma.emailTemplate.upsert({
    where: { type },
    update: {
      subject: subject.trim(),
      bodyText: bodyText.trim(),
    },
    create: {
      type,
      subject: subject.trim(),
      bodyText: bodyText.trim(),
    },
  });

  return updated;
};

export const sendTestEmail = async (type, recipientEmail) => {
  const mailService = await import('../../services/mail.service.js');

  const dummyVariables = {
    license_expiry: {
      lisansSayisi: '3',
      lisansListesi: '1. Microsoft Office 365 Pro (Bitiş: 25.08.2026)\n2. Kaspersky Endpoint Security (Bitiş: 28.08.2026)\n3. AutoCAD 2026 (Bitiş: 30.08.2026)',
    },
    critical_stock: {
      urunSayisi: '2',
      urunListesi: '1. HP Toner 85A (Kalan: 1 Adet - Kritik Limit: 5 Adet)\n2. Kingston 16GB DDR4 RAM (Kalan: 0 Adet - Kritik Limit: 3 Adet)',
    },
    license_expired: {
      lisansSayisi: '1',
      lisansListesi: '1. Adobe Creative Cloud 2025 (Dolum Tarihi: 10.08.2026)',
    },
    new_assignment: {
      personelAdi: 'Ahmet Yılmaz',
      birimAdi: 'Bilgi İşlem',
      tarih: new Date().toLocaleDateString('tr-TR'),
      teslimEden: 'Sistem Yöneticisi (IT Admin)',
      kalemListesi: '• 1 Adet Lenovo ThinkPad L15 Laptop (Demirbaş No: D-2026-042)\n• 1 Adet Dell 24" FHD Monitör\n• 1 Adet Logi Kablosuz Set',
    },
  };

  const variables = dummyVariables[type] || {};
  const rendered = await mailService.getEmailTemplate(type, variables);

  const info = await mailService.sendEmail({
    to: recipientEmail,
    subject: `[TEST] ${rendered.subject}`,
    text: rendered.bodyText,
    html: rendered.html,
  });

  return {
    sentTo: recipientEmail,
    subject: rendered.subject,
    info,
  };
};

export const getSystemLogs = async ({ module: mod, action, userId, userEmail, dateFrom, dateTo, page = 1, limit = 50 }) => {
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.max(1, parseInt(limit, 10) || 50);
  const skip = (pageNum - 1) * limitNum;

  const where = {};
  if (mod) where.module = mod;
  if (action) where.action = action;
  if (userId) where.userId = userId;
  if (userEmail) where.userEmail = { contains: userEmail, mode: 'insensitive' };

  if (dateFrom || dateTo) {
    where.createdAt = {};
    if (dateFrom) where.createdAt.gte = new Date(dateFrom);
    if (dateTo) {
      const end = new Date(dateTo);
      end.setHours(23, 59, 59, 999);
      where.createdAt.lte = end;
    }
  }

  const [logs, totalCount] = await Promise.all([
    prisma.systemLog.findMany({
      where,
      skip,
      take: limitNum,
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: { id: true, fullName: true, email: true },
        },
      },
    }),
    prisma.systemLog.count({ where }),
  ]);

  return {
    data: logs,
    pagination: {
      totalCount,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(totalCount / limitNum) || 1,
    },
  };
};

export const exportSystemLogs = async ({ module: mod, action, userId, userEmail, dateFrom, dateTo }) => {
  const ExcelJS = (await import('exceljs')).default;
  const { data: logs } = await getSystemLogs({ module: mod, action, userId, userEmail, dateFrom, dateTo, page: 1, limit: 10000 });

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Sistem Logları');

  sheet.columns = [
    { header: 'Tarih / Saat', key: 'createdAt', width: 20 },
    { header: 'Kullanıcı E-Posta', key: 'userEmail', width: 25 },
    { header: 'İşlem', key: 'action', width: 15 },
    { header: 'Modül', key: 'module', width: 15 },
    { header: 'Açıklama', key: 'description', width: 45 },
    { header: 'Etkilenen Kayıt ID', key: 'entityId', width: 36 },
    { header: 'IP Adresi', key: 'ipAddress', width: 18 },
    { header: 'Status', key: 'statusCode', width: 10 },
  ];

  logs.forEach((log) => {
    sheet.addRow({
      createdAt: new Date(log.createdAt).toLocaleString('tr-TR'),
      userEmail: log.userEmail || 'Sistem / Anonim',
      action: log.action,
      module: log.module,
      description: log.description,
      entityId: log.entityId || '-',
      ipAddress: log.ipAddress || '-',
      statusCode: log.statusCode || 200,
    });
  });

  return workbook;
};

