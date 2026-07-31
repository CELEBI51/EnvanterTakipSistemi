import Fastify, { type FastifyBaseLogger, type FastifyInstance } from 'fastify';
import { BadRequestError } from './lib/errors.js';
import { logger } from './lib/logger.js';
import { assetRoutes } from './modules/assets/assets.routes.js';
import { assignmentRoutes } from './modules/assignments/assignments.routes.js';
import { authRoutes } from './modules/auth/auth.routes.js';
import { categoryRoutes } from './modules/categories/categories.routes.js';
import { consumableRoutes } from './modules/consumables/consumables.routes.js';
import { departmentRoutes } from './modules/departments/departments.routes.js';
import { healthRoutes } from './modules/health/health.routes.js';
import { reportRoutes } from './modules/reports/reports.routes.js';
import { staffRoutes } from './modules/staff/staff.routes.js';
import { registerAuth } from './plugins/auth.js';
import { registerErrorHandler } from './plugins/error-handler.js';
import { registerSecurity } from './plugins/security.js';

/**
 * Fastify ornegini kurar ama DINLEMEYE BASLAMAZ.
 * Boylece testlerde `app.inject()` ile port acmadan calistirilabilir.
 */
export async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({
    // FastifyBaseLogger olarak daraltiliyor: aksi halde Fastify ornegin
    // generic'i somut pino Logger tipine kilitlenir ve eklenti fonksiyonlari
    // duz FastifyInstance imzasiyla eslesmez.
    loggerInstance: logger as FastifyBaseLogger,
    // Ters vekil (reverse proxy) yok; X-Forwarded-* basliklarina GUVENILMEZ,
    // aksi halde istemci kendi IP'sini uydurup rate limit'i atlatabilir.
    trustProxy: false,
    bodyLimit: 2 * 1024 * 1024,
  });

  /**
   * Bos JSON govdesini kabul et.
   *
   * Fastify varsayilaninda `Content-Type: application/json` gonderilip govde
   * bos birakilirsa 400 doner. DELETE / POST-aksiyon isteklerinde bircok
   * istemci (fetch sarmalayicilari, el terminali scriptleri) basligi
   * otomatik ekler; bu da anlasilmasi zor 400'lere yol acar.
   */
  app.addContentTypeParser(
    'application/json',
    { parseAs: 'string' },
    (_request, body, done) => {
      const raw = typeof body === 'string' ? body.trim() : '';
      if (raw === '') {
        done(null, undefined);
        return;
      }
      try {
        done(null, JSON.parse(raw));
      } catch {
        done(new BadRequestError('Gönderilen JSON çözümlenemedi.'), undefined);
      }
    },
  );

  registerErrorHandler(app);
  await registerSecurity(app);
  await registerAuth(app);

  await app.register(healthRoutes, { prefix: '/api' });
  await app.register(authRoutes, { prefix: '/api/auth' });
  await app.register(departmentRoutes, { prefix: '/api/departments' });
  await app.register(categoryRoutes, { prefix: '/api/categories' });
  await app.register(staffRoutes, { prefix: '/api/staff' });
  await app.register(assetRoutes, { prefix: '/api/assets' });
  await app.register(consumableRoutes, { prefix: '/api/consumables' });
  await app.register(assignmentRoutes, { prefix: '/api/assignments' });
  await app.register(reportRoutes, { prefix: '/api/reports' });

  return app;
}
