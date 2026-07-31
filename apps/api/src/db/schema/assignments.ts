import { sql } from 'drizzle-orm';
import {
  check,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from 'drizzle-orm/pg-core';
import { assets } from './assets.js';
import { consumables } from './consumables.js';
import { assignmentStatusEnum, returnConditionEnum } from './enums.js';
import { departments } from './organization.js';
import { staff } from './staff.js';
import { authorizedUsers } from './users.js';

/**
 * Zimmet fisi (baslik). Bir personele bir seferde teslim edilen
 * demirbas + aksesuar kaleminin tamamini temsil eder.
 */
export const assignments = pgTable(
  'assignments',
  {
    id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
    /** Insan tarafindan okunabilir fis no: ZM-YYYY-NNNNN */
    assignmentNo: varchar('assignment_no', { length: 32 }).notNull(),
    staffId: integer('staff_id')
      .notNull()
      .references(() => staff.id, { onDelete: 'restrict' }),
    /** Zimmeti YAPAN yetkili. */
    assignedBy: integer('assigned_by')
      .notNull()
      .references(() => authorizedUsers.id, { onDelete: 'restrict' }),
    /**
     * SNAPSHOT: zimmet anindaki departman. Personel sonradan departman
     * degistirse bile gecmis kayit bozulmaz — denetim izinin temel kurali.
     */
    departmentId: integer('department_id').references(() => departments.id, {
      onDelete: 'set null',
    }),
    locationNote: varchar('location_note', { length: 160 }),
    assignedAt: timestamp('assigned_at', { withTimezone: true }).notNull().defaultNow(),
    status: assignmentStatusEnum('status').notNull().default('open'),
    notes: text('notes'),
    closedAt: timestamp('closed_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('uq_assignments_no').on(t.assignmentNo),
    // Personel gecmisi sorgusunun ana indeksi.
    index('idx_assignments_staff').on(t.staffId, t.assignedAt),
    index('idx_assignments_status').on(t.status),
    index('idx_assignments_department').on(t.departmentId),
  ],
);

/**
 * Zimmet satiri. Demirbas ve sarf malzemeyi AYNI akista bulusturan tablo.
 *
 * Bu tablodaki kisitlar sistemin veri butunlugunun bel kemigidir ve
 * bilincli olarak uygulama katmanina birakilmamistir.
 */
export const assignmentItems = pgTable(
  'assignment_items',
  {
    id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
    assignmentId: integer('assignment_id')
      .notNull()
      .references(() => assignments.id, { onDelete: 'restrict' }),
    assetId: integer('asset_id').references(() => assets.id, { onDelete: 'restrict' }),
    consumableId: integer('consumable_id').references(() => consumables.id, {
      onDelete: 'restrict',
    }),
    /** Demirbasta her zaman 1; sarf malzemede verilen adet. */
    quantity: integer('quantity').notNull().default(1),
    /** Kismi iade destegi: simdiye kadar iade edilen adet. */
    returnedQuantity: integer('returned_quantity').notNull().default(0),
    /** Yalnizca TAM iade tamamlandiginda dolar. */
    returnedAt: timestamp('returned_at', { withTimezone: true }),
    returnedTo: integer('returned_to').references(() => authorizedUsers.id, {
      onDelete: 'set null',
    }),
    returnCondition: returnConditionEnum('return_condition'),
    returnNotes: text('return_notes'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('idx_assignment_items_assignment').on(t.assignmentId),
    // Urun gecmisi sorgusunun ana indeksi.
    index('idx_assignment_items_asset').on(t.assetId),
    index('idx_assignment_items_consumable').on(t.consumableId),

    /**
     * KRITIK: Bir demirbas ayni anda YALNIZCA TEK acik zimmette olabilir.
     * Uygulama kontrolu yarisli isteklerde kacirabilir; garanti veritabaninda.
     */
    uniqueIndex('uq_asset_open_assignment')
      .on(t.assetId)
      .where(sql`${t.returnedAt} IS NULL AND ${t.assetId} IS NOT NULL`),

    /** Satir ya demirbas ya sarf olur, ikisi birden asla. Demirbasta adet = 1. */
    check(
      'chk_item_kind',
      sql`(${t.assetId} IS NOT NULL AND ${t.consumableId} IS NULL AND ${t.quantity} = 1)
       OR (${t.assetId} IS NULL AND ${t.consumableId} IS NOT NULL AND ${t.quantity} > 0)`,
    ),

    /** Iade edilen adet, verilen adedi asamaz. */
    check(
      'chk_returned_quantity_range',
      sql`${t.returnedQuantity} >= 0 AND ${t.returnedQuantity} <= ${t.quantity}`,
    ),

    /** returned_at dolu ISE VE YALNIZCA ISE tam iade yapilmistir. */
    check(
      'chk_return_consistency',
      sql`(${t.returnedAt} IS NOT NULL AND ${t.returnedQuantity} = ${t.quantity})
       OR (${t.returnedAt} IS NULL AND ${t.returnedQuantity} < ${t.quantity})`,
    ),
  ],
);
