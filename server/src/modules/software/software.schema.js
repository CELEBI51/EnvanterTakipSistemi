import { z } from 'zod';

export const createSoftwareSchema = z
  .object({
    name: z.string({ required_error: 'Yazılım adı zorunludur.' }).min(1, 'Yazılım adı boş bırakılamaz.'),
    license_key: z
      .string({ required_error: 'Lisans anahtarı zorunludur.' })
      .min(1, 'Lisans anahtarı boş bırakılamaz.'),
    start_date: z.string({ required_error: 'Başlangıç tarihi zorunludur.' }).min(1, 'Başlangıç tarihi zorunludur.'),
    end_date: z.string({ required_error: 'Bitiş tarihi zorunludur.' }).min(1, 'Bitiş tarihi zorunludur.'),
    assigned_hardware_id: z.string().uuid('Geçersiz donanım Kimliği.').nullable().optional().or(z.literal('')),
    notes: z.string().nullable().optional(),
  })
  .refine(
    (data) => {
      const start = new Date(data.start_date);
      const end = new Date(data.end_date);
      return !isNaN(start.getTime()) && !isNaN(end.getTime()) && end >= start;
    },
    {
      message: 'Bitiş tarihi başlangıç tarihinden sonra veya aynı gün olmalıdır.',
      path: ['end_date'],
    }
  );

export const updateSoftwareSchema = z
  .object({
    name: z.string().min(1, 'Yazılım adı boş bırakılamaz.').optional(),
    license_key: z.string().min(1, 'Lisans anahtarı boş bırakılamaz.').optional(),
    start_date: z.string().optional(),
    end_date: z.string().optional(),
    assigned_hardware_id: z.string().uuid('Geçersiz donanım Kimliği.').nullable().optional().or(z.literal('')),
    notes: z.string().nullable().optional(),
  })
  .refine(
    (data) => {
      if (data.start_date && data.end_date) {
        const start = new Date(data.start_date);
        const end = new Date(data.end_date);
        return !isNaN(start.getTime()) && !isNaN(end.getTime()) && end >= start;
      }
      return true;
    },
    {
      message: 'Bitiş tarihi başlangıç tarihinden sonra veya aynı gün olmalıdır.',
      path: ['end_date'],
    }
  );
