import { and, count, eq, isNull, sql } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';
import { db } from '../../db/client.js';
import { assets, consumables, staff } from '../../db/schema/index.js';
import { assignmentRepository } from '../assignments/assignments.repository.js';
import { consumableRepository } from '../consumables/consumables.repository.js';

export async function reportRoutes(app: FastifyInstance): Promise<void> {
  app.addHook('preHandler', app.authenticate);

  /** Ana ekran ozeti. */
  app.get('/inventory-summary', async () => {
    const [assetsByStatus, consumableTotals, staffTotal] = await Promise.all([
      db
        .select({ status: assets.status, value: count() })
        .from(assets)
        .where(isNull(assets.deletedAt))
        .groupBy(assets.status),
      db
        .select({
          items: count(),
          totalQuantity: sql<number>`COALESCE(SUM(${consumables.quantityOnHand}), 0)::int`,
          lowStockItems: sql<number>`COUNT(*) FILTER (
            WHERE ${consumables.quantityOnHand} <= ${consumables.minStockLevel}
          )::int`,
        })
        .from(consumables)
        .where(isNull(consumables.deletedAt)),
      db
        .select({ value: count() })
        .from(staff)
        .where(and(isNull(staff.deletedAt), eq(staff.isActive, true))),
    ]);

    const statusMap = Object.fromEntries(assetsByStatus.map((r) => [r.status, r.value]));

    return {
      assets: {
        total: assetsByStatus.reduce((sum, r) => sum + r.value, 0),
        byStatus: statusMap,
      },
      consumables: consumableTotals[0] ?? { items: 0, totalQuantity: 0, lowStockItems: 0 },
      activeStaff: staffTotal[0]?.value ?? 0,
    };
  });

  /** Kritik stok seviyesinin altina dusen kalemler. */
  app.get('/low-stock', async () => {
    const { rows } = await consumableRepository.list({
      page: 1,
      limit: 200,
      order: 'desc',
      lowStock: true,
    });
    return { data: rows };
  });

  /** Kimde ne var — acik zimmetlerin personel bazli ozeti. */
  app.get('/staff-open-assignments', async () => {
    return { data: await assignmentRepository.openByStaff() };
  });

  /**
   * Tutarlilik denetimi: stok hareket defterinin toplami ile eldeki adet
   * uyusuyor mu? Bos dizi donmesi beklenir; dolu donuyorsa veri elle
   * degistirilmis demektir.
   */
  app.get('/stock-integrity', async () => {
    const mismatches = await consumableRepository.ledgerMismatch();
    return {
      consistent: mismatches.length === 0,
      mismatches,
    };
  });
}
