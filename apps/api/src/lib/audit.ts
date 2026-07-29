import type { AuditAction } from '@entanter/shared';
import type { Database } from '../db/client.js';
import { auditLog } from '../db/schema/index.js';

/** Drizzle transaction nesnesinin tipi. */
export type Tx = Parameters<Parameters<Database['transaction']>[0]>[0];

/**
 * Hem `db` hem transaction kabul eden calistirici.
 * Denetim kaydi ISLEMIN ICINDE yazilir; islem geri alinirsa denetim
 * kaydi da geri alinir — "olmayan bir degisikligin logu" olusmaz.
 */
export type DbExecutor = Database | Tx;

export interface AuditEntry {
  entityType: 'asset' | 'consumable' | 'staff' | 'assignment' | 'department' | 'category' | 'user';
  entityId?: number | null;
  action: AuditAction;
  actorId?: number | null;
  before?: unknown;
  after?: unknown;
  ipAddress?: string | null;
}

export async function writeAudit(executor: DbExecutor, entry: AuditEntry): Promise<void> {
  await executor.insert(auditLog).values({
    entityType: entry.entityType,
    entityId: entry.entityId ?? null,
    action: entry.action,
    actorId: entry.actorId ?? null,
    before: entry.before ?? null,
    after: entry.after ?? null,
    ipAddress: entry.ipAddress ?? null,
  });
}
