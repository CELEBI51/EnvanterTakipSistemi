import nodemailer from 'nodemailer';
import prisma from '../config/db.js';

// SMTP Transporter Konfigürasyonu
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || '127.0.0.1',
  port: parseInt(process.env.SMTP_PORT || '25', 10),
  secure: false, // Yerel test (hMailServer) için SSL/TLS yok
  auth: {
    user: process.env.SMTP_USER || 'EnvanterTakipSistemi@testmail.local',
    pass: process.env.SMTP_PASS || 'admin123',
  },
  tls: {
    rejectUnauthorized: false,
  },
});

/**
 * Admin kullanıcılarının e-posta adreslerini getirir
 * @returns {Promise<string[]>} Email listesi
 */
export const getAdminEmails = async () => {
  try {
    const adminUsers = await prisma.user.findMany({
      where: { role: 'admin' },
      select: { email: true },
    });
    
    return adminUsers
      .map((u) => u.email ? u.email.trim() : '')
      .filter((email) => email.length > 0);
  } catch (error) {
    console.error('[MailService] Admin kullanıcı e-postaları alınırken hata:', error);
    return [];
  }
};

/**
 * E-posta Gönderme Servisi
 * @param {Object} options E-posta seçenekleri
 * @param {string|string[]} options.to Alıcı e-posta adresi veya adresleri
 * @param {string} options.subject E-posta konusu
 * @param {string} [options.text] Düz metin içerik
 * @param {string} [options.html] HTML içerik
 */
export const sendEmail = async ({ to, subject, text, html }) => {
  const sender = process.env.SMTP_FROM || process.env.SMTP_USER || 'EnvanterTakipSistemi@testmail.local';
  
  const recipientList = Array.isArray(to) ? to : [to];
  const validRecipients = recipientList.filter((addr) => addr && typeof addr === 'string' && addr.trim().length > 0);

  if (validRecipients.length === 0) {
    console.log('[MailService] Gönderilecek geçerli e-posta adresi bulunamadı.');
    return null;
  }

  const mailOptions = {
    from: sender,
    to: validRecipients.join(', '),
    subject,
    text,
    html,
  };

  const info = await transporter.sendMail(mailOptions);
  return info;
};

/**
 * Tüm Admin kullanıcılarına güvenli bir şekilde (hata durumunda sessizce loglayarak) mail gönderir
 */
export const sendMailToAdmins = async ({ subject, text, html }) => {
  try {
    const adminEmails = await getAdminEmails();
    if (!adminEmails || adminEmails.length === 0) {
      console.log('[MailService] Mail gönderilecek e-posta adresine sahip Admin bulunamadı.');
      return null;
    }

    return await sendEmail({
      to: adminEmails,
      subject,
      text,
      html,
    });
  } catch (error) {
    console.error('[MailService] Admin maili gönderimi başarısız (İşlem devam ediyor):', error.message);
    return null;
  }
};

/**
 * E-postalar için Kurumsal HTML Şablonu Oluşturucu
 */
export const buildEmailTemplate = ({ title, bodyHtml }) => {
  return `
<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; background-color: #F5F4EF; margin: 0; padding: 20px; color: #1E2534; }
    .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 6px; overflow: hidden; border: 1px solid #e0e0e0; }
    .header { background-color: #1E2534; padding: 20px; text-align: center; color: #ffffff; }
    .header h2 { margin: 0; font-size: 20px; color: #ffffff; }
    .content { padding: 24px; color: #1E2534; line-height: 1.6; }
    .table { width: 100%; border-collapse: collapse; margin-top: 15px; margin-bottom: 15px; }
    .table th { background-color: #1E2534; color: #ffffff; text-align: left; padding: 10px; font-size: 13px; }
    .table td { border-bottom: 1px solid #eeeeee; padding: 10px; font-size: 13px; }
    .badge { display: inline-block; padding: 3px 8px; border-radius: 4px; font-size: 12px; font-weight: bold; background-color: #4F8FE0; color: #ffffff; }
    .badge-danger { background-color: #d9534f; color: #ffffff; }
    .badge-warning { background-color: #f0ad4e; color: #ffffff; }
    .footer { background-color: #F5F4EF; padding: 15px; text-align: center; font-size: 12px; color: #777777; border-top: 1px solid #eeeeee; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2>Demirbaş Takip Sistemi</h2>
    </div>
    <div class="content">
      <h3 style="color: #1E2534; margin-top: 0;">${title}</h3>
      ${bodyHtml}
    </div>
    <div class="footer">
      Bu e-posta Demirbaş Takip Sistemi tarafından otomatik olarak oluşturulmuştur.
    </div>
  </div>
</body>
</html>
  `.trim();
};

/**
 * Varsayılan E-posta Şablonları (Fallback)
 */
const DEFAULT_TEMPLATES = {
  license_expiry: {
    subject: '⚠️ Lisans Yenileme Hatırlatması — {{lisansSayisi}} lisans süresi yaklaşıyor',
    bodyText: 'Sayın Yönetici,\n\nAşağıdaki lisansların süresi yaklaşmaktadır:\n\n{{lisansListesi}}\n\nLütfen gerekli yenileme işlemlerini yapınız.\n\nSaygılarımızla,\n{{sirketAdi}}',
  },
  critical_stock: {
    subject: '⚠️ Kritik Stok Uyarısı — {{urunSayisi}} ürün kritik seviyede',
    bodyText: 'Sayın Yönetici,\n\nAşağıdaki ürünler kritik stok seviyesinin altına düşmüştür:\n\n{{urunListesi}}\n\nLütfen stok yenileme işlemlerini yapınız.\n\nSaygılarımızla,\n{{sirketAdi}}',
  },
  license_expired: {
    subject: '🔴 Lisans Süresi Doldu — {{lisansSayisi}} lisans süresi doldu',
    bodyText: 'Sayın Yönetici,\n\nAşağıdaki lisansların süresi dolmuştur:\n\n{{lisansListesi}}\n\nLütfen en kısa sürede gerekli işlemleri yapınız.\n\nSaygılarımızla,\n{{sirketAdi}}',
  },
  new_assignment: {
    subject: '📦 Yeni Zimmet — {{personelAdi}}',
    bodyText: 'Sayın Yönetici,\n\n{{personelAdi}} ({{birimAdi}}) adlı personele yeni zimmet oluşturulmuştur.\n\nZimmet Tarihi: {{tarih}}\nTeslim Eden: {{teslimEden}}\nZimmetlenen Kalemler:\n{{kalemListesi}}\n\nSaygılarımızla,\n{{sirketAdi}}',
  },
};

const ALLOWED_VARIABLES = [
  'lisansSayisi',
  'lisansListesi',
  'urunSayisi',
  'urunListesi',
  'personelAdi',
  'birimAdi',
  'tarih',
  'teslimEden',
  'kalemListesi',
  'sirketAdi',
];

/**
 * DB'den e-posta şablonunu çeker, değişkenleri yerleştirir ve konu/metin döner
 * @param {string} type Şablon türü ('license_expiry', 'critical_stock', 'license_expired', 'new_assignment')
 * @param {Object} variables Değişken anahtar-değer çiftleri
 * @returns {Promise<{ subject: string, bodyText: string, html: string }>}
 */
export const getEmailTemplate = async (type, variables = {}) => {
  let template = null;

  try {
    template = await prisma.emailTemplate.findUnique({
      where: { type },
    });
  } catch (error) {
    console.error(`[MailService] DB'den '${type}' şablonu çekilirken hata (fallback kullanılacak):`, error.message);
  }

  if (!template) {
    template = DEFAULT_TEMPLATES[type] || {
      subject: 'Bildirim',
      bodyText: 'Sayın Yönetici,\n\nSistem bildirimi.\n\nSaygılarımızla,\n{{sirketAdi}}',
    };
  }

  let { subject, bodyText } = template;

  // sirketAdi varsayılanını DB settings'ten al (variables'ta verilmediyse)
  const mergedVariables = { ...variables };
  if (!mergedVariables.sirketAdi) {
    try {
      const settings = await prisma.systemSettings.findUnique({ where: { id: 1 } });
      mergedVariables.sirketAdi = settings?.companyName || 'DİTAŞ Otomotiv';
    } catch {
      mergedVariables.sirketAdi = 'DİTAŞ Otomotiv';
    }
  }

  // Değişkenleri allowlist süzgecinden geçirerek placeholder'ları değiştir
  for (const key of ALLOWED_VARIABLES) {
    if (Object.prototype.hasOwnProperty.call(mergedVariables, key)) {
      const val = mergedVariables[key] !== undefined && mergedVariables[key] !== null ? String(mergedVariables[key]) : '';
      const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
      subject = subject.replace(regex, val);
      bodyText = bodyText.replace(regex, val);
    }
  }

  // HTML formatına dönüştürme (satır başlarını <br/> yaparak)
  const bodyHtml = bodyText.replace(/\n/g, '<br/>');
  const html = buildEmailTemplate({
    title: subject,
    bodyHtml: `<div style="white-space: pre-line;">${bodyText}</div>`,
  });

  return {
    subject,
    bodyText,
    body: bodyText,
    html,
  };
};

export default {
  sendEmail,
  sendMailToAdmins,
  getAdminEmails,
  buildEmailTemplate,
  getEmailTemplate,
  transporter,
};


