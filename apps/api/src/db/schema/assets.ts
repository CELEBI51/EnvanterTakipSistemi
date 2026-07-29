import { sql } from 'drizzle-orm';
import {
  bigint,
  date,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from 'drizzle-orm/pg-core';
import { assetStatusEnum } from './enums.js';
import { categories } from './organization.js';
import { authorizedUsers } from './users.js';

/**
 * DEMIRBASLI urunler: laptop, monitor, telefon...
 * Her satir TEK bir fiziksel objedir; adet kavrami yoktur.
 *
 * Sarf/aksesuar ayri tabloda (`consumables`) tutulur. Tek tabloda "type"
 * kolonuyla birlestirilmedi: demirbas numarasi ve seri no tekilligi sarf
 * malzemede anlamsiz oldugu icin tek tabloda bu alanlar nullable olmak
 * zorunda kalir ve veritabani seviyesinde tekillik GARANTI EDILEMEZDI.
 */
export const assets = pgTable(
  'assets',
  {
    id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
    /** Demirbas numarasi. QR/barkod etiketinin icerigi bu degerdir. */
    assetTag: varchar('asset_tag', { length: 32 }).notNull(),
    serialNo: varchar('serial_no', { length: 80 }),
    categoryId: integer('category_id').references(() => categories.id, { onDelete: 'set null' }),
    brand: varchar('brand', { length: 80 }),
    model: varchar('model', { length: 120 }),
    /**
     * Yasam dongusu. `assigned` ve `in_stock` degerleri YALNIZCA zimmet/iade
     * akisi tarafindan yazilir; hurda/kayip/tamir elle degistirilir ve
     * her degisiklik asset_status_history'ye gerekcesiyle islenir.
     */
    status: assetStatusEnum('status').notNull().default('in_stock'),
    purchaseDate: date('purchase_date', { mode: 'string' }),
    warrantyEnd: date('warranty_end', { mode: 'string' }),
    notes: text('notes'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    /** Soft delete. Hurda/kayip bir SILME degil, status degisikligidir. */
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (t) => [
    uniqueIndex('uq_assets_tag_active')
      .on(t.assetTag)
      .where(sql`${t.deletedAt} IS NULL`),
    uniqueIndex('uq_assets_serial_active')
      .on(t.serialNo)
      .where(sql`${t.deletedAt} IS NULL AND ${t.serialNo} IS NOT NULL`),
    index('idx_assets_status').on(t.status),
    index('idx_assets_category').on(t.categoryId),
  ],
);

/**
 * Demirbasin durum degisikligi gecmisi.
 * Urun detayindaki kronolojik akista zimmet hareketleriyle birlestirilir:
 * "kime gitti, ne zaman dondu, ne zaman tamire girdi, ne zaman hurdaya ayrildi".
 */
export const assetStatusHistory = pgTable(
  'asset_status_history',
  {
    id: bigint('id', { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
    assetId: integer('asset_id')
      .notNull()
      .references(() => assets.id, { onDelete: 'restrict' }),
    /** Kayit ilk olusturuldugunda NULL. */
    fromStatus: assetStatusEnum('from_status'),
    toStatus: assetStatusEnum('to_status').notNull(),
    reason: text('reason'),
    changedBy: integer('changed_by').references(() => authorizedUsers.id, {
      onDelete: 'set null',
    }),
    changedAt: timestamp('changed_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('idx_asset_status_history_asset').on(t.assetId, t.changedAt)],
);
