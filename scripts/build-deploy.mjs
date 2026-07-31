/**
 * DEPLOY PAKETI URETICISI
 *
 * Internetsiz fabrika sunucusuna tasinacak `deploy/` klasorunu hazirlar.
 * Sunucuda `npm install` CALISTIRILMAZ; tum bagimliliklar burada kurulup
 * hazir halde kopyalanir.
 *
 * Kullanim:  node scripts/build-deploy.mjs
 */
import { execSync } from 'node:child_process';
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { readdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DEPLOY = join(ROOT, 'deploy');
const APP = join(DEPLOY, 'app');

const step = (message) => console.log(`\n\x1b[36m▸ ${message}\x1b[0m`);
const ok = (message) => console.log(`  \x1b[32m✓\x1b[0m ${message}`);
const warn = (message) => console.log(`  \x1b[33m!\x1b[0m ${message}`);

function run(command, cwd = ROOT) {
  execSync(command, { cwd, stdio: 'inherit' });
}

function folderSizeMb(target) {
  let total = 0;
  const walk = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else total += statSync(full).size;
    }
  };
  if (existsSync(target)) walk(target);
  return (total / 1024 / 1024).toFixed(1);
}

/* ------------------------------------------------------------------ */
/* 1. Derleme                                                          */
/* ------------------------------------------------------------------ */
step('Paketler derleniyor');
run('npm run build -w @entanter/shared');
run('npm run build -w @entanter/api');
run('npm run build -w @entanter/web');
ok('shared, api ve web derlendi');

/* ------------------------------------------------------------------ */
/* 2. Onceki cikti temizleniyor                                        */
/* ------------------------------------------------------------------ */
step('Onceki deploy ciktisi temizleniyor');
rmSync(APP, { recursive: true, force: true });
mkdirSync(join(APP, 'api'), { recursive: true });
mkdirSync(join(APP, 'web'), { recursive: true });
ok('deploy/app sifirlandi');

/* ------------------------------------------------------------------ */
/* 3. API dosyalari                                                    */
/* ------------------------------------------------------------------ */
step('API kopyalaniyor');
cpSync(join(ROOT, 'apps/api/dist'), join(APP, 'api/dist'), { recursive: true });
cpSync(join(ROOT, 'apps/api/drizzle'), join(APP, 'api/drizzle'), { recursive: true });
cpSync(join(ROOT, 'apps/api/.env.example'), join(APP, 'api/.env.example'));
ok('dist, drizzle ve .env.example kopyalandi');

const apiPackage = JSON.parse(readFileSync(join(ROOT, 'apps/api/package.json'), 'utf8'));

// Workspace bagimliligi npm'den kurulamaz; dist'i elle yerlestirilecek.
const productionDependencies = { ...apiPackage.dependencies };
delete productionDependencies['@entanter/shared'];

const deployPackage = {
  name: 'entanter-takip-api',
  version: apiPackage.version,
  private: true,
  type: 'module',
  main: 'dist/server.js',
  engines: { node: '>=24.0.0' },
  scripts: {
    start: 'node dist/server.js',
    migrate: 'node dist/db/migrate.js',
    seed: 'node dist/db/seed.js',
  },
  dependencies: productionDependencies,
};

writeFileSync(
  join(APP, 'api/package.json'),
  `${JSON.stringify(deployPackage, null, 2)}\n`,
);
ok(`package.json yazildi (${Object.keys(productionDependencies).length} uretim bagimliligi)`);

/* ------------------------------------------------------------------ */
/* 4. Uretim bagimliliklari                                            */
/* ------------------------------------------------------------------ */
step('Uretim bagimliliklari kuruluyor (repo disinda)');

/**
 * Kurulum, repo agacinin DISINDA yapilir. Aksi halde npm ust dizindeki
 * workspace kokunu gorup paketleri oraya hoist eder ve deploy klasoru
 * eksik node_modules ile kalir.
 */
const staging = mkdtempSync(join(tmpdir(), 'entanter-deploy-'));
try {
  writeFileSync(join(staging, 'package.json'), `${JSON.stringify(deployPackage, null, 2)}\n`);
  run('npm install --omit=dev --no-audit --no-fund --no-package-lock', staging);

  cpSync(join(staging, 'node_modules'), join(APP, 'api/node_modules'), { recursive: true });
  ok('node_modules kopyalandi');
} finally {
  rmSync(staging, { recursive: true, force: true });
}

// Workspace paketi elle yerlestiriliyor.
const sharedTarget = join(APP, 'api/node_modules/@entanter/shared');
mkdirSync(sharedTarget, { recursive: true });
cpSync(join(ROOT, 'packages/shared/dist'), join(sharedTarget, 'dist'), { recursive: true });
writeFileSync(
  join(sharedTarget, 'package.json'),
  `${JSON.stringify(
    {
      name: '@entanter/shared',
      version: '1.0.0',
      type: 'module',
      main: './dist/index.js',
      types: './dist/index.d.ts',
      exports: { '.': { types: './dist/index.d.ts', default: './dist/index.js' } },
    },
    null,
    2,
  )}\n`,
);
ok('@entanter/shared yerlestirildi');

/* ------------------------------------------------------------------ */
/* 5. Web dosyalari                                                    */
/* ------------------------------------------------------------------ */
step('Web arayuzu kopyalaniyor');
cpSync(join(ROOT, 'apps/web/dist'), join(APP, 'web'), { recursive: true });
ok('statik dosyalar kopyalandi');

/* ------------------------------------------------------------------ */
/* 6. Offline dogrulamasi                                              */
/* ------------------------------------------------------------------ */
step('Offline uygunluk denetimi');

const nativeModules = [];
async function scanNative(dir) {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) await scanNative(full);
    else if (entry.name.endsWith('.node')) nativeModules.push(full);
  }
}
await scanNative(join(APP, 'api/node_modules'));

if (nativeModules.length === 0) {
  ok('Native modul (.node) YOK — node_modules baska makineye tasinabilir');
} else {
  warn(`${nativeModules.length} native modul bulundu — sunucu mimarisiyle uyumlu olmali:`);
  for (const item of nativeModules.slice(0, 10)) {
    console.log(`      ${item.replace(APP, 'deploy/app')}`);
  }
}

// HTML yorumlari cikarilir: yorum icindeki bir adres istek uretmez ve
// yanlis alarm verip gercek bir bulguyu golgelemesin.
const indexHtml = readFileSync(join(APP, 'web/index.html'), 'utf8').replace(/<!--[\s\S]*?-->/g, '');
const externalRefs = indexHtml.match(/https?:\/\/(?!localhost)[^\s"'<>]+/g);
if (externalRefs) {
  warn(`index.html icinde dis adres bulundu — kontrol edin: ${externalRefs.join(', ')}`);
} else {
  ok('index.html icinde dis adres yok');
}

/* ------------------------------------------------------------------ */
/* 7. Ozet                                                             */
/* ------------------------------------------------------------------ */
step('Paket hazir');
console.log(`  API   : ${folderSizeMb(join(APP, 'api'))} MB`);
console.log(`  Web   : ${folderSizeMb(join(APP, 'web'))} MB`);
console.log(`  TOPLAM: ${folderSizeMb(APP)} MB`);
console.log('');
console.log('  Sonraki adimlar:');
console.log('   1) deploy/installers/ klasorune Node.js MSI ve PostgreSQL installer');
console.log('      dosyalarini indirip koyun (bu makinede, internet varken).');
console.log('   2) deploy/ klasorunun TAMAMINI sunucuya kopyalayin.');
console.log('   3) Sunucuda deploy/00-KURULUM.md dosyasini takip edin.');
console.log('');
