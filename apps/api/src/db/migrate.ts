import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { closeDatabase, db } from './client.js';

/**
 * Migration calistiricisi. Idempotent'tir: drizzle kendi
 * `__drizzle_migrations` tablosunu tutar, uygulanmis dosyalari atlar.
 * Sunucuda `npm run db:migrate:prod` ile calistirilir.
 */
const here = dirname(fileURLToPath(import.meta.url));
// src/db/../../drizzle  ve  dist/db/../../drizzle
const migrationsFolder = resolve(here, '../../drizzle');

try {
  console.log(`[migrate] Migration klasoru: ${migrationsFolder}`);
  await migrate(db, { migrationsFolder });
  console.log('[migrate] Tamamlandi.');
} catch (error) {
  console.error('[migrate] BASARISIZ:', error);
  process.exitCode = 1;
} finally {
  await closeDatabase();
}
