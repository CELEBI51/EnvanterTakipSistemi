import { sql } from 'drizzle-orm';
import {
  bigint,
  check,
  index,
  integer,
  pgTable,
  text,
  timestamp,
} from 'drizzle-orm/pg-core';
import { assignmentItems } from './assignments.js';
import { consumables } from './consumables.js';
import { stockMovementTypeEnum } from './enums.js';
import { authorizedUsers } from './users.js';

/**
 * Stok hareket defteri (ledger).
 *
 * `quantity` ISARETLI bir delta'dir: giris/iade pozitif, zimmet cikisi negatif,
 * sayim duzeltmesi fark kadar +/-. Boylece bir kalemin tum hareketlerinin
 * toplami her zaman consumables.quantity_on_hand degerine esit olmalidir —
 * tutarlilik tek bir SUM sorgusuyla denetlenebilir.
 *
 * `balanceAfter` o andaki bakiyeyi dondurur (snapshot); gecmise donuk
 * raporlarda "o tarihte elde ne vardi" sorusunu yeniden hesaplamadan cevaplar.
 */
export const stockMovements = pgTable(
  'stock_movements',
  {
    id: bigint('id', { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
    consumableId: integer('consumable_id')
      .notNull()
      .references(() => consumables.id, { onDelete: 'restrict' }),
    movementType: stockMovementTypeEnum('movement_type').notNull(),
    quantity: integer('quantity').notNull(),
    balanceAfter: integer('balance_after').notNull(),
    /** Hareket bir zimmet satirindan kaynaklandiysa kaynagi. */
    assignmentItemId: integer('assignment_item_id').references(() => assignmentItems.id, {
      onDelete: 'restrict',
    }),
    reason: text('reason'),
    performedBy: integer('performed_by').references(() => authorizedUsers.id, {
      onDelete: 'set null',
    }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('idx_stock_movements_consumable').on(t.consumableId, t.createdAt),
    index('idx_stock_movements_item').on(t.assignmentItemId),
    check('chk_stock_movements_qty_nonzero', sql`${t.quantity} <> 0`),
    check('chk_stock_movements_balance', sql`${t.balanceAfter} >= 0`),
  ],
);
