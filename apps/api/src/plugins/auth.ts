import cookie from '@fastify/cookie';
import jwt from '@fastify/jwt';
import type { FastifyInstance, FastifyRequest } from 'fastify';
import { env } from '../config/env.js';
import { ForbiddenError, UnauthorizedError } from '../lib/errors.js';

export const REFRESH_COOKIE_NAME = 'entanter_refresh';

export async function registerAuth(app: FastifyInstance): Promise<void> {
  await app.register(cookie);

  await app.register(jwt, {
    secret: env.JWT_ACCESS_SECRET,
    sign: { expiresIn: env.ACCESS_TOKEN_TTL },
  });

  /**
   * Korumali route'larda `{ preHandler: app.authenticate }` olarak kullanilir.
   * RBAC yok — dogrulanmis her kullanici tum islemleri yapabilir.
   */
  app.decorate('authenticate', async (request: FastifyRequest) => {
    try {
      await request.jwtVerify();
    } catch {
      throw new UnauthorizedError(
        'Oturumunuz sona ermiş veya geçersiz. Lütfen tekrar giriş yapın.',
      );
    }

    /**
     * Gecici parola ZORLANIR.
     *
     * Kurulumda uretilen parola konsola yazilir ve bir sure ortalikta kalir.
     * Bayragi yalnizca arayuze birakmak yeterli degil: API dogrudan cagrilarak
     * tum envantere erisilebilirdi. Parola degistirilene kadar /api/auth
     * disindaki her uc nokta kapalidir.
     */
    if (request.user.mcp && !request.url.startsWith('/api/auth')) {
      throw new ForbiddenError(
        'Geçici parolanızı değiştirmeden diğer işlemleri yapamazsınız. Lütfen önce parolanızı güncelleyin.',
      );
    }
  });
}
