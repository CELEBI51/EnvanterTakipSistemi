import { z } from 'zod';
import { requiredText } from './helpers.js';

export const loginSchema = z.object({
  username: requiredText(64),
  password: z.string().min(1).max(200),
});
export type LoginInput = z.infer<typeof loginSchema>;

/**
 * Parola politikasi. RBAC olmadigi ve bu kullanicilar tum envantere
 * yetkili oldugu icin minimum uzunluk bilinçli olarak yuksek tutuldu.
 */
export const passwordSchema = z
  .string()
  .min(10, { error: 'Parola en az 10 karakter olmalıdır.' })
  .max(200)
  .refine((v) => /\p{L}/u.test(v), { error: 'Parola en az bir harf içermelidir.' })
  .refine((v) => /\d/.test(v), { error: 'Parola en az bir rakam içermelidir.' });

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1).max(200),
  newPassword: passwordSchema,
});
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

export const createUserSchema = z.object({
  username: requiredText(64, 3),
  fullName: requiredText(120),
  email: z.email().optional(),
  password: passwordSchema,
  mustChangePassword: z.boolean().default(true),
});
export type CreateUserInput = z.infer<typeof createUserSchema>;

/** Login yanitindaki kullanici govdesi (parola hash'i ASLA donmez). */
export interface AuthenticatedUser {
  id: number;
  username: string;
  fullName: string;
  email: string | null;
  mustChangePassword: boolean;
}

export interface LoginResponse {
  accessToken: string;
  expiresIn: number;
  user: AuthenticatedUser;
}
