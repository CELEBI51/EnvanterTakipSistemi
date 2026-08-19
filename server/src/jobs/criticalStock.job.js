import cron from 'node-cron';
import prisma from '../config/db.js';
import { sendMailToAdmins, getEmailTemplate } from '../services/mail.service.js';

/**
 * Checks accessories and consumables for critical stock level (<= CRITICAL_STOCK_THRESHOLD)
 * and sends a single summary email to all admin users.
 */
export const checkCriticalStock = async () => {
  try {
    let criticalStockThreshold = 5;
    try {
      const { getSettings } = await import('../modules/settings/settings.service.js');
      const settings = await getSettings();
      if (settings?.criticalStockThreshold) {
        criticalStockThreshold = settings.criticalStockThreshold;
      }
    } catch {
      criticalStockThreshold = 5;
    }

    const [criticalAccessories, criticalConsumables] = await Promise.all([
      prisma.accessory.findMany({
        where: {
          availableQuantity: {
            lte: criticalStockThreshold,
          },
        },
        select: { id: true, name: true, availableQuantity: true },
      }),
      prisma.consumable.findMany({
        where: {
          availableQuantity: {
            lte: criticalStockThreshold,
          },
        },
        select: { id: true, name: true, availableQuantity: true },
      }),
    ]);

    const totalCriticalCount = criticalAccessories.length + criticalConsumables.length;

    if (totalCriticalCount === 0) {
      console.log('[CriticalStockJob] Kritik stok seviyesinde ürün bulunamadı.');
      return { count: 0 };
    }

    const urunListesi = [
      ...criticalAccessories.map((a) => `- Aksesuar: ${a.name} (Kalan: ${a.availableQuantity} adet, Eşik: ${CRITICAL_STOCK_THRESHOLD})`),
      ...criticalConsumables.map((c) => `- Sarf Malzeme: ${c.name} (Kalan: ${c.availableQuantity} adet, Eşik: ${CRITICAL_STOCK_THRESHOLD})`),
    ].join('\n');

    const rendered = await getEmailTemplate('critical_stock', {
      urunSayisi: totalCriticalCount,
      urunListesi,
    });

    await sendMailToAdmins({
      subject: rendered.subject,
      text: rendered.bodyText,
      html: rendered.html,
    });

    return { count: totalCriticalCount };
  } catch (error) {
    console.error('[CriticalStockJob] Kritik stok kontrolü çalışırken hata:', error);
    // Silent error logging to avoid breaking caller
    return { count: 0, error: error.message };
  }
};

/**
 * Anlık Kritik Stok Kontrolü (Stok işlemi veya güncelleme sonrası tetiklenir)
 * @param {Object} param0
 * @param {string} param0.name Ürün Adı
 * @param {'Aksesuar'|'Sarf Malzeme'} param0.type Ürün Türü
 * @param {number} param0.availableQuantity Yeni Mevcut Stok
 * @param {number} [param0.oldAvailableQuantity] Önceki Stok Miktarı (Stok zaten kritik seviyedeyse tekrar tekrar mail atmamak için)
 */
export const checkAndNotifyItemInstantCriticalStock = async ({ name, type, availableQuantity, oldAvailableQuantity }) => {
  try {
    let criticalStockThreshold = 5;
    try {
      const { getSettings } = await import('../modules/settings/settings.service.js');
      const settings = await getSettings();
      if (settings?.criticalStockThreshold) {
        criticalStockThreshold = settings.criticalStockThreshold;
      }
    } catch {
      criticalStockThreshold = 5;
    }

    if (availableQuantity <= criticalStockThreshold) {
      const bodyHtml = `
        <p>Aşağıdaki ürün yapılan stok işlemi / güncelleme sonrasında kritik stok eşik değerinin (<strong>${criticalStockThreshold}</strong>) altına düşmüştür:</p>
        <table class="table">
          <thead>
            <tr>
              <th>Tür</th>
              <th>Ürün Adı</th>
              <th>Yeni Mevcut Stok</th>
              <th>Kritik Eşik</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><span class="badge" style="background-color: ${type === 'Aksesuar' ? '#4F8FE0' : '#f0ad4e'};">${type}</span></td>
              <td><strong>${name}</strong></td>
              <td style="color: #d9534f; font-weight: bold;">${availableQuantity} adet</td>
              <td>${criticalStockThreshold} adet</td>
            </tr>
          </tbody>
        </table>
        <p>Lütfen stok tedarik işlemlerini gözden geçiriniz.</p>
      `;

      const subject = `⚠️ Anlık Kritik Stok Uyarısı — ${name} (${availableQuantity} adet kaldı)`;
      const html = buildEmailTemplate({
        title: `⚠️ Anlık Kritik Stok Uyarısı`,
        bodyHtml,
      });

      const text = `⚠️ Anlık Kritik Stok Uyarısı — ${name} (${availableQuantity} adet kaldı)\n\n` +
        `Tür: ${type}\n` +
        `Ürün: ${name}\n` +
        `Mevcut Stok: ${availableQuantity}\n` +
        `Kritik Eşik: ${criticalStockThreshold}`;

      await sendMailToAdmins({ subject, text, html });
    }
  } catch (error) {
    console.error('[CriticalStockJob] Anlık kritik stok maili gönderilirken hata:', error);
  }
};

export const initCriticalStockJob = () => {
  // Runs daily at 09:05 AM
  cron.schedule('5 9 * * *', async () => {
    console.log('[CriticalStockJob] Günlük kritik stok kontrolü başlatılıyor (09:05)...');
    await checkCriticalStock();
  });
  console.log('[CriticalStockJob] Günlük cron işi (09:05) kaydedildi.');
};

