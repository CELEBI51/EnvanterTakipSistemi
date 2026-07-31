import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import type { FastifyInstance } from 'fastify';
import { corsOrigins } from '../config/env.js';

export async function registerSecurity(app: FastifyInstance): Promise<void> {
  await app.register(helmet, {
    // API yalnizca JSON dondurur; CSP frontend tarafinda anlamli.
    contentSecurityPolicy: false,
    /**
     * HSTS KAPALI OLMALI.
     * Intranet HTTP uzerinden calisiyor; HSTS gonderilirse tarayici bu host'a
     * bir daha HTTP ile baglanmayi reddeder ve sistem tamamen erisilemez hale gelir.
     */
    hsts: false,
  });

  await app.register(cors, {
    /**
     * Frontend ayri portta calistigi icin tam eslesmeli whitelist.
     * credentials: true ile wildcard (*) KULLANILAMAZ — tarayici reddeder.
     */
    origin: (origin, callback) => {
      // Origin basligi yoksa (curl, sunucu ici istek, ayni origin) izin ver.
      if (!origin) {
        callback(null, true);
        return;
      }
      if (corsOrigins.includes(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error(`CORS: izin verilmeyen origin (${origin})`), false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
  });

  /**
   * Kaba kuvvet ve yanlislikla olusan dongulere karsi. Tek fabrika
   * sunucusunda bellek ici sayac yeterli; harici store gerekmiyor.
   * Login icin daha siki bir limit auth modulunde ayrica tanimlanir.
   */
  await app.register(rateLimit, {
    global: true,
    max: 300,
    timeWindow: '1 minute',
    errorResponseBuilder: (_request, context) => ({
      statusCode: 429,
      code: 'RATE_LIMITED',
      error: 'Too Many Requests',
      message: `Çok fazla istek gönderildi. ${context.after} sonra tekrar deneyin.`,
    }),
  });
}
