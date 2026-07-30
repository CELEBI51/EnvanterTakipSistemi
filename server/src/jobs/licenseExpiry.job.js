import cron from 'node-cron';
import prisma from '../config/db.js';
import { calculateDaysRemaining } from '../modules/software/software.service.js';

export const checkLicenseExpirations = async () => {
  try {
    const allSoftware = await prisma.software.findMany();
    const createdNotifications = [];

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    for (const sw of allSoftware) {
      const daysRemaining = calculateDaysRemaining(sw.endDate);

      // AYNI gün için AYNI yazılığa tekrar bildirim oluşturma kontrolü
      const alreadyNotifiedToday = await prisma.notification.findFirst({
        where: {
          type: 'license_expiring',
          relatedId: sw.id,
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

      // Pozitif eşikler: 15, 7, 3, 0 gün kalanlar
      if ([15, 7, 3, 0].includes(daysRemaining)) {
        if (daysRemaining === 0) {
          message = `"${sw.name}" yazılımının lisansı bugün doluyor.`;
        } else {
          message = `"${sw.name}" yazılımının lisansı ${daysRemaining} gün içinde doluyor.`;
        }
      } else if (daysRemaining < 0) {
        // Negatif değerler (süresi dolmuş) için daha önce "doldu" bildirimi oluşturulmuş mu?
        const alreadyNotifiedExpired = await prisma.notification.findFirst({
          where: {
            type: 'license_expiring',
            relatedId: sw.id,
            message: {
              contains: 'doldu',
            },
          },
        });

        if (!alreadyNotifiedExpired) {
          message = `"${sw.name}" yazılımının lisansı ${Math.abs(daysRemaining)} gün önce doldu.`;
        }
      }

      if (message) {
        const notif = await prisma.notification.create({
          data: {
            type: 'license_expiring',
            relatedId: sw.id,
            message,
          },
        });
        createdNotifications.push(notif);
      }
    }

    return createdNotifications;
  } catch (error) {
    console.error('[LicenseExpiryJob] Lisans süre takibi çalışırken hata:', error);
    throw error;
  }
};

export const initLicenseExpiryJob = () => {
  // Her gün saat 09:00'da çalışır
  cron.schedule('0 9 * * *', async () => {
    console.log('[LicenseExpiryJob] Günlük lisans kontrolü başlatılıyor (09:00)...');
    await checkLicenseExpirations();
  });
  console.log('[LicenseExpiryJob] Günlük cron işi (09:00) kaydedildi.');
};
