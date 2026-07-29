import type { ConsumableListQuery } from '@entanter/shared';
import { and, asc, count, desc, eq, ilike, isNull, or, sql } from 'drizzle-orm';
import { db } from '../../db/client.js';
import {
  assignmentItems,
  authorizedUsers,
  categories,
  consumables,
  stockMovements,
} from '../../db/schema/index.js';
import { toOffset } from '../../lib/pagination.js';
import { likePattern } from '../../lib/query.js';

export const consumableRepository = {
  async list(query: ConsumableListQuery) {
    const conditions = [isNull(consumables.deletedAt)];

    if (query.q) {
      const pattern = likePattern(query.q);
      const search = or(ilike(consumables.name, pattern), ilike(consumables.sku, pattern));
      if (search) conditions.push(search);
    }
    if (query.categoryId != null) conditions.push(eq(consumables.categoryId, query.categoryId));
    if (query.lowStock === true) {
      conditions.push(sql`${consumables.quantityOnHand} <= ${consumables.minStockLevel}`);
    }

    const where = and(...conditions);

    const [rows, totals] = await Promise.all([
      db
        .select({
          id: consumables.id,
          sku: consumables.sku,
          name: consumables.name,
          unit: consumables.unit,
          quantityOnHand: consumables.quantityOnHand,
          packageSize: consumables.packageSize,
          minStockLevel: consumables.minStockLevel,
          categoryId: consumables.categoryId,
          categoryName: categories.name,
          isLowStock: sql<boolean>`${consumables.quantityOnHand} <= ${consumables.minStockLevel}`,
          /** Su anda personellerin uzerinde bulunan toplam adet. */
          assignedQuantity: sql<number>`(
            SELECT COALESCE(SUM(ai.quantity - ai.returned_quantity), 0)::int
            FROM ${assignmentItems} ai
            WHERE ai.consumable_id = ${consumables.id} AND ai.returned_at IS NULL
          )`,
          createdAt: consumables.createdAt,
        })
        .from(consumables)
        .leftJoin(categories, eq(consumables.categoryId, categories.id))
        .where(where)
        .orderBy(asc(consumables.name))
        .limit(query.limit)
        .offset(toOffset(query.page, query.limit)),
      db.select({ value: count() }).from(consumables).where(where),
    ]);

    return { rows, total: totals[0]?.value ?? 0 };
  },

  async findById(id: number) {
    const rows = await db
      .select({
        id: consumables.id,
        sku: consumables.sku,
        name: consumables.name,
        unit: consumables.unit,
        quantityOnHand: consumables.quantityOnHand,
        packageSize: consumables.packageSize,
        minStockLevel: consumables.minStockLevel,
        notes: consumables.notes,
        categoryId: consumables.categoryId,
        categoryName: categories.name,
        createdAt: consumables.createdAt,
        updatedAt: consumables.updatedAt,
      })
      .from(consumables)
      .leftJoin(categories, eq(consumables.categoryId, categories.id))
      .where(and(eq(consumables.id, id), isNull(consumables.deletedAt)))
      .limit(1);

    return rows[0] ?? null;
  },

  async findRaw(id: number) {
    const rows = await db
      .select()
      .from(consumables)
      .where(and(eq(consumables.id, id), isNull(consumables.deletedAt)))
      .limit(1);
    return rows[0] ?? null;
  },

  /** Stok hareket defteri. */
  async movements(consumableId: number, limit: number, offset: number) {
    const [rows, totals] = await Promise.all([
      db
        .select({
          id: stockMovements.id,
          movementType: stockMovements.movementType,
          quantity: stockMovements.quantity,
          balanceAfter: stockMovements.balanceAfter,
          reason: stockMovements.reason,
          assignmentItemId: stockMovements.assignmentItemId,
          createdAt: stockMovements.createdAt,
          performedById: stockMovements.performedBy,
          performedByName: authorizedUsers.fullName,
        })
        .from(stockMovements)
        .leftJoin(authorizedUsers, eq(stockMovements.performedBy, authorizedUsers.id))
        .where(eq(stockMovements.consumableId, consumableId))
        .orderBy(desc(stockMovements.createdAt), desc(stockMovements.id))
        .limit(limit)
        .offset(offset),
      db
        .select({ value: count() })
        .from(stockMovements)
        .where(eq(stockMovements.consumableId, consumableId)),
    ]);

    return { rows, total: totals[0]?.value ?? 0 };
  },

  /**
   * Tutarlilik denetimi: hareket defterinin toplami eldeki adede esit olmali.
   * Kurulum dogrulamasinda ve ileride bir bakim ekraninda kullanilabilir.
   */
  async ledgerMismatch() {
    return db
      .select({
        id: consumables.id,
        name: consumables.name,
        quantityOnHand: consumables.quantityOnHand,
        ledgerSum: sql<number>`COALESCE((
          SELECT SUM(sm.quantity)::int FROM ${stockMovements} sm
          WHERE sm.consumable_id = ${consumables.id}
        ), 0)`,
      })
      .from(consumables)
      .where(
        and(
          isNull(consumables.deletedAt),
          sql`${consumables.quantityOnHand} <> COALESCE((
            SELECT SUM(sm.quantity)::int FROM ${stockMovements} sm
            WHERE sm.consumable_id = ${consumables.id}
          ), 0)`,
        ),
      );
  },
};
