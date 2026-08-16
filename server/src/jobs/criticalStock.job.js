import cron from 'node-cron';
import prisma from '../config/db.js';
import { CRITICAL_STOCK_THRESHOLD } from '../config/constants.js';
import { sendMailToAdmins, buildEmailTemplate } from '../services/mail.service.js';

/**
 * Checks accessories and consumables for critical stock level (<= CRITICAL_STOCK_THRESHOLD)
 * and sends a single summary email to all admin users.
 */
export const checkCriticalStock = async () => {
  try {
    const [criticalAccessories, criticalConsumables] = await Promise.all([
      prisma.accessory.findMany({
        where: {
          availableQuantity: {
            lte: CRITICAL_STOCK_THRESHOLD,
          },
        },
        select: { id: true, name: true, availableQuantity: true },
      }),
      prisma.consumable.findMany({
        where: {
          availableQuantity: {
            lte: CRITICAL_STOCK_THRESHOLD,
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

    // Build email content
    let itemsTableRows = '';

    criticalAccessories.forEach((acc) => {
      itemsTableRows += `
        <tr>
          <td><span class="badge" style="background-color: #4F8FE0;">Aksesuar</span></td>
          <td><strong>${acc.name}</strong></td>
          <td style="color: #d9534f; font-weight: bold;">${acc.availableQuantity} adet</td>
          <td>${CRITICAL_STOCK_THRESHOLD} adet</td>
        </tr>
      `;
    });

    criticalConsumables.forEach((con) => {
      itemsTableRows += `
        <tr>
          <td><span class="badge" style="background-color: #f0ad4e;">Sarf Malzeme</span></td>
          <td><strong>${con.name}</strong></td>
          <td style="color: #d9534f; font-weight: bold;">${con.availableQuantity} adet</td>
          <td>${CRITICAL_STOCK_THRESHOLD} adet</td>
        </tr>
      `;
    });

    const bodyHtml = `
      <p>Aşağıda belirtilen ürünlerin stok miktarları kritik eşik değerinin (<strong>${CRITICAL_STOCK_THRESHOLD}</strong>) altına düşmüştür:</p>
      <table class="table">
        <thead>
          <tr>
            <th>Tür</th>
            <th>Ürün Adı</th>
            <th>Mevcut Stok</th>
            <th>Kritik Eşik</th>
          </tr>
        </thead>
        <tbody>
          ${itemsTableRows}
        </tbody>
      </table>
      <p>Lütfen stok tedarik işlemlerini kontrol ediniz.</p>
    `;

    const subject = `⚠️ Kritik Stok Uyarısı — ${totalCriticalCount} ürün kritik seviyede`;
    const html = buildEmailTemplate({
      title: `⚠️ Kritik Stok Uyarısı (${totalCriticalCount} Ürün)`,
      bodyHtml,
    });

    const text = `⚠️ Kritik Stok Uyarısı — ${totalCriticalCount} ürün kritik seviyede\n\n` +
      criticalAccessories.map(a => `- Aksesuar: ${a.name} (Stok: ${a.availableQuantity}, Eşik: ${CRITICAL_STOCK_THRESHOLD})`).join('\n') + '\n' +
      criticalConsumables.map(c => `- Sarf Malzeme: ${c.name} (Stok: ${c.availableQuantity}, Eşik: ${CRITICAL_STOCK_THRESHOLD})`).join('\n');

    await sendMailToAdmins({ subject, text, html });

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
    // Eşik değerinin (5) altında veya eşit mi?
    if (availableQuantity <= CRITICAL_STOCK_THRESHOLD) {
      // Eğer önceden de kritik seviyenin altındaysa ve tekrar düşürüldüyse ya da yeni düştüyse:
      // (Opsiyonel: Eğer önceden de <= 5 ise tekrar bildirim gönderilsin mi? "Düştüğü an" kuralı gereği stok düşürüldüğünde veya güncellendiğinde eşik altındaysa anında atılır)
      const bodyHtml = `
        <p>Aşağıdaki ürün yapılan stok işlemi / güncelleme sonrasında kritik stok eşik değerinin (<strong>${CRITICAL_STOCK_THRESHOLD}</strong>) altına düşmüştür:</p>
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
              <td>${CRITICAL_STOCK_THRESHOLD} adet</td>
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
        `Kritik Eşik: ${CRITICAL_STOCK_THRESHOLD}`;

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

