import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import { env } from '../config/env.js';
import { logger } from '../lib/logger.js';
import * as schema from './schema/index.js';

const { Pool, types } = pg;

/**
 * DATE (oid 1082) sutunlarini HAM STRING olarak oku.
 *
 * node-postgres varsayilan olarak DATE'i yerel saat diliminde bir JS Date'e
 * cevirir; bu da UTC'ye donusturulurken "1 gun geri kayma" hatasi uretir.
 * satin_alma_tarihi / garanti_bitis gibi saf tarih alanlarinda bu kabul edilemez,
 * bu yuzden 'YYYY-MM-DD' string olarak birakiliyor (semada mode: 'string').
 */
types.setTypeParser(types.builtins.DATE, (value: string) => value);

export const pool = new Pool({
  connectionString: env.DATABASE_URL,
  max: env.DB_POOL_MAX,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
  // Intranet, TLS yok.
  ssl: false,
  application_name: 'entanter-takip-api',
});

/**
 * Havuzdaki bosta bekleyen bir baglanti koparsa pg 'error' yayar.
 * Bu yakalanmazsa Node process'i dusurur — sunucu yeniden baslatmasi
 * veya kisa suren ag kesintisi tum servisi oldurmemeli.
 */
pool.on('error', (err) => {
  logger.error({ err }, 'PostgreSQL havuzunda beklenmeyen hata (bosta baglanti)');
});

export const db = drizzle(pool, {
  schema,
  logger: env.NODE_ENV === 'development',
});

export type Database = typeof db;

/** Saglik kontrolu ve deploy dogrulamasi icin. */
export async function checkDatabase(): Promise<void> {
  await pool.query('SELECT 1');
}

export async function closeDatabase(): Promise<void> {
  await pool.end();
}
