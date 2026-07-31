import {
  bigint,
  index,
  integer,
  jsonb,
  pgTable,
  timestamp,
  varchar,
} from 'drizzle-orm/pg-core';
import { authorizedUsers } from './users.js';

/**
 * Genel denetim izi. Kim, neyi, ne zaman degistirdi.
 *
 * Zimmet/iade/durum degisikligi gibi is olaylarinin KENDI tablolari zaten var
 * (assignments, asset_status_history, stock_movements); burasi bunlarin
 * yerine gecmez, ustune "ham degisiklik" katmani ekler: ozellikle
 * duzeltme amacli guncellemelerin (yanlis seri no, yanlis departman)
 * geriye donuk takibi icin.
 */
export const auditLog = pgTable(
  'audit_log',
  {
    id: bigint('id', { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
    /** 'asset' | 'staff' | 'assignment' | 'consumable' ... */
    entityType: varchar('entity_type', { length: 40 }).notNull(),
    entityId: integer('entity_id'),
    /** @entanter/shared > AUDIT_ACTION anahtarlari. */
    action: varchar('action', { length: 30 }).notNull(),
    actorId: integer('actor_id').references(() => authorizedUsers.id, { onDelete: 'set null' }),
    before: jsonb('before'),
    after: jsonb('after'),
    ipAddress: varchar('ip_address', { length: 64 }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('idx_audit_entity').on(t.entityType, t.entityId, t.createdAt),
    index('idx_audit_actor').on(t.actorId, t.createdAt),
  ],
);
