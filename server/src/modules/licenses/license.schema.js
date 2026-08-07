import { z } from 'zod';

const optionalString = z.string().nullable().optional().or(z.literal(''));

const optionalPositiveAmount = z
  .union([z.number().positive('Fatura tutarı pozitif sayı olmalıdır.'), z.string()])
  .nullable()
  .optional()
  .or(z.literal(''))
  .transform((val) => {
    if (val === '' || val === null || val === undefined) return null;
    const num = Number(val);
    return isNaN(num) ? null : num;
  })
  .refine((val) => val === null || val > 0, {
    message: 'Fatura tutarı pozitif sayı olmalıdır.',
  });

export const PAYMENT_TYPES = ['KREDI_KARTI', 'NAKIT', 'VADELI'];
export const LICENSE_STATUSES = ['AKTIF', 'YENILENDI', 'YENILENMEDI', 'YENILENMEYECEK', 'IPTAL_EDILDI'];

export const createLicenseSchema = z.object({
  unitId: z.string().uuid('Geçerli bir birim seçilmelidir.'),
  brand: z.string({ required_error: 'Marka alanı zorunludur.' }).min(1, 'Marka alanı boş bırakılamaz.'),
  productInfo: z.string({ required_error: 'Ürün bilgisi zorunludur.' }).min(1, 'Ürün bilgisi boş bırakılamaz.'),
  licenseKey: optionalString,
  startDate: z.string({ required_error: 'Başlangıç tarihi zorunludur.' }).refine((val) => !isNaN(Date.parse(val)), {
    message: 'Geçerli bir başlangıç tarihi girilmelidir.',
  }),
  endDate: z.string({ required_error: 'Bitiş tarihi zorunludur.' }).refine((val) => !isNaN(Date.parse(val)), {
    message: 'Geçerli bir bitiş tarihi girilmelidir.',
  }),
  paymentType: z.enum(PAYMENT_TYPES, {
    errorMap: () => ({ message: "Ödeme tipi 'KREDI_KARTI', 'NAKIT' veya 'VADELI' olmalıdır." }),
  }),
  invoiceNumber: optionalString,
  invoiceAmount: optionalPositiveAmount,
  notes: optionalString,
});

export const updateLicenseSchema = z.object({
  unitId: z.string().uuid().optional(),
  brand: z.string().min(1).optional(),
  productInfo: z.string().min(1).optional(),
  licenseKey: optionalString,
  startDate: z.string().optional().refine((val) => !val || !isNaN(Date.parse(val)), {
    message: 'Geçerli bir başlangıç tarihi girilmelidir.',
  }),
  endDate: z.string().optional().refine((val) => !val || !isNaN(Date.parse(val)), {
    message: 'Geçerli bir bitiş tarihi girilmelidir.',
  }),
  paymentType: z.enum(PAYMENT_TYPES).optional(),
  invoiceNumber: optionalString,
  invoiceAmount: optionalPositiveAmount,
  notes: optionalString,
});

export const updateLicenseStatusSchema = z
  .object({
    status: z.enum(['YENILENDI', 'IPTAL_EDILDI'], {
      errorMap: () => ({ message: "Durum güncellerken sadece 'YENILENDI' veya 'IPTAL_EDILDI' kabul edilir." }),
    }),
    newEndDate: z.string().optional().refine((val) => !val || !isNaN(Date.parse(val)), {
      message: 'Geçerli bir yeni bitiş tarihi girilmelidir.',
    }),
  })
  .superRefine((data, ctx) => {
    if (data.status === 'YENILENDI') {
      if (!data.newEndDate || data.newEndDate.trim() === '') {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Lisans 'YENILENDI' olarak işaretlenirken 'newEndDate' (yeni bitiş tarihi) zorunludur.",
          path: ['newEndDate'],
        });
      }
    }
  });
