import { z } from 'zod';

const optionalString = z.string().nullable().optional().or(z.literal(''));
const optionalPositiveAmount = z
  .union([z.number().positive('Satın alım tutarı pozitif sayı olmalıdır.'), z.string()])
  .nullable()
  .optional()
  .or(z.literal(''))
  .transform((val) => {
    if (val === '' || val === null || val === undefined) return null;
    const num = Number(val);
    return isNaN(num) ? null : num;
  })
  .refine((val) => val === null || val > 0, {
    message: 'Satın alım tutarı pozitif sayı olmalıdır.',
  });

export const createAccessorySchema = z.object({
  name: z.string({ required_error: 'Aksesuar adı zorunludur.' }).min(1, 'Aksesuar adı boş bırakılamaz.'),
  category: z.string().optional(),
  categoryId: z.string().uuid().optional(),
  brand: optionalString,
  supplier: optionalString,
  invoice_no: optionalString,
  invoiceNo: optionalString,
  purchase_date: optionalString,
  purchaseDate: optionalString,
  purchase_amount: optionalPositiveAmount,
  purchaseAmount: optionalPositiveAmount,
  initialQuantity: z
    .number({ required_error: 'Başlangıç stok miktarı zorunludur.' })
    .int('Stok miktarı tam sayı olmalıdır.')
    .positive('Başlangıç stok miktarı 1 veya daha büyük olmalıdır.'),
  minThreshold: z.number().int().min(0).nullable().optional(),
  notes: optionalString,
});

export const restockSchema = z.object({
  quantity: z
    .number({ required_error: 'Miktar zorunludur.' })
    .int('Miktar tam sayı olmalıdır.')
    .positive('Eklenecek miktar 1 veya daha büyük olmalıdır.'),
  note: optionalString,
});

export const markDefectiveSchema = z.object({
  quantity: z
    .number({ required_error: 'Miktar zorunludur.' })
    .int('Miktar tam sayı olmalıdır.')
    .positive('Arızalı olarak ayrılacak miktar 1 veya daha büyük olmalıdır.'),
  note: optionalString,
});
