import { and, eq, isNull, lt, sql } from 'drizzle-orm';
import { db } from '../../db/client.js';
import { authorizedUsers, refreshTokens } from '../../db/schema/index.js';

export const authRepository = {
  async findActiveByUsername(username: string) {
    const rows = await db
      .select()
      .from(authorizedUsers)
      .where(
        and(
          eq(authorizedUsers.username, username),
          eq(authorizedUsers.isActive, true),
          isNull(authorizedUsers.deletedAt),
        ),
      )
      .limit(1);
    return rows[0] ?? null;
  },

  async findActiveById(id: number) {
    const rows = await db
      .select()
      .from(authorizedUsers)
      .where(
        and(
          eq(authorizedUsers.id, id),
          eq(authorizedUsers.isActive, true),
          isNull(authorizedUsers.deletedAt),
        ),
      )
      .limit(1);
    return rows[0] ?? null;
  },

  async touchLastLogin(id: number): Promise<void> {
    await db
      .update(authorizedUsers)
      .set({ lastLoginAt: new Date() })
      .where(eq(authorizedUsers.id, id));
  },

  async updatePassword(id: number, passwordHash: string): Promise<void> {
    await db
      .update(authorizedUsers)
      .set({ passwordHash, mustChangePassword: false, updatedAt: new Date() })
      .where(eq(authorizedUsers.id, id));
  },

  /* ------------------------- refresh token ------------------------- */

  async createRefreshToken(input: {
    userId: number;
    tokenHash: string;
    expiresAt: Date;
    userAgent: string | null;
    ipAddress: string | null;
  }): Promise<void> {
    await db.insert(refreshTokens).values(input);
  },

  async findUsableRefreshToken(tokenHash: string) {
    const rows = await db
      .select()
      .from(refreshTokens)
      .where(
        and(
          eq(refreshTokens.tokenHash, tokenHash),
          isNull(refreshTokens.revokedAt),
          sql`${refreshTokens.expiresAt} > now()`,
        ),
      )
      .limit(1);
    return rows[0] ?? null;
  },

  async revokeRefreshToken(id: number): Promise<void> {
    await db
      .update(refreshTokens)
      .set({ revokedAt: new Date() })
      .where(and(eq(refreshTokens.id, id), isNull(refreshTokens.revokedAt)));
  },

  async revokeByHash(tokenHash: string): Promise<void> {
    await db
      .update(refreshTokens)
      .set({ revokedAt: new Date() })
      .where(and(eq(refreshTokens.tokenHash, tokenHash), isNull(refreshTokens.revokedAt)));
  },

  /** Parola degisiminde tum oturumlar kapatilir. */
  async revokeAllForUser(userId: number): Promise<void> {
    await db
      .update(refreshTokens)
      .set({ revokedAt: new Date() })
      .where(and(eq(refreshTokens.userId, userId), isNull(refreshTokens.revokedAt)));
  },

  /** Suresi gecmis kayitlari temizler (login sirasinda firsatci calisir). */
  async purgeExpired(): Promise<void> {
    await db.delete(refreshTokens).where(lt(refreshTokens.expiresAt, new Date()));
  },
};
