import { z } from 'zod';

export const ALLOWED_PARENT_TYPES = [
  'Aksesuar',
  'Varlık',
  'Sarf Malzeme',
  'Bileşen',
  'Lisans',
];

export const PARENT_TYPE_MAP = {
  Aksesuar: 'AKSESUAR',
  Varlık: 'VARLIK',
  'Sarf Malzeme': 'SARF_MALZEME',
  Bileşen: 'BILESEN',
  Lisans: 'LISANS',
  // Direct DB enum fallbacks
  AKSESUAR: 'AKSESUAR',
  VARLIK: 'VARLIK',
  SARF_MALZEME: 'SARF_MALZEME',
  BILESEN: 'BILESEN',
  LISANS: 'LISANS',
};

export const PARENT_TYPE_REVERSE_MAP = {
  AKSESUAR: 'Aksesuar',
  VARLIK: 'Varlık',
  SARF_MALZEME: 'Sarf Malzeme',
  BILESEN: 'Bileşen',
  LISANS: 'Lisans',
};

export const createCategorySchema = z.object({
  parentType: z.enum(ALLOWED_PARENT_TYPES, {
    errorMap: () => ({
      message: 'parentType "Aksesuar", "Varlık", "Sarf Malzeme", "Bileşen" veya "Lisans" olmalıdır.',
    }),
  }),
  name: z
    .string({ required_error: 'Kategori adı zorunludur.' })
    .min(1, 'Kategori adı boş olamaz.')
    .transform((val) => val.trim()),
});
