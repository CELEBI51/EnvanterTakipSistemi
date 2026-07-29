import { sql } from 'drizzle-orm';
import {
  bigint,
  boolean,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from 'drizzle-orm/pg-core';

/**
 * Sisteme giris yapan yetkililer (IT / sistem sorumlulari).
 * RBAC YOK — buradaki her kullanici ayni yetkiye sahiptir.
 * Zimmet ALAN personel ayri tablodadir (`staff`), bilincli olarak karistirilmadi:
 * fabrikadaki 800 personelin sisteme girmesi gerekmiyor.
 */
export const authorizedUsers = pgTable(
  'authorized_users',
  {
    id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
    username: varchar('username', { length: 64 }).notNull(),
    /** node:crypto scrypt ile uretilir. LDAP'tan gelen kullanicida NULL olabilir. */
    passwordHash: text('password_hash'),
    fullName: varchar('full_name', { length: 120 }).notNull(),
    email: varchar('email', { length: 160 }),
    isActive: boolean('is_active').notNull().default(true),
    mustChangePassword: boolean('must_change_password').notNull().default(false),
    lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
    /**
     * Ileride LDAP/AD entegrasyonu eklendiginde kimlik kaynagini ayirmak icin.
     * 'local' = parola bu tabloda; 'ldap' = dogrulama dizinden yapilir.
     */
    authSource: varchar('auth_source', { length: 16 }).notNull().default('local'),
    externalRef: varchar('external_ref', { length: 160 }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (t) => [
    uniqueIndex('uq_users_username_active')
      .on(t.username)
      .where(sql`${t.deletedAt} IS NULL`),
  ],
);

/**
 * Refresh token'lar. Ham token ASLA saklanmaz; yalnizca SHA-256 ozeti tutulur.
 * Her yenilemede eski kayit revoke edilip yenisi acilir (rotation).
 */
export const refreshTokens = pgTable(
  'refresh_tokens',
  {
    id: bigint('id', { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
    userId: integer('user_id')
      .notNull()
      .references(() => authorizedUsers.id, { onDelete: 'cascade' }),
    tokenHash: varchar('token_hash', { length: 64 }).notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
    userAgent: varchar('user_agent', { length: 300 }),
    ipAddress: varchar('ip_address', { length: 64 }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('uq_refresh_token_hash').on(t.tokenHash),
    index('idx_refresh_tokens_user').on(t.userId, t.expiresAt),
  ],
);
