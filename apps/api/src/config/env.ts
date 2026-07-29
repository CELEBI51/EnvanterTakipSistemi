import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { config as loadDotenv } from 'dotenv';
import { z } from 'zod';

/**
 * .env dosyasini bul ve yukle.
 * Hem `npm run dev -w @entanter/api` (cwd = apps/api) hem de sunucuda
 * `node dist/server.js` (cwd = uygulama koku) senaryosunda calisir.
 */
const here = dirname(fileURLToPath(import.meta.url));
const candidates = [
  resolve(process.cwd(), '.env'),
  resolve(here, '../../.env'), // src/config/.. veya dist/config/..
];
for (const candidate of candidates) {
  if (existsSync(candidate)) {
    loadDotenv({ path: candidate, quiet: true });
    break;
  }
}

/** "true"/"1" disindaki her sey false. z.coerce.boolean() KULLANILMAZ: Boolean("false") === true. */
const boolFromEnv = (defaultValue: boolean) =>
  z.preprocess((v) => {
    if (v === undefined || v === '') return defaultValue;
    return v === 'true' || v === '1';
  }, z.boolean());

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  HOST: z.string().min(1).default('0.0.0.0'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3001),

  DATABASE_URL: z.string().min(1, { error: 'DATABASE_URL zorunludur.' }),
  DB_POOL_MAX: z.coerce.number().int().min(1).max(100).default(10),

  JWT_ACCESS_SECRET: z
    .string()
    .min(32, { error: 'JWT_ACCESS_SECRET en az 32 karakter olmalıdır.' }),
  JWT_REFRESH_SECRET: z
    .string()
    .min(32, { error: 'JWT_REFRESH_SECRET en az 32 karakter olmalıdır.' }),
  ACCESS_TOKEN_TTL: z.string().default('15m'),
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().min(1).max(90).default(7),

  /** Virgulle ayrilmis tam eslesmeli origin listesi. Wildcard KULLANILMAZ. */
  CORS_ORIGINS: z.string().default('http://localhost:3000'),
  /** Intranette TLS yoksa false kalir; cookie Secure bayragi buna bagli. */
  USE_HTTPS: boolFromEnv(false),

  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
  LOG_DIR: z.string().optional(),

  /** Ilk kurulumda seed'in olusturacagi yonetici. */
  SEED_ADMIN_USERNAME: z.string().min(3).default('admin'),
  SEED_ADMIN_PASSWORD: z.string().optional(),
  SEED_ADMIN_FULLNAME: z.string().min(1).default('Sistem Yoneticisi'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const flat = z.flattenError(parsed.error);
  // Yarim yapilandirilmis bir servisin ayakta kalmasindansa acilista olmesi yeglenir.
  console.error('\n[env] Ortam degiskenleri gecersiz — servis baslatilamiyor:\n');
  for (const [key, messages] of Object.entries(flat.fieldErrors)) {
    console.error(`  - ${key}: ${(messages ?? []).join(', ')}`);
  }
  console.error('\n.env.example dosyasini ornek alarak .env olusturun.\n');
  process.exit(1);
}

export const env = parsed.data;

export const isProduction = env.NODE_ENV === 'production';

/** CORS whitelist'i. Bos girdiler ayiklanir. */
export const corsOrigins = env.CORS_ORIGINS.split(',')
  .map((o) => o.trim())
  .filter((o) => o.length > 0);
