import { buildApp } from './app.js';
import { env } from './config/env.js';
import { closeDatabase } from './db/client.js';
import { logger } from './lib/logger.js';

const app = await buildApp();

try {
  await app.listen({ host: env.HOST, port: env.PORT });
  logger.info(
    { host: env.HOST, port: env.PORT, env: env.NODE_ENV },
    'Entanter Takip API calisiyor',
  );
} catch (error) {
  logger.fatal({ err: error }, 'Sunucu baslatilamadi');
  process.exit(1);
}

/* ------------------------------------------------------------------ */
/* Temiz kapanis                                                       */
/* ------------------------------------------------------------------ */

let shuttingDown = false;

async function shutdown(signal: string): Promise<void> {
  if (shuttingDown) return;
  shuttingDown = true;

  logger.info({ signal }, 'Kapatma sinyali alindi, baglantilar kapatiliyor');

  // Acik istekler bitmeden kapanmazsa yarim kalmis transaction olusabilir;
  // bu yuzden once Fastify, sonra veritabani havuzu kapatilir.
  const timeout = setTimeout(() => {
    logger.error('Temiz kapanis zaman asimina ugradi, zorla cikiliyor');
    process.exit(1);
  }, 10_000);
  timeout.unref();

  try {
    await app.close();
    await closeDatabase();
    logger.info('Temiz kapanis tamamlandi');
    process.exit(0);
  } catch (error) {
    logger.error({ err: error }, 'Kapanis sirasinda hata');
    process.exit(1);
  }
}

// SIGBREAK Windows'a ozgudur (Windows Service durdurma / Ctrl+Break).
for (const signal of ['SIGTERM', 'SIGINT', 'SIGBREAK'] as const) {
  process.on(signal, () => {
    void shutdown(signal);
  });
}

process.on('unhandledRejection', (reason) => {
  logger.error({ err: reason }, 'Yakalanmamis promise reddi');
});

process.on('uncaughtException', (error) => {
  logger.fatal({ err: error }, 'Yakalanmamis istisna — process kapatiliyor');
  void shutdown('uncaughtException');
});
