import { ASSET_TAG_PREFIX, ASSIGNMENT_NO_PREFIX } from '@entanter/shared';
import { sql } from 'drizzle-orm';
import type { DbExecutor } from './audit.js';

/**
 * Otomatik numara uretimi PostgreSQL sequence uzerinden yapilir.
 * MAX(...)+1 yaklasimi es zamanli iki kayitta ayni numarayi uretir;
 * sequence transaction'dan bagimsiz calistigi icin bu mumkun degildir.
 */
async function nextValue(executor: DbExecutor, sequenceName: string): Promise<number> {
  const result = await executor.execute(
    sql`SELECT nextval(${sequenceName}::regclass) AS value`,
  );
  const row = result.rows[0] as { value?: string | number } | undefined;
  return Number(row?.value ?? 0);
}

function pad(value: number): string {
  return String(value).padStart(5, '0');
}

/** ENV-2026-00001 — QR/barkod etiketine basilacak deger. */
export async function nextAssetTag(executor: DbExecutor): Promise<string> {
  const value = await nextValue(executor, 'asset_tag_seq');
  return `${ASSET_TAG_PREFIX}-${new Date().getFullYear()}-${pad(value)}`;
}

/** ZM-2026-00001 — zimmet fis numarasi. */
export async function nextAssignmentNo(executor: DbExecutor): Promise<string> {
  const value = await nextValue(executor, 'assignment_no_seq');
  return `${ASSIGNMENT_NO_PREFIX}-${new Date().getFullYear()}-${pad(value)}`;
}

/** SRF-00001 — sarf malzeme stok kodu. */
export async function nextConsumableSku(executor: DbExecutor): Promise<string> {
  const value = await nextValue(executor, 'consumable_sku_seq');
  return `SRF-${pad(value)}`;
}
