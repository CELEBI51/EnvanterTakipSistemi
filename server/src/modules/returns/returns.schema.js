import { z } from 'zod';

export const HARDWARE_RESULT_STATUSES = ['Hazır', 'Arızalı', 'Serviste', 'Kullanım Dışı'];
export const ACCESSORY_RESULT_STATUSES = ['Hazır', 'Arızalı'];

export const createReturnSchema = z
  .object({
    assignmentId: z.string().uuid('Geçerli bir zimmet kaydı seçilmelidir.'),
    teslimAlanIc: z.string().min(1, 'İadeyi teslim alan personel bilgisi zorunludur.'),
    tarih: z.string().refine((val) => !isNaN(Date.parse(val)), {
      message: 'Geçerli bir iade tarihi girilmelidir.',
    }),
    hardwareItems: z
      .array(
        z.object({
          hardwareId: z.string().uuid('Geçerli bir varlık ID girilmelidir.'),
          resultStatus: z.enum(HARDWARE_RESULT_STATUSES, {
            errorMap: () => ({ message: "Varlık sonuç durumu 'Hazır', 'Arızalı', 'Serviste' veya 'Kullanım Dışı' olmalıdır." }),
          }),
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
          resultStatus: z
            .enum(ACCESSORY_RESULT_STATUSES)
            .optional()
            .default('Hazır'),
        })
      )
      .optional()
      .default([]),
  })
  .refine(
    (data) => {
      const hwCount = data.hardwareItems?.length || 0;
      const accCount = data.accessoryItems?.length || 0;
      return hwCount + accCount > 0;
    },
    {
      message: 'İade işlemi gerçekleştirmek için en az bir varlık veya aksesuar kalemi eklenmelidir.',
      path: ['hardwareItems'],
    }
  );
