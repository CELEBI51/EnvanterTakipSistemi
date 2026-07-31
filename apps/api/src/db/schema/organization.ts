import { sql } from 'drizzle-orm';
import {
  boolean,
  integer,
  pgTable,
  timestamp,
  uniqueIndex,
  varchar,
} from 'drizzle-orm/pg-core';
import { categoryKindEnum } from './enums.js';

/* --------------------------------------------------------------- */
/* Departmanlar                                                      */
/* --------------------------------------------------------------- */

export const departments = pgTable(
  'departments',
  {
    id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
    name: varchar('name', { length: 120 }).notNull(),
    code: varchar('code', { length: 32 }),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    /** Soft delete. Kayit ASLA fiziksel olarak silinmez. */
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (t) => [
    // Silinmis kayit, ayni isimle yeni kayit acilmasini engellememeli.
    uniqueIndex('uq_departments_name_active')
      .on(t.name)
      .where(sql`${t.deletedAt} IS NULL`),
    uniqueIndex('uq_departments_code_active')
      .on(t.code)
      .where(sql`${t.deletedAt} IS NULL AND ${t.code} IS NOT NULL`),
  ],
);

/* --------------------------------------------------------------- */
/* Kategoriler                                                       */
/* --------------------------------------------------------------- */

export const categories = pgTable(
  'categories',
  {
    id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
    name: varchar('name', { length: 120 }).notNull(),
    /** Kategori ya demirbas ya sarf tarafina aittir. */
    kind: categoryKindEnum('kind').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (t) => [
    uniqueIndex('uq_categories_name_kind_active')
      .on(t.name, t.kind)
      .where(sql`${t.deletedAt} IS NULL`),
  ],
);
