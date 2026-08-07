import { z } from 'zod';

export const createUnitSchema = z.object({
  name: z.string({ required_error: 'Birim adı zorunludur.' }).min(1, 'Birim adı boş olamaz.').trim(),
  address: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  contactPerson: z.string().optional().nullable(),
  email: z.string().email('Geçerli bir e-posta adresi giriniz.').optional().nullable().or(z.literal('')),
});

export const updateUnitSchema = z.object({
  name: z.string().min(1, 'Birim adı boş olamaz.').trim().optional(),
  address: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  contactPerson: z.string().optional().nullable(),
  email: z.string().email('Geçerli bir e-posta adresi giriniz.').optional().nullable().or(z.literal('')),
  isActive: z.boolean().optional(),
});
