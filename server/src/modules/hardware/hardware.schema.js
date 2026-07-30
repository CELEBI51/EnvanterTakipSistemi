import { z } from 'zod';

export const ALLOWED_CATEGORIES = [
  'Desktop',
  'Laptop',
  'Yazıcı',
  'Mouse',
  'Klavye',
  'Kulaklık',
  'Monitör',
  'Depolama Birimi',
  'Kamera',
  'Diğer',
];

export const ALLOWED_STATUSES = ['Hazir', 'Kullanimda', 'Arizali', 'Serviste', 'KullanimDisi'];

export const createHardwareSchema = z.object({
  category: z.enum(ALLOWED_CATEGORIES, {
    errorMap: () => ({ message: 'Geçersiz kategori seçimi.' }),
  }),
  brand: z.string().min(1, 'Marka adı zorunludur.'),
  model: z.string().min(1, 'Model adı zorunludur.'),
  serial_no: z.string().optional().default(''),
  mode: z.enum(['new', 'existing'], {
    errorMap: () => ({ message: 'Geçersiz mod seçimi (new veya existing).' }),
  }),
  demirbas_no: z.string().optional(),
  specs: z
    .object({
      cpu: z.string().optional(),
      ram: z.string().optional(),
      gpu: z.string().optional(),
      dvd: z.boolean().optional(),
    })
    .optional(),
}).refine(
  (data) => {
    if (data.mode === 'existing' && (!data.demirbas_no || data.demirbas_no.trim() === '')) {
      return false;
    }
    return true;
  },
  {
    message: 'Mevcut ürün modunda Demirbaş Numarası girilmesi zorunludur.',
    path: ['demirbas_no'],
  }
);

export const updateHardwareSchema = z.object({
  category: z.enum(ALLOWED_CATEGORIES).optional(),
  brand: z.string().min(1).optional(),
  model: z.string().min(1).optional(),
  serial_no: z.string().optional(),
  status: z.enum(ALLOWED_STATUSES).optional(),
  specs: z
    .object({
      cpu: z.string().optional(),
      ram: z.string().optional(),
      gpu: z.string().optional(),
      dvd: z.boolean().optional(),
    })
    .optional(),
});
