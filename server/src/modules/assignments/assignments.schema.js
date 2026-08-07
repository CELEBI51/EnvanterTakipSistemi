import { z } from 'zod';

export const createAssignmentSchema = z
  .object({
    employeeId: z.string().uuid('Geçerli bir personel seçilmelidir.'),
    teslimTarihi: z.string().refine((val) => !isNaN(Date.parse(val)), {
      message: 'Geçerli bir teslim tarihi girilmelidir.',
    }),
    hardwareItems: z
      .array(
        z.object({
          hardwareId: z.string().uuid('Geçerli bir varlık ID girilmelidir.'),
        })
      )
      .optional()
      .default([]),
    accessoryItems: z
      .array(
        z.object({
          accessoryId: z.string().uuid('Geçerli bir aksesuar ID girilmelidir.'),
          quantity: z
            .number()
            .int('Miktar tam sayı olmalıdır.')
            .positive('Miktar 1 veya daha büyük olmalıdır.'),
        })
      )
      .optional()
      .default([]),
    consumableItems: z
      .array(
        z.object({
          consumableId: z.string().uuid('Geçerli bir sarf malzeme ID girilmelidir.'),
          quantity: z
            .number()
            .int('Miktar tam sayı olmalıdır.')
            .positive('Miktar 1 veya daha büyük olmalıdır.'),
        })
      )
      .optional()
      .default([]),
  })
  .refine(
    (data) => {
      const hwCount = data.hardwareItems?.length || 0;
      const accCount = data.accessoryItems?.length || 0;
      const conCount = data.consumableItems?.length || 0;
      return hwCount + accCount + conCount > 0;
    },
    {
      message: 'Zimmet oluşturmak için en az bir varlık, aksesuar veya sarf malzeme kalemi eklenmelidir.',
      path: ['hardwareItems'],
    }
  );
