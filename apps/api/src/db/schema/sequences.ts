import { pgSequence } from 'drizzle-orm/pg-core';

/**
 * Otomatik numara ureticileri.
 *
 * MAX(...)+1 yerine gercek PostgreSQL sequence kullanildi: es zamanli iki
 * kayit acildiginda MAX+1 ayni numarayi uretip catisir. Sequence,
 * transaction'dan bagimsiz olarak her cagrida benzersiz deger dondurur.
 *
 * Sayaclar yil basinda SIFIRLANMAZ; numara global olarak artar ve etiketteki
 * yil yalnizca bilgi amaclidir. Boylece yillar arasi cakisma imkansizdir.
 */

/** Demirbas numarasi govdesi:  ENV-2026-00001 */
export const assetTagSeq = pgSequence('asset_tag_seq', { startWith: 1, increment: 1 });

/** Zimmet fis numarasi govdesi:  ZM-2026-00001 */
export const assignmentNoSeq = pgSequence('assignment_no_seq', { startWith: 1, increment: 1 });

/** Sarf malzeme stok kodu govdesi:  SRF-00001 */
export const consumableSkuSeq = pgSequence('consumable_sku_seq', { startWith: 1, increment: 1 });
