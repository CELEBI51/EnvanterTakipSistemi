import { z } from 'zod';
import {
  ASSET_STATUS_VALUES,
  ASSET_TAG_PATTERN,
  MANUAL_ASSET_STATUSES,
} from '../constants/index.js';
import { listQuerySchema } from './common.js';
import {
  booleanQuery,
  nullableDate,
  nullableId,
  nullableText,
  requiredText,
} from './helpers.js';

/**
 * Demirbas numarasi. Bos birakilirsa sunucu ENV-YYYY-NNNNN uretir.
 * Girilirse buyuk harfe cevrilir — QR/barkod okumalarinda buyuk-kucuk
 * harf farki yuzunden kayit bulunamamasini engeller.
 */
const assetTagSchema = z.preprocess(
  (v) => {
    if (typeof v !== 'string') return v;
    const trimmed = v.trim().toUpperCase();
    return trimmed === '' ? undefined : trimmed;
  },
  z
    .string()
    .max(32)
    .regex(ASSET_TAG_PATTERN, {
      error: 'Demirbaş numarası harf/rakam ile başlamalı; sadece harf, rakam ve . _ / - içerebilir.',
    })
    .optional(),
);

export const createAssetSchema = z.object({
  assetTag: assetTagSchema,
  serialNo: nullableText(80),
  categoryId: nullableId,
  brand: nullableText(80),
  model: nullableText(120),
  purchaseDate: nullableDate,
  warrantyEnd: nullableDate,
  notes: nullableText(1000),
});
export type CreateAssetInput = z.infer<typeof createAssetSchema>;

export const updateAssetSchema = createAssetSchema.partial();
export type UpdateAssetInput = z.infer<typeof updateAssetSchema>;

/**
 * Durum degisikligi. `in_stock` / `assigned` bu endpoint ile ATANAMAZ —
 * bunlar zimmet ve iade akisinin turevidir; elle degistirilirse acik bir
 * zimmet ortada kalir. Gerekce zorunludur, cunku hurda/kayip kararinin
 * denetim izinde bir dayanagi olmali.
 */
export const changeAssetStatusSchema = z.object({
  status: z.enum(MANUAL_ASSET_STATUSES),
  reason: requiredText(500, 3),
});
export type ChangeAssetStatusInput = z.infer<typeof changeAssetStatusSchema>;

export const assetListQuerySchema = listQuerySchema.extend({
  status: z.enum(ASSET_STATUS_VALUES).optional(),
  categoryId: nullableId,
  /** Su an bu personelde bulunan demirbaslar. */
  staffId: nullableId,
  /** false verilirse hurda/kayıp/kullanım dışı kayıtlar listeden gizlenir. */
  includeInactive: booleanQuery,
});
export type AssetListQuery = z.infer<typeof assetListQuerySchema>;
