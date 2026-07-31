import { changePasswordSchema, loginSchema } from '@entanter/shared';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { env } from '../../config/env.js';
import { REFRESH_COOKIE_NAME } from '../../plugins/auth.js';
import { authService, type RequestContext } from './auth.service.js';

/**
 * Refresh cookie ayarlari.
 *
 * - httpOnly: JavaScript erisemez (XSS ile calinamaz).
 * - path: yalnizca /api/auth altina gonderilir, diger isteklerde tasinmaz.
 * - secure: intranet HTTP oldugu icin USE_HTTPS=false iken kapali olmak ZORUNDA;
 *   aksi halde tarayici cookie'yi hic gondermez ve oturum hic acilmaz.
 * - sameSite 'lax' yeterli: API ve web farkli PORT'ta ama ayni HOST'ta,
 *   cookie'ler port'a duyarli olmadigi icin sorunsuz tasinir.
 */
function refreshCookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: env.USE_HTTPS,
    path: '/api/auth',
    maxAge: env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60,
  };
}

function contextOf(request: FastifyRequest): RequestContext {
  return {
    ipAddress: request.ip,
    userAgent: request.headers['user-agent'] ?? null,
  };
}

export async function authRoutes(app: FastifyInstance): Promise<void> {
  /** Kaba kuvvet denemelerine karsi genel limitten cok daha siki. */
  const loginRateLimit = {
    config: { rateLimit: { max: 10, timeWindow: '5 minutes' } },
  };

  app.post('/login', loginRateLimit, async (request, reply: FastifyReply) => {
    const input = loginSchema.parse(request.body);
    const result = await authService.login(app, input, contextOf(request));

    reply.setCookie(REFRESH_COOKIE_NAME, result.refreshToken, refreshCookieOptions());

    return {
      accessToken: result.accessToken,
      expiresIn: result.expiresIn,
      user: result.user,
    };
  });

  app.post('/refresh', async (request, reply: FastifyReply) => {
    const raw = request.cookies[REFRESH_COOKIE_NAME];
    const result = await authService.refresh(app, raw, contextOf(request));

    reply.setCookie(REFRESH_COOKIE_NAME, result.refreshToken, refreshCookieOptions());

    return {
      accessToken: result.accessToken,
      expiresIn: result.expiresIn,
      user: result.user,
    };
  });

  app.post('/logout', async (request, reply: FastifyReply) => {
    await authService.logout(request.cookies[REFRESH_COOKIE_NAME]);
    reply.clearCookie(REFRESH_COOKIE_NAME, { path: '/api/auth' });
    return { success: true };
  });

  app.get('/me', { preHandler: app.authenticate }, async (request) => {
    return authService.me(request.user.sub);
  });

  app.post('/change-password', { preHandler: app.authenticate }, async (request, reply) => {
    const input = changePasswordSchema.parse(request.body);
    await authService.changePassword(request.user.sub, input, contextOf(request));

    // Tum oturumlar kapatildi; bu istemcinin cookie'si de gecersiz.
    reply.clearCookie(REFRESH_COOKIE_NAME, { path: '/api/auth' });

    return {
      success: true,
      message: 'Parolanız değiştirildi. Lütfen yeni parolanızla tekrar giriş yapın.',
    };
  });
}
