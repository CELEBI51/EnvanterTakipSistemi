import { z } from 'zod';

export const ACCESSORY_CATEGORIES = [
  'Mouse',
  'Klavye',
  'Kulaklık',
  'Kamera',
  'Depolama Birimi',
  'Diğer',
];

export const createAccessorySchema = z.object({
  name: z.string({ required_error: 'Aksesuar adı zorunludur.' }).min(1, 'Aksesuar adı boş bırakılamaz.'),
  category: z.enum(ACCESSORY_CATEGORIES, {
    required_error: 'Kategori zorunludur.',
    invalid_type_error: 'Geçersiz kategori seçimi.',
  }),
  brand: z.string().nullable().optional().or(z.literal('')),
  initialQuantity: z
    .number({ required_error: 'Başlangıç stok miktarı zorunludur.' })
    .int('Stok miktarı tam sayı olmalıdır.')
    .positive('Başlangıç stok miktarı 1 veya daha büyük olmalıdır.'),
  minThreshold: z.number().int().min(0).nullable().optional(),
  notes: z.string().nullable().optional().or(z.literal('')),
});

export const restockSchema = z.object({
  quantity: z
    .number({ required_error: 'Miktar zorunludur.' })
    .int('Miktar tam sayı olmalıdır.')
    .positive('Eklenecek miktar 1 veya daha büyük olmalıdır.'),
  note: z.string().nullable().optional().or(z.literal('')),
});

export const markDefectiveSchema = z.object({
  quantity: z
    .number({ required_error: 'Miktar zorunludur.' })
    .int('Miktar tam sayı olmalıdır.')
    .positive('Arızalı olarak ayrılacak miktar 1 veya daha büyük olmalıdır.'),
  note: z.string().nullable().optional().or(z.literal('')),
});
