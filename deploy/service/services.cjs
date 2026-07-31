/**
 * Windows Service kayit/kaldirma islemleri.
 *
 * node-windows kullanilir: saf JS'tir, native derleme gerektirmez, bu yuzden
 * internetsiz sunucuya node_modules kopyalanarak tasinabilir.
 *
 * Kullanim (Yonetici olarak):
 *   node services.cjs install
 *   node services.cjs uninstall
 *
 * Kayit edilen iki servis:
 *   EntanterTakipAPI  -> apps/api  (varsayilan :3001)
 *   EntanterTakipWeb  -> statik SPA sunucusu (varsayilan :3000)
 *
 * Her ikisi de "Otomatik" baslar ve cokme durumunda yeniden baslatilir.
 */
const path = require('node:path');
const { Service } = require('node-windows');

const APP_ROOT = path.resolve(__dirname, '..');

const DEFINITIONS = [
  {
    name: 'EntanterTakipAPI',
    description: 'Envanter ve Zimmet Takip - REST API servisi',
    script: path.join(APP_ROOT, 'app', 'api', 'dist', 'server.js'),
    // .env dosyasi bulunabilsin diye calisma dizini API kokunde olmali.
    workingDirectory: path.join(APP_ROOT, 'app', 'api'),
  },
  {
    name: 'EntanterTakipWeb',
    description: 'Envanter ve Zimmet Takip - Web arayuzu (statik sunucu)',
    script: path.join(APP_ROOT, 'static-server.mjs'),
    workingDirectory: APP_ROOT,
    env: [{ name: 'WEB_ROOT', value: path.join(APP_ROOT, 'app', 'web') }],
  },
];

function build(definition) {
  const service = new Service({
    name: definition.name,
    description: definition.description,
    script: definition.script,
    workingDirectory: definition.workingDirectory,
    env: definition.env ?? [],
    // Cokerse yeniden baslat; sonsuz donguye girmesin diye deneme siniri var.
    wait: 2,
    grow: 0.5,
    maxRestarts: 10,
    // Node'a fazladan bayrak gecirmiyoruz; uretim varsayilanlari yeterli.
    nodeOptions: [],
  });
  return service;
}

const action = process.argv[2];

if (action !== 'install' && action !== 'uninstall') {
  console.error('Kullanim: node services.cjs <install|uninstall>');
  process.exit(1);
}

for (const definition of DEFINITIONS) {
  const service = build(definition);

  service.on('install', () => {
    console.log(`[servis] ${definition.name} kuruldu, baslatiliyor...`);
    service.start();
  });

  service.on('alreadyinstalled', () => {
    console.log(`[servis] ${definition.name} zaten kurulu, atlandi.`);
  });

  service.on('start', () => {
    console.log(`[servis] ${definition.name} calisiyor.`);
  });

  service.on('uninstall', () => {
    console.log(`[servis] ${definition.name} kaldirildi.`);
  });

  service.on('error', (error) => {
    console.error(`[servis] ${definition.name} HATA:`, error);
  });

  if (action === 'install') {
    service.install();
  } else {
    service.stop();
    service.uninstall();
  }
}
