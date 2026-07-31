import { and, eq, isNull } from 'drizzle-orm';
import { env } from '../config/env.js';
import { generateInitialPassword, hashPassword } from '../lib/password.js';
import { closeDatabase, db } from './client.js';
import { authorizedUsers, categories, departments } from './schema/index.js';

/**
 * Idempotent seed. Birden fazla kez calistirilabilir; var olan kaydi
 * degistirmez, eksik olani ekler. Sunucuda her guncelleme sonrasi
 * calistirilmasi guvenlidir.
 */

const DEFAULT_DEPARTMENTS = [
  { name: 'Bilgi İşlem', code: 'BI' },
  { name: 'Üretim', code: 'URT' },
  { name: 'Kalite Kontrol', code: 'KK' },
  { name: 'Bakım Onarım', code: 'BKM' },
  { name: 'Muhasebe', code: 'MUH' },
  { name: 'İnsan Kaynakları', code: 'IK' },
  { name: 'Satın Alma', code: 'SAT' },
  { name: 'Depo / Lojistik', code: 'DEP' },
  { name: 'İdari İşler', code: 'IDR' },
];

const DEFAULT_CATEGORIES = [
  { name: 'Dizüstü Bilgisayar', kind: 'asset' as const },
  { name: 'Masaüstü Bilgisayar', kind: 'asset' as const },
  { name: 'Monitör', kind: 'asset' as const },
  { name: 'Yazıcı / Tarayıcı', kind: 'asset' as const },
  { name: 'Telefon', kind: 'asset' as const },
  { name: 'El Terminali', kind: 'asset' as const },
  { name: 'Ağ Cihazı', kind: 'asset' as const },
  { name: 'Klavye / Mouse', kind: 'consumable' as const },
  { name: 'Kablo / Adaptör', kind: 'consumable' as const },
  { name: 'Kulaklık', kind: 'consumable' as const },
  { name: 'Toner / Kartuş', kind: 'consumable' as const },
  { name: 'Depolama Medyası', kind: 'consumable' as const },
];

async function seedDepartments(): Promise<number> {
  let created = 0;
  for (const item of DEFAULT_DEPARTMENTS) {
    const existing = await db
      .select({ id: departments.id })
      .from(departments)
      .where(and(eq(departments.name, item.name), isNull(departments.deletedAt)))
      .limit(1);

    if (existing.length === 0) {
      await db.insert(departments).values(item);
      created += 1;
    }
  }
  return created;
}

async function seedCategories(): Promise<number> {
  let created = 0;
  for (const item of DEFAULT_CATEGORIES) {
    const existing = await db
      .select({ id: categories.id })
      .from(categories)
      .where(
        and(
          eq(categories.name, item.name),
          eq(categories.kind, item.kind),
          isNull(categories.deletedAt),
        ),
      )
      .limit(1);

    if (existing.length === 0) {
      await db.insert(categories).values(item);
      created += 1;
    }
  }
  return created;
}

async function seedAdminUser(): Promise<string | null> {
  const existing = await db
    .select({ id: authorizedUsers.id })
    .from(authorizedUsers)
    .where(
      and(
        eq(authorizedUsers.username, env.SEED_ADMIN_USERNAME),
        isNull(authorizedUsers.deletedAt),
      ),
    )
    .limit(1);

  if (existing.length > 0) return null;

  // Parola verilmediyse uret ve ekrana yaz. Sabit varsayilan parola KULLANILMAZ.
  const plainPassword = env.SEED_ADMIN_PASSWORD?.trim()
    ? env.SEED_ADMIN_PASSWORD.trim()
    : generateInitialPassword();

  await db.insert(authorizedUsers).values({
    username: env.SEED_ADMIN_USERNAME,
    passwordHash: await hashPassword(plainPassword),
    fullName: env.SEED_ADMIN_FULLNAME,
    // Ilk giriste parola degistirme zorunlu.
    mustChangePassword: true,
  });

  return plainPassword;
}

try {
  console.log('[seed] Başlıyor...');

  const departmentCount = await seedDepartments();
  console.log(`[seed] Departman: ${departmentCount} yeni kayıt`);

  const categoryCount = await seedCategories();
  console.log(`[seed] Kategori: ${categoryCount} yeni kayıt`);

  const adminPassword = await seedAdminUser();
  if (adminPassword) {
    console.log('');
    console.log('  ==========================================================');
    console.log('   YÖNETİCİ HESABI OLUŞTURULDU');
    console.log(`   Kullanıcı adı : ${env.SEED_ADMIN_USERNAME}`);
    console.log(`   Parola        : ${adminPassword}`);
    console.log('   Bu parola ilk girişte DEĞİŞTİRİLMEK ZORUNDADIR.');
    console.log('   Bu çıktıyı güvenli bir yere not edip ekrandan silin.');
    console.log('  ==========================================================');
    console.log('');
  } else {
    console.log(`[seed] Yönetici hesabı (${env.SEED_ADMIN_USERNAME}) zaten mevcut, dokunulmadı.`);
  }

  console.log('[seed] Tamamlandı.');
} catch (error) {
  console.error('[seed] BAŞARISIZ:', error);
  process.exitCode = 1;
} finally {
  await closeDatabase();
}
