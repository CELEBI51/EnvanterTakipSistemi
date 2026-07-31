import { z } from 'zod';
import { ASSIGNMENT_STATUS_VALUES, RETURN_CONDITION_VALUES } from '../constants/index.js';
import { listQuerySchema } from './common.js';
import { idSchema, nullableDate, nullableId, nullableText } from './helpers.js';

/**
 * Zimmet satiri. Veritabanindaki `chk_item_kind` CHECK constraint'inin
 * API tarafindaki karsiligi: satir ya demirbas ya sarf olur, ikisi birden asla.
 */
export const assignmentItemInputSchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('asset'),
    assetId: idSchema,
  }),
  z.object({
    kind: z.literal('consumable'),
    consumableId: idSchema,
    quantity: z.coerce.number().int().positive().max(100_000),
  }),
]);
export type AssignmentItemInput = z.infer<typeof assignmentItemInputSchema>;

export const createAssignmentSchema = z
  .object({
    staffId: idSchema,
    /** Bina / hat / oda gibi serbest konum bilgisi. */
    locationNote: nullableText(160),
    notes: nullableText(1000),
    /** Bos birakilirsa sunucu saati kullanilir (geriye donuk kayit icin acik). */
    assignedAt: nullableDate,
    items: z
      .array(assignmentItemInputSchema)
      .min(1, { error: 'En az bir ürün veya aksesuar seçilmelidir.' })
      .max(100),
  })
  .refine(
    (v) => {
      const assetIds = v.items.filter((i) => i.kind === 'asset').map((i) => i.assetId);
      return new Set(assetIds).size === assetIds.length;
    },
    { error: 'Aynı demirbaş listede birden fazla kez yer alamaz.' },
  )
  .refine(
    (v) => {
      const ids = v.items.filter((i) => i.kind === 'consumable').map((i) => i.consumableId);
      return new Set(ids).size === ids.length;
    },
    { error: 'Aynı aksesuar listede birden fazla satırda olamaz; adedi tek satırda toplayın.' },
  );
export type CreateAssignmentInput = z.infer<typeof createAssignmentSchema>;

export const returnAssignmentSchema = z.object({
  returnedAt: nullableDate,
  items: z
    .array(
      z.object({
        itemId: idSchema,
        /**
         * Sarf malzemede kismi iade adedi. Bos birakilirsa satirda kalan
         * tum adet iade edilmis sayilir. Demirbasta her zaman 1'dir.
         */
        quantity: z.coerce.number().int().positive().max(100_000).optional(),
        condition: z.enum(RETURN_CONDITION_VALUES).default('good'),
        notes: nullableText(500),
      }),
    )
    .min(1, { error: 'İade edilecek en az bir satır seçilmelidir.' }),
});
export type ReturnAssignmentInput = z.infer<typeof returnAssignmentSchema>;

export const assignmentListQuerySchema = listQuerySchema.extend({
  staffId: nullableId,
  departmentId: nullableId,
  status: z.enum(ASSIGNMENT_STATUS_VALUES).optional(),
  from: nullableDate,
  to: nullableDate,
});
export type AssignmentListQuery = z.infer<typeof assignmentListQuerySchema>;
