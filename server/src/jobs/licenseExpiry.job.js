import cron from 'node-cron';
import prisma from '../config/db.js';
import { calculateDaysRemaining } from '../modules/licenses/license.service.js';

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

    // Update status to SURESI_DOLDU for licenses with status AKTIF or YENILENDI and endDate < now
    await prisma.license.updateMany({
      where: {
        status: {
          in: ['AKTIF', 'YENILENDI'],
        },
        endDate: {
          lt: now,
        },
      },
      data: {
        status: 'SURESI_DOLDU',
      },
    });

    // Fetch all licenses except status: IPTAL_EDILDI
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

    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    for (const lic of licenses) {
      // Exclude status: IPTAL_EDILDI strictly
      if (lic.status === 'IPTAL_EDILDI') continue;

      const daysRemaining = calculateDaysRemaining(lic.endDate);
      const licTitle = `${lic.brand} - ${lic.productInfo}${lic.unit ? ` (${lic.unit.name})` : ''}`;

      // Check if a notification for this license was already created today
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

    return createdNotifications;
  } catch (error) {
    console.error('[LicenseExpiryJob] Lisans süre takibi çalışırken hata:', error);
    throw error;
  }
};

export const initLicenseExpiryJob = () => {
  // Runs daily at 09:00 AM
  cron.schedule('0 9 * * *', async () => {
    console.log('[LicenseExpiryJob] Günlük lisans kontrolü başlatılıyor (09:00)...');
    await checkLicenseExpirations();
  });
  console.log('[LicenseExpiryJob] Günlük cron işi (09:00) kaydedildi.');
};
