/**
 * Frontend statik sunucusu — SIFIR BAGIMLILIK.
 *
 * Yalnizca Node'un kendi modullerini kullanir. Boylece internetsiz sunucuda
 * frontend'i yayinlamak icin ne nginx/IIS kurulumu ne de ek bir npm paketi
 * gerekir; `node static-server.mjs` yeterlidir.
 *
 * Ortam degiskenleri:
 *   WEB_PORT  (varsayilan 3000)
 *   WEB_HOST  (varsayilan 0.0.0.0)
 *   WEB_ROOT  (varsayilan ./web)
 */
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import { dirname, extname, join, normalize, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(process.env.WEB_ROOT ?? join(here, 'web'));
const PORT = Number(process.env.WEB_PORT ?? 3000);
const HOST = process.env.WEB_HOST ?? '0.0.0.0';

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.map': 'application/json; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
};

/**
 * Istenen yolu ROOT icine hapseder.
 * `..` iceren istekler diski gezmeye calisabilir; normalize edilip
 * ROOT disina cikan her yol reddedilir.
 */
function resolveSafePath(urlPath) {
  const decoded = decodeURIComponent(urlPath.split('?')[0] ?? '/');
  const candidate = resolve(join(ROOT, normalize(decoded)));
  if (candidate !== ROOT && !candidate.startsWith(ROOT + sep)) return null;
  return candidate;
}

async function findFile(pathname) {
  const safePath = resolveSafePath(pathname);
  if (!safePath) return null;

  try {
    const info = await stat(safePath);
    if (info.isFile()) return { path: safePath, size: info.size };
    if (info.isDirectory()) {
      const indexPath = join(safePath, 'index.html');
      const indexInfo = await stat(indexPath);
      if (indexInfo.isFile()) return { path: indexPath, size: indexInfo.size };
    }
  } catch {
    /* dosya yok */
  }
  return null;
}

const server = createServer((request, response) => {
  void (async () => {
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      response.writeHead(405, { Allow: 'GET, HEAD' });
      response.end('Method Not Allowed');
      return;
    }

    let file = await findFile(request.url ?? '/');

    /**
     * SPA fallback: /personel gibi istemci tarafi rotalari diskte dosya
     * olarak bulunmaz; index.html dondurulur ve yonlendirmeyi React Router yapar.
     */
    if (!file) {
      file = await findFile('/index.html');
      if (!file) {
        response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        response.end('Uygulama dosyaları bulunamadı.');
        return;
      }
    }

    const ext = extname(file.path).toLowerCase();
    const isHashedAsset = file.path.includes(`${sep}assets${sep}`);

    response.writeHead(200, {
      'Content-Type': MIME_TYPES[ext] ?? 'application/octet-stream',
      'Content-Length': file.size,
      // Hash'li varliklar sonsuza kadar onbelleklenebilir; index.html ASLA.
      'Cache-Control': isHashedAsset
        ? 'public, max-age=31536000, immutable'
        : 'no-cache, must-revalidate',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'no-referrer',
      'X-Frame-Options': 'SAMEORIGIN',
    });

    if (request.method === 'HEAD') {
      response.end();
      return;
    }

    createReadStream(file.path).pipe(response);
  })();
});

server.listen(PORT, HOST, () => {
  console.log(`[web] Statik sunucu calisiyor: http://${HOST}:${PORT}  (kok: ${ROOT})`);
});

let shuttingDown = false;
for (const signal of ['SIGTERM', 'SIGINT', 'SIGBREAK']) {
  process.on(signal, () => {
    if (shuttingDown) return;
    shuttingDown = true;
    console.log('[web] Kapatiliyor...');
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(0), 5000).unref();
  });
}
