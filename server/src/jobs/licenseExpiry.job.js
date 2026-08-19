import cron from 'node-cron';
import prisma from '../config/db.js';
import { calculateDaysRemaining } from '../modules/licenses/license.service.js';
import { sendMailToAdmins, getEmailTemplate } from '../services/mail.service.js';

/**
 * Checks all active licenses for upcoming expiration dates (15, 7, 3, 0 days or expired)
 * and creates notification entries in the database.
 * 
 * CRITICAL RULE:
 * Notifications are EXCLUDED ONLY IF status === 'IPTAL_EDILDI'.
 * All other statuses ('YENILENMEDI', 'YENILENMEYECEK', 'YENILENDI') produce notifications on 15, 7, 3, 0 thresholds.
 */
export const checkLicenseExpirations = async () => {
  try {
    const now = new Date();

    let licenseWarningDays = 15;
    try {
      const { getSettings } = await import('../modules/settings/settings.service.js');
      const settings = await getSettings();
      if (settings?.licenseWarningDays) {
        licenseWarningDays = settings.licenseWarningDays;
      }
    } catch (sErr) {
      console.error('[LicenseExpiryJob] Ayarlar okunamadı, varsayılan 15 gün kullanılıyor:', sErr);
    }

    // 1. SURESI_DOLDU Durum Güncellemesi & Süresi Dolan Lisansların Tespiti
    const licensesToMarkExpired = await prisma.license.findMany({
      where: {
        status: {
          in: ['AKTIF', 'YENILENDI'],
        },
        endDate: {
          lt: now,
        },
      },
      include: {
        unit: { select: { name: true } },
      },
    });

    if (licensesToMarkExpired.length > 0) {
      const expiredIds = licensesToMarkExpired.map((l) => l.id);
      await prisma.license.updateMany({
        where: {
          id: { in: expiredIds },
        },
        data: {
          status: 'SURESI_DOLDU',
        },
      });

      // BİLDİRİM 3: Süresi Dolan Lisanslar İçin Adminlere Anlık Mail Bildirimi
      try {
        const count = licensesToMarkExpired.length;
        const lisansListesi = licensesToMarkExpired
          .map((l) => `- ${l.brand} - ${l.productInfo} (${l.unit?.name || 'Belirtilmedi'}, Bitiş: ${new Date(l.endDate).toLocaleDateString('tr-TR')})`)
          .join('\n');

        const rendered = await getEmailTemplate('license_expired', {
          lisansSayisi: count,
          lisansListesi,
        });

        await sendMailToAdmins({
          subject: rendered.subject,
          text: rendered.bodyText,
          html: rendered.html,
        });
      } catch (mailErr) {
        console.error('[LicenseExpiryJob] Süresi dolan lisans maili gönderilirken hata:', mailErr);
      }
    }

    // 2. IPTAL_EDILDI Olmayan Tüm Lisansların Alınması
    const licenses = await prisma.license.findMany({
      where: {
        status: {
          not: 'IPTAL_EDILDI',
        },
      },
      include: {
        unit: { select: { id: true, name: true } },
      },
    });

    const createdNotifications = [];
    const approachingLicensesForEmail = [];

    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    for (const lic of licenses) {
      // Exclude status: IPTAL_EDILDI strictly
      if (lic.status === 'IPTAL_EDILDI') continue;

      const daysRemaining = calculateDaysRemaining(lic.endDate);
      const licTitle = `${lic.brand} - ${lic.productInfo}${lic.unit ? ` (${lic.unit.name})` : ''}`;

      // BİLDİRİM 1 için: licenseWarningDays gün veya daha az kalmış (gün >= 0) lisansları topla
      if (daysRemaining <= licenseWarningDays && daysRemaining >= 0) {
        approachingLicensesForEmail.push({
          lic,
          daysRemaining,
        });
      }

      // Check if a notification for this license was already created today (DB Notification tablosu için)
      const alreadyNotifiedToday = await prisma.notification.findFirst({
        where: {
          type: 'license_expiring',
          relatedId: lic.id,
          createdAt: {
            gte: startOfToday,
            lte: endOfToday,
          },
        },
      });

      if (alreadyNotifiedToday) {
        continue;
      }

      let message = null;

      // Positive thresholds: licenseWarningDays ve belirli basamaklardaki lisanslar
      if (daysRemaining <= licenseWarningDays && daysRemaining >= 0) {
        if (daysRemaining === 0) {
          message = `"${licTitle}" lisansı bugün doluyor.`;
        } else {
          message = `"${licTitle}" lisansı ${daysRemaining} gün içinde doluyor.`;
        }
      } else if (daysRemaining < 0) {
        // Negative values (already expired) - check if "doldu" notification already exists
        const alreadyNotifiedExpired = await prisma.notification.findFirst({
          where: {
            type: 'license_expiring',
            relatedId: lic.id,
            message: {
              contains: 'doldu',
            },
          },
        });

        if (!alreadyNotifiedExpired) {
          message = `"${licTitle}" lisansı ${Math.abs(daysRemaining)} gün önce doldu.`;
        }
      }

      if (message) {
        const notif = await prisma.notification.create({
          data: {
            type: 'license_expiring',
            relatedId: lic.id,
            message,
          },
        });
        createdNotifications.push(notif);
      }
    }

    // BİLDİRİM 1: Tarihi Yaklaşan Lisanslar İçin Adminlere Tek Bir Özet Mail
    if (approachingLicensesForEmail.length > 0) {
      try {
        const count = approachingLicensesForEmail.length;
        const lisansListesi = approachingLicensesForEmail
          .map(({ lic, daysRemaining }) => `- ${lic.brand} - ${lic.productInfo} (${lic.unit ? lic.unit.name : 'Belirtilmedi'}, Kalan: ${daysRemaining === 0 ? 'Bugün' : `${daysRemaining} gün`}, Bitiş: ${new Date(lic.endDate).toLocaleDateString('tr-TR')})`)
          .join('\n');

        const rendered = await getEmailTemplate('license_expiry', {
          lisansSayisi: count,
          lisansListesi,
        });

        await sendMailToAdmins({
          subject: rendered.subject,
          text: rendered.bodyText,
          html: rendered.html,
        });
      } catch (mailErr) {
        console.error('[LicenseExpiryJob] Tarihi yaklaşan lisans maili gönderilirken hata:', mailErr);
      }
    }

    return createdNotifications;
  } catch (error) {
    console.error('[LicenseExpiryJob] Lisans süre takibi çalışırken hata:', error);
    throw error;
  }
};

export const initLicenseExpiryJob = () => {
  // Runs daily at 08:00 AM, 09:30 AM and 12:00 PM
  cron.schedule('0 8,13 * * *', async () => {
    console.log('[LicenseExpiryJob] Lisans kontrolü başlatılıyor (08:00 / 13:00)...');
    await checkLicenseExpirations();
  });


  console.log('[LicenseExpiryJob] Cron işleri (08:00 ve 13:00) kaydedildi.');
};



