import { z } from 'zod';

export const MAINTENANCE_TYPES = [
  'Periyodik Bakım',
  'Arıza Onarımı',
  'Parça Değişimi',
  'Temizlik',
  'Yazılım Güncelleme',
  'Diğer',
];

export const ALLOWED_RESULT_STATUSES = ['Hazır', 'Arızalı', 'Kullanım Dışı'];

export const createMaintenanceSchema = z
  .object({
    name: z.string().min(1, 'Bakım adı zorunludur.'),
    hardwareId: z.string().uuid('Geçerli bir varlık ID girilmelidir.'),
    maintenanceType: z.enum(MAINTENANCE_TYPES, {
      errorMap: () => ({ message: 'Geçersiz bakım türü.' }),
    }),
    customTypeNote: z.string().optional(),
    startDate: z.string().refine((val) => !isNaN(Date.parse(val)), {
      message: 'Geçerli bir başlangıç tarihi girilmelidir.',
    }),
    endDate: z
      .string()
      .optional()
      .refine((val) => !val || !isNaN(Date.parse(val)), {
        message: 'Geçerli bir bitiş tarihi girilmelidir.',
      }),
    cost: z.number().nonnegative('Bakım maliyeti 0 veya daha büyük olmalıdır.').optional(),
    notes: z.string().optional(),
  })
  .refine(
    (data) => {
      if (data.maintenanceType === 'Diğer') {
        return !!data.customTypeNote && data.customTypeNote.trim().length > 0;
      }
      return true;
    },
    {
      message: "Bakım türü 'Diğer' seçildiğinde açıklama notu zorunludur.",
      path: ['customTypeNote'],
    }
  )
  .refine(
    (data) => {
      if (data.startDate && data.endDate) {
        return new Date(data.endDate) >= new Date(data.startDate);
      }
      return true;
    },
    {
      message: 'Bitiş tarihi başlangıç tarihinden önce olamaz.',
      path: ['endDate'],
    }
  );

export const addComponentSchema = z.object({
  componentId: z.string().uuid('Geçerli bir bileşen ID girilmelidir.'),
  quantityUsed: z
    .number()
    .int('Kullanılan miktar tam sayı olmalıdır.')
    .positive('Kullanılan miktar 1 veya daha büyük olmalıdır.'),
});

export const completeMaintenanceSchema = z
  .object({
    endDate: z.string().refine((val) => !isNaN(Date.parse(val)), {
      message: 'Geçerli bir bitiş tarihi girilmelidir.',
    }),
    resultStatus: z
      .string()
      .optional()
      .refine((val) => !val || ALLOWED_RESULT_STATUSES.includes(val), {
        message: "Geçersiz sonuç durumu. Sadece 'Hazır', 'Arızalı' veya 'Kullanım Dışı' olabilir.",
      }),
  });
