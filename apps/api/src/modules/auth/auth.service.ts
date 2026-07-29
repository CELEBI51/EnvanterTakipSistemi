import { createHash, randomBytes } from 'node:crypto';
import type { AuthenticatedUser } from '@entanter/shared';
import type { FastifyInstance } from 'fastify';
import { env } from '../../config/env.js';
import { db } from '../../db/client.js';
import { writeAudit } from '../../lib/audit.js';
import { BadRequestError, UnauthorizedError } from '../../lib/errors.js';
import { hashPassword, verifyPassword } from '../../lib/password.js';
import { authRepository } from './auth.repository.js';

/** Ham refresh token ASLA saklanmaz; yalnizca SHA-256 ozeti tutulur. */
function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

function issueRefreshToken(): { token: string; tokenHash: string; expiresAt: Date } {
  const token = randomBytes(48).toString('base64url');
  const expiresAt = new Date(Date.now() + env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);
  return { token, tokenHash: hashToken(token), expiresAt };
}

type UserRow = NonNullable<Awaited<ReturnType<typeof authRepository.findActiveById>>>;

function toPublicUser(user: UserRow): AuthenticatedUser {
  return {
    id: user.id,
    username: user.username,
    fullName: user.fullName,
    email: user.email,
    mustChangePassword: user.mustChangePassword,
  };
}

/** Access token'i uretir ve gercek exp claim'inden kalan sureyi hesaplar. */
function signAccessToken(
  app: FastifyInstance,
  user: UserRow,
): { accessToken: string; expiresIn: number } {
  const accessToken = app.jwt.sign({
    sub: user.id,
    username: user.username,
    mcp: user.mustChangePassword,
  });
  const decoded = app.jwt.decode<{ exp?: number }>(accessToken);
  const expiresIn = decoded?.exp
    ? Math.max(0, decoded.exp - Math.floor(Date.now() / 1000))
    : 900;
  return { accessToken, expiresIn };
}

export interface RequestContext {
  ipAddress: string | null;
  userAgent: string | null;
}

export const authService = {
  /**
   * TEK kimlik dogrulama giris noktasi.
   * Ileride LDAP/AD eklendiginde yalnizca bu fonksiyonun icine ikinci bir
   * saglayici konur; route ve servis katmani degismez.
   */
  async login(
    app: FastifyInstance,
    input: { username: string; password: string },
    ctx: RequestContext,
  ) {
    const user = await authRepository.findActiveByUsername(input.username);

    // Kullanici yoksa da hash hesaplanir (password.ts icinde): yanit suresinden
    // kullanici adinin var olup olmadigi anlasilmasin.
    const passwordOk = await verifyPassword(input.password, user?.passwordHash ?? null);

    if (!user || !passwordOk) {
      // Hangisinin yanlis oldugu SOYLENMEZ.
      throw new UnauthorizedError('Kullanıcı adı veya parola hatalı.');
    }

    const { accessToken, expiresIn } = signAccessToken(app, user);
    const refresh = issueRefreshToken();

    await authRepository.createRefreshToken({
      userId: user.id,
      tokenHash: refresh.tokenHash,
      expiresAt: refresh.expiresAt,
      userAgent: ctx.userAgent,
      ipAddress: ctx.ipAddress,
    });

    await authRepository.touchLastLogin(user.id);
    await writeAudit(db, {
      entityType: 'user',
      entityId: user.id,
      action: 'login',
      actorId: user.id,
      ipAddress: ctx.ipAddress,
    });

    // Firsatci temizlik; ayri bir zamanlanmis gorev gerektirmesin.
    void authRepository.purgeExpired().catch(() => undefined);

    return {
      accessToken,
      expiresIn,
      refreshToken: refresh.token,
      user: toPublicUser(user),
    };
  },

  /**
   * Refresh rotation: kullanilan token ANINDA iptal edilir ve yenisi verilir.
   * Boylece calinan bir token ikinci kez kullanilamaz.
   */
  async refresh(app: FastifyInstance, rawToken: string | undefined, ctx: RequestContext) {
    if (!rawToken) {
      throw new UnauthorizedError('Oturum bulunamadı. Lütfen tekrar giriş yapın.');
    }

    const stored = await authRepository.findUsableRefreshToken(hashToken(rawToken));
    if (!stored) {
      throw new UnauthorizedError('Oturum süresi dolmuş. Lütfen tekrar giriş yapın.');
    }

    const user = await authRepository.findActiveById(stored.userId);
    if (!user) {
      await authRepository.revokeRefreshToken(stored.id);
      throw new UnauthorizedError('Kullanıcı hesabı pasif durumda.');
    }

    await authRepository.revokeRefreshToken(stored.id);

    const { accessToken, expiresIn } = signAccessToken(app, user);
    const refresh = issueRefreshToken();

    await authRepository.createRefreshToken({
      userId: user.id,
      tokenHash: refresh.tokenHash,
      expiresAt: refresh.expiresAt,
      userAgent: ctx.userAgent,
      ipAddress: ctx.ipAddress,
    });

    return {
      accessToken,
      expiresIn,
      refreshToken: refresh.token,
      user: toPublicUser(user),
    };
  },

  async logout(rawToken: string | undefined): Promise<void> {
    if (!rawToken) return;
    await authRepository.revokeByHash(hashToken(rawToken));
  },

  async me(userId: number): Promise<AuthenticatedUser> {
    const user = await authRepository.findActiveById(userId);
    if (!user) throw new UnauthorizedError('Kullanıcı hesabı bulunamadı veya pasif.');
    return toPublicUser(user);
  },

  async changePassword(
    userId: number,
    input: { currentPassword: string; newPassword: string },
    ctx: RequestContext,
  ): Promise<void> {
    const user = await authRepository.findActiveById(userId);
    if (!user) throw new UnauthorizedError();

    const ok = await verifyPassword(input.currentPassword, user.passwordHash);
    if (!ok) throw new BadRequestError('Mevcut parolanız hatalı.');

    if (input.currentPassword === input.newPassword) {
      throw new BadRequestError('Yeni parola mevcut parolayla aynı olamaz.');
    }

    await authRepository.updatePassword(user.id, await hashPassword(input.newPassword));

    // Parola degistiginde TUM oturumlar kapatilir — calinmis bir oturum varsa dusur.
    await authRepository.revokeAllForUser(user.id);

    await writeAudit(db, {
      entityType: 'user',
      entityId: user.id,
      action: 'password_change',
      actorId: user.id,
      ipAddress: ctx.ipAddress,
    });
  },
};
