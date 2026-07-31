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

export const createHardwareSchema = z
  .object({
    category: z.enum(ALLOWED_CATEGORIES, {
      errorMap: () => ({ message: 'Geçersiz kategori seçimi.' }),
    }),
    brand: z.string({ required_error: 'Marka adı zorunludur.' }).min(1, 'Marka adı zorunludur.'),
    model: z.string().nullable().optional().or(z.literal('')),
    serial_no: z.string().optional().default(''),
    demirbas_no: z
      .string({ required_error: 'Demirbaş numarası zorunludur.' })
      .min(1, 'Demirbaş numarası zorunludur.'),
    warranty_start_date: z.string().nullable().optional().or(z.literal('')),
    warranty_end_date: z.string().nullable().optional().or(z.literal('')),
    warrantyStartDate: z.string().nullable().optional().or(z.literal('')),
    warrantyEndDate: z.string().nullable().optional().or(z.literal('')),
    specs: z
      .object({
        cpu: z.string().optional(),
        ram: z.string().optional(),
        gpu: z.string().optional(),
        dvd: z.boolean().optional(),
      })
      .optional(),
  })
  .refine(
    (data) => {
      const startDateStr = data.warranty_start_date || data.warrantyStartDate;
      const endDateStr = data.warranty_end_date || data.warrantyEndDate;
      if (startDateStr && endDateStr && startDateStr.trim() !== '' && endDateStr.trim() !== '') {
        const start = new Date(startDateStr);
        const end = new Date(endDateStr);
        return !isNaN(start.getTime()) && !isNaN(end.getTime()) && end >= start;
      }
      return true;
    },
    {
      message: 'Garanti bitiş tarihi başlangıç tarihinden sonra veya aynı gün olmalıdır.',
      path: ['warranty_end_date'],
    }
  );

export const updateHardwareSchema = z
  .object({
    category: z.enum(ALLOWED_CATEGORIES).optional(),
    brand: z.string().min(1).optional(),
    model: z.string().nullable().optional().or(z.literal('')),
    serial_no: z.string().optional(),
    status: z.enum(ALLOWED_STATUSES).optional(),
    warranty_start_date: z.string().nullable().optional().or(z.literal('')),
    warranty_end_date: z.string().nullable().optional().or(z.literal('')),
    warrantyStartDate: z.string().nullable().optional().or(z.literal('')),
    warrantyEndDate: z.string().nullable().optional().or(z.literal('')),
    specs: z
      .object({
        cpu: z.string().optional(),
        ram: z.string().optional(),
        gpu: z.string().optional(),
        dvd: z.boolean().optional(),
      })
      .optional(),
  })
  .refine(
    (data) => {
      const startDateStr = data.warranty_start_date || data.warrantyStartDate;
      const endDateStr = data.warranty_end_date || data.warrantyEndDate;
      if (startDateStr && endDateStr && startDateStr.trim() !== '' && endDateStr.trim() !== '') {
        const start = new Date(startDateStr);
        const end = new Date(endDateStr);
        return !isNaN(start.getTime()) && !isNaN(end.getTime()) && end >= start;
      }
      return true;
    },
    {
      message: 'Garanti bitiş tarihi başlangıç tarihinden sonra veya aynı gün olmalıdır.',
      path: ['warranty_end_date'],
    }
  );
