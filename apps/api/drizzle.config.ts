import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { config as loadDotenv } from 'dotenv';
import { defineConfig } from 'drizzle-kit';

const envPath = resolve(process.cwd(), '.env');
if (existsSync(envPath)) {
  loadDotenv({ path: envPath, quiet: true });
}

export default defineConfig({
  schema: './src/db/schema/index.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    // `generate` icin gercek baglanti gerekmez; `migrate`/`studio` icin gerekir.
    url: process.env.DATABASE_URL ?? 'postgresql://postgres:postgres@localhost:5432/entanter_takip',
  },
  verbose: true,
  strict: true,
});
