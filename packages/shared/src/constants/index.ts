/**
 * Sistem genelinde kullanilan sabitler ve Turkce etiketleri.
 * Backend enum'lari ile frontend etiketleri buradan tek kaynaktan beslenir.
 */

/* ------------------------------------------------------------------ */
/* Demirbas durumlari                                                  */
/* ------------------------------------------------------------------ */

export const ASSET_STATUS = {
  in_stock: 'Depoda',
  assigned: 'Zimmetli',
  in_repair: 'Tamirde',
  scrapped: 'Hurda',
  lost: 'Kayıp',
  retired: 'Kullanım Dışı',
} as const;

export type AssetStatus = keyof typeof ASSET_STATUS;

export const ASSET_STATUS_VALUES = Object.keys(ASSET_STATUS) as [AssetStatus, ...AssetStatus[]];

/**
 * Yalnizca bu durumdaki bir demirbas zimmetlenebilir.
 * `assigned` durumuna gecis SADECE zimmet akisi tarafindan yapilir.
 */
export const ASSIGNABLE_ASSET_STATUS: AssetStatus = 'in_stock';

/**
 * Status endpoint'i (POST /assets/:id/status) ile ELLE atanabilecek durumlar.
 * `in_stock` ve `assigned` zimmet/iade akisinin turevi oldugu icin elle degistirilemez —
 * aksi halde acik bir zimmet ortada kalir ve gecmis tutarsizlasir.
 */
export const MANUAL_ASSET_STATUSES = ['in_repair', 'scrapped', 'lost', 'retired'] as const;
export type ManualAssetStatus = (typeof MANUAL_ASSET_STATUSES)[number];

/** Demirbas ASLA silinmez; bu durumlar "kullanim disi" anlamina gelir. */
export const INACTIVE_ASSET_STATUSES = ['scrapped', 'lost', 'retired'] as const;

/** Izin verilen durum gecisleri. Bos dizi = donusu olmayan durum. */
export const ASSET_STATUS_TRANSITIONS: Record<AssetStatus, readonly AssetStatus[]> = {
  in_stock: ['assigned', 'in_repair', 'scrapped', 'lost', 'retired'],
  assigned: ['in_stock', 'in_repair', 'scrapped', 'lost'],
  in_repair: ['in_stock', 'scrapped', 'retired'],
  scrapped: [],
  lost: ['in_stock'], // bulunursa envantere geri alinabilir
  retired: ['in_stock'],
};

/* ------------------------------------------------------------------ */
/* Stok hareketleri (sarf / aksesuar)                                  */
/* ------------------------------------------------------------------ */

export const STOCK_MOVEMENT_TYPE = {
  in: 'Stok Girişi',
  out: 'Zimmet Çıkışı',
  adjust: 'Sayım Düzeltmesi',
  return: 'İade Girişi',
} as const;

export type StockMovementType = keyof typeof STOCK_MOVEMENT_TYPE;

export const STOCK_MOVEMENT_TYPE_VALUES = Object.keys(STOCK_MOVEMENT_TYPE) as [
  StockMovementType,
  ...StockMovementType[],
];

/** Elle yapilabilen hareketler. `out` ve `return` zimmet akisi tarafindan uretilir. */
export const MANUAL_STOCK_MOVEMENTS = ['in', 'adjust'] as const;

/* ------------------------------------------------------------------ */
/* Zimmet                                                              */
/* ------------------------------------------------------------------ */

export const ASSIGNMENT_STATUS = {
  open: 'Açık',
  partially_returned: 'Kısmi İade',
  closed: 'Kapalı',
} as const;

export type AssignmentStatus = keyof typeof ASSIGNMENT_STATUS;

export const ASSIGNMENT_STATUS_VALUES = Object.keys(ASSIGNMENT_STATUS) as [
  AssignmentStatus,
  ...AssignmentStatus[],
];

export const RETURN_CONDITION = {
  good: 'Sağlam',
  damaged: 'Hasarlı',
  lost: 'Kayıp',
} as const;

export type ReturnCondition = keyof typeof RETURN_CONDITION;

export const RETURN_CONDITION_VALUES = Object.keys(RETURN_CONDITION) as [
  ReturnCondition,
  ...ReturnCondition[],
];

/* ------------------------------------------------------------------ */
/* Kategori                                                            */
/* ------------------------------------------------------------------ */

export const CATEGORY_KIND = {
  asset: 'Demirbaş',
  consumable: 'Sarf / Aksesuar',
} as const;

export type CategoryKind = keyof typeof CATEGORY_KIND;

export const CATEGORY_KIND_VALUES = Object.keys(CATEGORY_KIND) as [CategoryKind, ...CategoryKind[]];

/* ------------------------------------------------------------------ */
/* Audit                                                               */
/* ------------------------------------------------------------------ */

export const AUDIT_ACTION = {
  create: 'Oluşturma',
  update: 'Güncelleme',
  soft_delete: 'Kayıt Pasifleştirme',
  restore: 'Kayıt Geri Alma',
  assign: 'Zimmet Verme',
  return: 'İade Alma',
  status_change: 'Durum Değişikliği',
  stock_movement: 'Stok Hareketi',
  login: 'Giriş',
  password_change: 'Parola Değişikliği',
} as const;

export type AuditAction = keyof typeof AUDIT_ACTION;

/* ------------------------------------------------------------------ */
/* Formatlar                                                           */
/* ------------------------------------------------------------------ */

/**
 * Demirbas etiketi. Yeni kayitlarda ENV-YYYY-NNNNN uretilir, ancak
 * mevcut sistemden aktarilan eski etiketler de kabul edilebilsin diye
 * desen bilerek gevsek tutuldu (QR/barkod icerigi bu deger olacak).
 */
export const ASSET_TAG_PATTERN = /^[A-Z0-9][A-Z0-9._/-]{1,31}$/;
export const ASSET_TAG_PREFIX = 'ENV';

/** Zimmet fis numarasi: ZM-YYYY-NNNNN */
export const ASSIGNMENT_NO_PREFIX = 'ZM';

/** Sunum katmaninda kullanilacak saat dilimi. Veritabani ve Node UTC calisir. */
export const DISPLAY_TIME_ZONE = 'Europe/Istanbul';
