import { z } from 'zod';

export const createConsumableSchema = z.object({
  name: z.string({ required_error: 'Sarf malzeme adı zorunludur.' }).min(1, 'Sarf malzeme adı boş olamaz.'),
  categoryId: z.string({ required_error: 'Kategori id zorunludur.' }).uuid('Geçersiz kategori id formatı.'),
  initialQuantity: z.number({ required_error: 'Başlangıç stok miktarı zorunludur.' }).int().positive('Başlangıç stok miktarı 1 veya daha büyük olmalıdır.'),
  manufacturer: z.string().optional(),
  supplier: z.string().optional(),
  location: z.string().optional(),
  invoiceNo: z.string().optional(),
  purchaseDate: z.string().optional(),
  purchaseAmount: z.number().min(0, 'Satın alma tutarı 0 veya daha büyük olmalıdır.').optional(),
  notes: z.string().optional(),
});

export const restockSchema = z.object({
  quantity: z.number({ required_error: 'Stok ekleme miktarı zorunludur.' }).int().positive('Eklenecek stok miktarı 1 veya daha büyük olmalıdır.'),
  note: z.string().optional(),
});
