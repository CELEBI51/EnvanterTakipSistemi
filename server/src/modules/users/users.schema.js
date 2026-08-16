import { z } from 'zod';

export const createUserSchema = z.object({
  fullName: z
    .string()
    .min(2, 'Ad soyad en az 2 karakter olmalıdır.')
    .max(100, 'Ad soyad en fazla 100 karakter olabilir.'),
  email: z
    .string()
    .email('Geçerli bir e-posta adresi giriniz.'),
  role: z.enum(['admin', 'it_staff'], {
    errorMap: () => ({ message: 'Geçersiz rol seçimi. (admin veya it_staff)' }),
  }),
  permissions: z.array(z.string()).optional(),
});

export const updateUserRoleSchema = z.object({
  role: z.enum(['admin', 'it_staff'], {
    errorMap: () => ({ message: 'Geçersiz rol seçimi. (admin veya it_staff)' }),
  }).optional(),
  permissions: z.array(z.string()).optional(),
});

