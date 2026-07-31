import { z } from 'zod';
import { listQuerySchema } from './common.js';
import {
  booleanQuery,
  nullableId,
  nullableText,
  requiredText,
} from './helpers.js';

export const createConsumableSchema = z.object({
  /** Bos birakilirsa sunucu uretir. */
  sku: nullableText(48),
  name: requiredText(160),
  categoryId: nullableId,
  unit: z.string().trim().min(1).max(16).default('Adet'),
  /** Bir kolideki adet. Toplu girislerde koli sayisi bununla carpilir. */
  packageSize: z.coerce.number().int().positive().max(100_000).default(1),
  /** Bu seviyenin altina dusunce "kritik stok" raporunda gorunur. */
  minStockLevel: z.coerce.number().int().min(0).max(1_000_000).default(0),
  notes: nullableText(1000),
  /** Kayit acilirken yapilacak ilk stok girisi. */
  initialQuantity: z.coerce.number().int().min(0).max(1_000_000).default(0),
});
export type CreateConsumableInput = z.infer<typeof createConsumableSchema>;

export const updateConsumableSchema = createConsumableSchema
  .omit({ initialQuantity: true })
  .partial();
export type UpdateConsumableInput = z.infer<typeof updateConsumableSchema>;

/**
 * Elle yapilan stok hareketi.
 *  - `in`     : stok girisi. Adet (quantity) VEYA koli sayisi (packageCount) verilir.
 *  - `adjust` : sayim duzeltmesi. newQuantity MUTLAK degerdir (delta degil).
 * `out` ve `return` hareketleri yalnizca zimmet/iade akisi tarafindan uretilir,
 * bu endpoint ile olusturulamaz.
 */
export const stockMovementSchema = z
  .discriminatedUnion('movementType', [
    z.object({
      movementType: z.literal('in'),
      quantity: z.coerce.number().int().positive().max(1_000_000).optional(),
      packageCount: z.coerce.number().int().positive().max(100_000).optional(),
      reason: nullableText(500),
    }),
    z.object({
      movementType: z.literal('adjust'),
      newQuantity: z.coerce.number().int().min(0).max(1_000_000),
      reason: requiredText(500, 3),
    }),
  ])
  .refine(
    (v) => v.movementType !== 'in' || (v.quantity != null) !== (v.packageCount != null),
    { error: 'Stok girişinde ya adet ya da koli sayısı belirtin; ikisi birden olamaz.' },
  );
export type StockMovementInput = z.infer<typeof stockMovementSchema>;

export const consumableListQuerySchema = listQuerySchema.extend({
  categoryId: nullableId,
  /** true ise sadece minStockLevel altina dusmus kalemler listelenir. */
  lowStock: booleanQuery,
});
export type ConsumableListQuery = z.infer<typeof consumableListQuerySchema>;
