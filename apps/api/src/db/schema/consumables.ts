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
import { categories } from './organization.js';

/**
 * DEMIRBASSIZ / toplu aksesuarlar: fare, klavye, kablo...
 * Her satir bir STOK KALEMIDIR (SKU), tekil bir fiziksel obje degil.
 * Takip adet (quantity_on_hand) uzerinden yapilir.
 *
 * Demirbaslilar ayri tabloda (`assets`). Tek tabloda "type" kolonuyla
 * birlestirilmedi: demirbas numarasi ve seri no tekilligi sarf malzemede
 * anlamsiz oldugu icin bu alanlar nullable olmak zorunda kalir ve
 * veritabani seviyesinde tekillik GARANTI EDILEMEZDI.
 */
export const consumables = pgTable(
  'consumables',
  {
    id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
    sku: varchar('sku', { length: 48 }),
    name: varchar('name', { length: 160 }).notNull(),
    categoryId: integer('category_id').references(() => categories.id, { onDelete: 'set null' }),
    unit: varchar('unit', { length: 16 }).notNull().default('Adet'),
    /** Eldeki toplam adet. stock_movements defterinin denormalize ozeti. */
    quantityOnHand: integer('quantity_on_hand').notNull().default(0),
    /** Bir kolideki adet. Toplu girislerde koli sayisi bununla carpilir. */
    packageSize: integer('package_size').notNull().default(1),
    minStockLevel: integer('min_stock_level').notNull().default(0),
    notes: text('notes'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (t) => [
    uniqueIndex('uq_consumables_sku_active')
      .on(t.sku)
      .where(sql`${t.deletedAt} IS NULL AND ${t.sku} IS NOT NULL`),
    index('idx_consumables_category').on(t.categoryId),
    // Stok asla negatife dusemez. Uygulama katmanina GUVENILMEZ; garanti burada.
    check('chk_consumables_qty_non_negative', sql`${t.quantityOnHand} >= 0`),
    check('chk_consumables_package_size', sql`${t.packageSize} > 0`),
    check('chk_consumables_min_stock', sql`${t.minStockLevel} >= 0`),
  ],
);
