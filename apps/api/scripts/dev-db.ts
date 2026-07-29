/**
 * GELISTIRME VERITABANI — yalnizca bu makine icin.
 *
 * PGlite (PostgreSQL'in WebAssembly derlemesi) bir TCP soketi uzerinde
 * sunulur; boylece uygulama gercek `pg` surucusuyle, uretimdekiyle
 * BIREBIR AYNI kod yolundan baglanir. Sahte/mock bir katman degildir:
 * CHECK constraint'ler, partial unique index'ler ve transaction'lar
 * gercek PostgreSQL motoru tarafindan uygulanir.
 *
 * Neden: fabrika sunucusuna PostgreSQL kurulana kadar mimariyi ve
 * ozellikle zimmet transaction'ini gercek kisitlara karsi dogrulayabilmek icin.
 *
 * UYARI: Bu SADECE bir devDependency'dir; uretim paketine dahil edilmez.
 * Veri `.devdata/` klasorunde tutulur ve git'e girmez.
 *
 * Kullanim:  npm run dev:db   (ayri bir terminalde acik birakin)
 */
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PGlite } from '@electric-sql/pglite';
import { PGLiteSocketServer } from '@electric-sql/pglite-socket';

const here = dirname(fileURLToPath(import.meta.url));
const dataDir = resolve(here, '../.devdata');
const port = Number(process.env.DEV_DB_PORT ?? 5432);

mkdirSync(dataDir, { recursive: true });

const pglite = await PGlite.create({ dataDir });
const server = new PGLiteSocketServer({ db: pglite, port, host: '127.0.0.1' });

await server.start();

console.log('');
console.log('  ================================================================');
console.log('   GELISTIRME VERITABANI CALISIYOR  (PGlite / gercek PostgreSQL)');
console.log(`   Adres      : postgresql://postgres:postgres@127.0.0.1:${port}/postgres`);
console.log(`   Veri klasoru: ${dataDir}`);
console.log('   Bu pencereyi acik birakin. Durdurmak icin Ctrl+C.');
console.log('  ================================================================');
console.log('');

let stopping = false;
const stop = async () => {
  if (stopping) return;
  stopping = true;
  console.log('\n[dev-db] Kapatiliyor...');
  await server.stop();
  await pglite.close();
  process.exit(0);
};

for (const signal of ['SIGINT', 'SIGTERM', 'SIGBREAK'] as const) {
  process.on(signal, () => void stop());
}
