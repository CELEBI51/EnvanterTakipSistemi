import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

/**
 * Parola hash'leme — node:crypto scrypt.
 *
 * bcrypt/argon2 yerine bilincli tercih: ikisi de native derleme veya
 * prebuilt binary indirme ister. Bu sistem internetsiz bir sunucuya
 * node_modules kopyalanarak kuruldugu icin native bagimlilik en olasi
 * kirilma noktasidir. scrypt Node'un icinde gelir, sifir bagimlilik.
 */

const scrypt = promisify(scryptCallback) as (
  password: string,
  salt: Buffer,
  keylen: number,
  options: { N: number; r: number; p: number; maxmem: number },
) => Promise<Buffer>;

/** N=65536, r=8, p=1 -> ~64 MB bellek, ~100 ms. Onlarca kullanicilik panel icin fazlasiyla yeterli. */
const PARAMS = { N: 65_536, r: 8, p: 1 } as const;
/** scrypt varsayilan maxmem 32 MB'dir; N=65536 icin acikca yukseltilmeli. */
const MAX_MEM = 192 * 1024 * 1024;
const KEY_LENGTH = 64;
const SALT_LENGTH = 16;

/**
 * Uretilen bicim: scrypt$N$r$p$<salt_b64>$<hash_b64>
 * Parametreler hash'in icinde tasindigi icin ileride maliyet artirilsa
 * bile ESKI hash'ler dogrulanmaya devam eder.
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SALT_LENGTH);
  const derived = await scrypt(password.normalize('NFKC'), salt, KEY_LENGTH, {
    ...PARAMS,
    maxmem: MAX_MEM,
  });
  return [
    'scrypt',
    PARAMS.N,
    PARAMS.r,
    PARAMS.p,
    salt.toString('base64'),
    derived.toString('base64'),
  ].join('$');
}

export async function verifyPassword(password: string, stored: string | null): Promise<boolean> {
  // Kullanici yoksa veya LDAP kullanicisiysa (passwordHash NULL) yine de
  // sahte bir hesaplama yapilir ki yanit suresi kullanici varligini sizdirmasin.
  if (!stored) {
    await hashPassword(password);
    return false;
  }

  const parts = stored.split('$');
  if (parts.length !== 6 || parts[0] !== 'scrypt') return false;

  const N = Number(parts[1]);
  const r = Number(parts[2]);
  const p = Number(parts[3]);
  const salt = Buffer.from(parts[4] ?? '', 'base64');
  const expected = Buffer.from(parts[5] ?? '', 'base64');

  if (!Number.isInteger(N) || !Number.isInteger(r) || !Number.isInteger(p)) return false;
  if (salt.length === 0 || expected.length === 0) return false;

  let derived: Buffer;
  try {
    derived = await scrypt(password.normalize('NFKC'), salt, expected.length, {
      N,
      r,
      p,
      maxmem: MAX_MEM,
    });
  } catch {
    return false;
  }

  if (derived.length !== expected.length) return false;
  return timingSafeEqual(derived, expected);
}

/** Ilk kurulumda parola verilmediginde kullanilacak okunabilir gecici parola. */
export function generateInitialPassword(): string {
  // Karisabilecek karakterler (0/O, 1/l/I) bilincli olarak disarida birakildi.
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
  const bytes = randomBytes(20);
  let out = '';
  for (const byte of bytes) {
    out += alphabet[byte % alphabet.length];
  }
  // Parola politikasi en az bir rakam istiyor; garanti altina al.
  return `${out}7`;
}
