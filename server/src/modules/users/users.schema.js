import { z } from 'zod';

export const createUserSchema = z.object({
  fullName: z
    .string()
    .min(2, 'Ad soyad en az 2 karakter olmalıdır.')
    .max(100, 'Ad soyad en fazla 100 karakter olabilir.'),
  email: z
    .string()
    .email('Geçerli bir e-posta adresi giriniz.'),
  role: z.enum(['admin', 'it_staff', 'viewer'], {
    errorMap: () => ({ message: 'Geçersiz rol seçimi. (admin, it_staff veya viewer)' }),
  }),
});

export const updateUserRoleSchema = z.object({
  role: z.enum(['admin', 'it_staff', 'viewer'], {
    errorMap: () => ({ message: 'Geçersiz rol seçimi. (admin, it_staff veya viewer)' }),
  }),
});
