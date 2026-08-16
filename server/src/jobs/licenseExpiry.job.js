import cron from 'node-cron';
import prisma from '../config/db.js';
import { calculateDaysRemaining } from '../modules/licenses/license.service.js';
import { sendMailToAdmins, buildEmailTemplate } from '../services/mail.service.js';

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
        let expiredRows = '';
        licensesToMarkExpired.forEach((lic) => {
          const endDateFormatted = new Date(lic.endDate).toLocaleDateString('tr-TR');
          const unitName = lic.unit ? lic.unit.name : 'Belirtilmedi';
          expiredRows += `
            <tr>
              <td><strong>${lic.brand}</strong></td>
              <td>${lic.productInfo}</td>
              <td>${unitName}</td>
              <td>${endDateFormatted}</td>
            </tr>
          `;
        });

        const bodyHtml = `
          <p>Aşağıdaki lisans(lar)ın geçerlilik süresi dolmuş ve durumları <strong>SÜRESİ DOLDU</strong> olarak güncellenmiştir:</p>
          <table class="table">
            <thead>
              <tr>
                <th>Marka</th>
                <th>Ürün Bilgisi</th>
                <th>Birim</th>
                <th>Bitiş Tarihi</th>
              </tr>
            </thead>
            <tbody>
              ${expiredRows}
            </tbody>
          </table>
        `;

        const count = licensesToMarkExpired.length;
        const subject = `🔴 Lisans Süresi Doldu — ${count} lisans süresi doldu`;
        const html = buildEmailTemplate({
          title: `🔴 Lisans Süresi Doldu (${count} Lisans)`,
          bodyHtml,
        });

        const text = `🔴 Lisans Süresi Doldu — ${count} lisans süresi doldu\n\n` +
          licensesToMarkExpired.map(l => `- ${l.brand} - ${l.productInfo} (Bitiş: ${new Date(l.endDate).toLocaleDateString('tr-TR')})`).join('\n');

        await sendMailToAdmins({ subject, text, html });
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

      // BİLDİRİM 1 için: 15 gün veya daha az kalmış (gün >= 0) lisansları topla
      if (daysRemaining <= 15 && daysRemaining >= 0) {
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

      // Positive thresholds: 15, 7, 3, 0 days remaining
      if ([15, 7, 3, 0].includes(daysRemaining)) {
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
        let approachingRows = '';
        approachingLicensesForEmail.forEach(({ lic, daysRemaining }) => {
          const endDateFormatted = new Date(lic.endDate).toLocaleDateString('tr-TR');
          const unitName = lic.unit ? lic.unit.name : 'Belirtilmedi';
          const badgeClass = daysRemaining <= 3 ? 'badge-danger' : 'badge-warning';
          const dayText = daysRemaining === 0 ? 'Bugün doluyor' : `${daysRemaining} gün kaldı`;

          approachingRows += `
            <tr>
              <td><strong>${lic.brand}</strong></td>
              <td>${lic.productInfo}</td>
              <td>${unitName}</td>
              <td>${endDateFormatted}</td>
              <td><span class="badge ${badgeClass}">${dayText}</span></td>
            </tr>
          `;
        });

        const count = approachingLicensesForEmail.length;
        const bodyHtml = `
          <p>Aşağıdaki ${count} lisansın kullanım süresi 15 gün veya daha az bir zaman içinde dolacaktır:</p>
          <table class="table">
            <thead>
              <tr>
                <th>Marka</th>
                <th>Ürün Bilgisi</th>
                <th>Birim</th>
                <th>Bitiş Tarihi</th>
                <th>Kalan Süre</th>
              </tr>
            </thead>
            <tbody>
              ${approachingRows}
            </tbody>
          </table>
          <p>Lütfen lisans yenileme işlemlerini gözden geçiriniz.</p>
        `;

        const subject = `⚠️ Lisans Yenileme Hatırlatması — ${count} lisans süresi yaklaşıyor`;
        const html = buildEmailTemplate({
          title: `⚠️ Lisans Yenileme Hatırlatması (${count} Lisans)`,
          bodyHtml,
        });

        const text = `⚠️ Lisans Yenileme Hatırlatması — ${count} lisans süresi yaklaşıyor\n\n` +
          approachingLicensesForEmail.map(({ lic, daysRemaining }) => `- ${lic.brand} - ${lic.productInfo} (Kalan: ${daysRemaining} gün, Bitiş: ${new Date(lic.endDate).toLocaleDateString('tr-TR')})`).join('\n');

        await sendMailToAdmins({ subject, text, html });
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



