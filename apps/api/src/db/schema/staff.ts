import { sql } from 'drizzle-orm';
import {
  boolean,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from 'drizzle-orm/pg-core';
import { departments } from './organization.js';

/**
 * Zimmet alabilecek fabrika personeli.
 * Sisteme giris YAPMAZ — giris yapan yetkililer `authorized_users` tablosunda.
 */
export const staff = pgTable(
  'staff',
  {
    id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
    employeeNo: varchar('employee_no', { length: 32 }).notNull(),
    firstName: varchar('first_name', { length: 80 }).notNull(),
    lastName: varchar('last_name', { length: 80 }).notNull(),
    /**
     * Personelin GUNCEL departmani. Zimmet kaydinda ayrica snapshot tutulur;
     * personel departman degistirdiginde gecmis zimmetler bozulmaz.
     */
    departmentId: integer('department_id').references(() => departments.id, {
      onDelete: 'set null',
    }),
    title: varchar('title', { length: 120 }),
    email: varchar('email', { length: 160 }),
    phone: varchar('phone', { length: 32 }),
    notes: text('notes'),
    isActive: boolean('is_active').notNull().default(true),
    /** Ileride AD/LDAP senkronu eklendiginde eslestirme anahtari. */
    externalRef: varchar('external_ref', { length: 160 }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (t) => [
    // Isten ayrilip geri donen personel ayni sicille yeniden acilabilsin diye partial.
    uniqueIndex('uq_staff_employee_no_active')
      .on(t.employeeNo)
      .where(sql`${t.deletedAt} IS NULL`),
    index('idx_staff_department').on(t.departmentId),
    index('idx_staff_last_name').on(t.lastName),
  ],
);
