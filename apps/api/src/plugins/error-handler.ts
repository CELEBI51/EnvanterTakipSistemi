import type { FastifyError, FastifyInstance } from 'fastify';
import { ZodError, z } from 'zod';
import { isProduction } from '../config/env.js';
import { AppError, mapDatabaseError } from '../lib/errors.js';

/**
 * Tek hata cikisi. Tum hatalar { error: { code, message, details? } }
 * bicimine cevrilir; frontend tek bir yerde ele alir.
 */
export function registerErrorHandler(app: FastifyInstance): void {
  app.setNotFoundHandler((request, reply) => {
    void reply.status(404).send({
      error: {
        code: 'NOT_FOUND',
        message: `Uç nokta bulunamadı: ${request.method} ${request.url}`,
      },
    });
  });

  app.setErrorHandler((error: FastifyError, request, reply) => {
    // 1) Zod dogrulama hatasi -> alan bazli detay
    if (error instanceof ZodError) {
      const flat = z.flattenError(error);
      return reply.status(400).send({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Gönderilen veri geçersiz.',
          details: {
            fields: flat.fieldErrors,
            form: flat.formErrors,
          },
        },
      });
    }

    // 2) Bilincli firlatilan uygulama hatasi
    if (error instanceof AppError) {
      return reply.status(error.statusCode).send({
        error: {
          code: error.code,
          message: error.message,
          ...(error.details === undefined ? {} : { details: error.details }),
        },
      });
    }

    // 3) Veritabani kisit ihlali -> anlamli Turkce mesaj
    //    (UNIQUE/CHECK kisitlari veri butunlugunun ASIL garantisidir)
    const mapped = mapDatabaseError(error);
    if (mapped) {
      request.log.warn(
        { err: error, constraint: mapped.details },
        'Veritabani kisit ihlali',
      );
      return reply.status(mapped.statusCode).send({
        error: {
          code: mapped.code,
          message: mapped.message,
          ...(mapped.details === undefined ? {} : { details: mapped.details }),
        },
      });
    }

    // 4) Fastify'in kendi 4xx hatalari (bozuk JSON, rate limit, vb.)
    const statusCode = error.statusCode ?? 500;
    if (statusCode < 500) {
      return reply.status(statusCode).send({
        error: {
          code: error.code ?? 'BAD_REQUEST',
          message: error.message,
        },
      });
    }

    // 5) Beklenmeyen hata: detay LOGA yazilir, istemciye SIZDIRILMAZ.
    request.log.error({ err: error }, 'Beklenmeyen sunucu hatasi');
    return reply.status(500).send({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Sunucuda beklenmeyen bir hata oluştu.',
        ...(isProduction ? {} : { details: error.message }),
      },
    });
  });
}
