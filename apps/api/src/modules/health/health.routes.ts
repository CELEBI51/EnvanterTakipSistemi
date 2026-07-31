import type { FastifyInstance } from 'fastify';
import { checkDatabase } from '../../db/client.js';

/**
 * Izleme ve deploy dogrulamasi icin. Kimlik dogrulama GEREKTIRMEZ —
 * kurulum sirasinda "servis ayakta mi, veritabanina ulasiyor mu"
 * sorusu giris yapmadan cevaplanabilmeli.
 */
export async function healthRoutes(app: FastifyInstance): Promise<void> {
  app.get('/health', async (_request, reply) => {
    const startedAt = Date.now();

    try {
      await checkDatabase();
      return {
        status: 'ok',
        database: 'up',
        latencyMs: Date.now() - startedAt,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      // Servis ayakta ama veritabani yok: 503 doner ki izleme fark etsin.
      app.log.error({ err: error }, 'Saglik kontrolu: veritabanina ulasilamiyor');
      return reply.status(503).send({
        status: 'degraded',
        database: 'down',
        message: 'Veritabanına bağlanılamıyor.',
        timestamp: new Date().toISOString(),
      });
    }
  });
}
