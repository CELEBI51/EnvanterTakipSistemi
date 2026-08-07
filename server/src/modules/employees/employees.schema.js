import { z } from 'zod';

export const createEmployeeSchema = z.object({
  fullName: z.string().min(1, 'Personel adı soyadı zorunludur.').trim(),
  tcNo: z.string().regex(/^\d{11}$/, 'TC Kimlik Numarası 11 haneli rakamlardan oluşmalıdır.'),
  unitId: z.string().uuid('Geçerli bir Birim (Unit) seçiniz.'),
  phone: z.string().optional().nullable(),
  email: z
    .string()
    .email('Geçerli bir e-posta adresi girilmelidir.')
    .optional()
    .or(z.literal(''))
    .nullable(),
});
