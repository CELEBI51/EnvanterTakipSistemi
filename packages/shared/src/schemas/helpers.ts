import { z } from 'zod';

/**
 * Formlardan gelen bos string'leri null'a cevirir.
 * HTML input'lari temizlenince "" gonderir; veritabaninda bunun karsiligi NULL olmali.
 */
const blankToNull = (v: unknown): unknown =>
  typeof v === 'string' && v.trim() === '' ? null : v;

/** Zorunlu metin alani. */
export const requiredText = (max: number, min = 1) => z.string().trim().min(min).max(max);

/** Opsiyonel metin alani; "" -> null. */
export const nullableText = (max: number) =>
  z.preprocess(blankToNull, z.string().trim().max(max).nullable().optional());

/** Opsiyonel e-posta; "" -> null. */
export const nullableEmail = z.preprocess(blankToNull, z.email().nullable().optional());

/** Opsiyonel tarih; "" -> null. Query string ve JSON'dan gelen ISO metinleri kabul eder. */
export const nullableDate = z.preprocess(blankToNull, z.coerce.date().nullable().optional());

/** Pozitif tamsayi kimlik (route param / query string icin coerce'lu). */
export const idSchema = z.coerce.number().int().positive();

/** Opsiyonel yabanci anahtar; "" -> null. */
export const nullableId = z.preprocess(
  blankToNull,
  z.coerce.number().int().positive().nullable().optional(),
);

/** Query string'den gelen "true"/"false"/"1"/"0" degerlerini boolean'a cevirir. */
export const booleanQuery = z.preprocess((v) => {
  if (typeof v === 'boolean') return v;
  if (v === 'true' || v === '1') return true;
  if (v === 'false' || v === '0') return false;
  return v;
}, z.boolean().optional());
