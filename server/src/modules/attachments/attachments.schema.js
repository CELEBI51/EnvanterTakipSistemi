import { z } from 'zod';

export const ALLOWED_ENTITY_TYPES = [
  'hardware',
  'accessory',
  'license',
  'consumable',
  'component',
  'assignment',
  'return',
];

export const ALLOWED_FILE_TYPES = ['invoice', 'signed_form'];

export const saveAttachmentSchema = z.object({
  entityType: z.enum(ALLOWED_ENTITY_TYPES, {
    errorMap: () => ({
      message: 'entityType "hardware", "accessory", "license", "consumable", "component", "assignment" veya "return" olmalıdır.',
    }),
  }),
  entityId: z
    .string({ required_error: 'entityId zorunludur.' })
    .uuid('entityId geçerli bir UUID olmalıdır.'),
  fileType: z.enum(ALLOWED_FILE_TYPES, {
    errorMap: () => ({
      message: 'fileType "invoice" veya "signed_form" olmalıdır.',
    }),
  }),
});
