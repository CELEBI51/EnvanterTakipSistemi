import { z } from 'zod';

export const ALLOWED_STATUSES = ['Hazir', 'Kullanimda', 'Arizali', 'Serviste', 'KullanimDisi'];

const optionalString = z.string().nullable().optional().or(z.literal(''));
const optionalPositiveAmount = z
  .union([z.number().positive('Satın alım tutarı pozitif sayı olmalıdır.'), z.string()])
  .nullable()
  .optional()
  .or(z.literal(''))
  .transform((val) => {
    if (val === '' || val === null || val === undefined) return null;
    const num = Number(val);
    return isNaN(num) ? null : num;
  })
  .refine((val) => val === null || val > 0, {
    message: 'Satın alım tutarı pozitif sayı olmalıdır.',
  });

export const createHardwareSchema = z
  .object({
    category: optionalString,
    categoryId: z.string().uuid().nullable().optional().or(z.literal('')),
    brand: z.string({ required_error: 'Marka adı zorunludur.' }).min(1, 'Marka adı zorunludur.'),
    model: optionalString,
    serial_no: optionalString,
    serialNo: optionalString,
    demirbas_no: z
      .string({ required_error: 'Demirbaş numarası zorunludur.' })
      .min(1, 'Demirbaş numarası zorunludur.'),
    wifi_mac_address: optionalString,
    wifiMacAddress: optionalString,
    location: optionalString,
    supplier: optionalString,
    invoice_no: optionalString,
    invoiceNo: optionalString,
    purchase_date: optionalString,
    purchaseDate: optionalString,
    purchase_amount: optionalPositiveAmount,
    purchaseAmount: optionalPositiveAmount,
    warranty_start_date: optionalString,
    warranty_end_date: optionalString,
    warrantyStartDate: optionalString,
    warrantyEndDate: optionalString,
    specs: z
      .object({
        cpu: optionalString,
        ram: optionalString,
        gpu: optionalString,
        dvd: z.boolean().nullable().optional(),
      })
      .nullable()
      .optional(),
  })
  .refine(
    (data) => {
      const startDateStr = data.warranty_start_date || data.warrantyStartDate;
      const endDateStr = data.warranty_end_date || data.warrantyEndDate;
      if (startDateStr && endDateStr && startDateStr.trim() !== '' && endDateStr.trim() !== '') {
        const start = new Date(startDateStr);
        const end = new Date(endDateStr);
        return !isNaN(start.getTime()) && !isNaN(end.getTime()) && end >= start;
      }
      return true;
    },
    {
      message: 'Garanti bitiş tarihi başlangıç tarihinden sonra veya aynı gün olmalıdır.',
      path: ['warranty_end_date'],
    }
  );

export const updateHardwareSchema = z
  .object({
    category: optionalString,
    categoryId: z.string().uuid().nullable().optional().or(z.literal('')),
    brand: z.string().min(1).optional(),
    model: optionalString,
    serial_no: optionalString,
    serialNo: optionalString,
    demirbas_no: optionalString,
    demirbasNo: optionalString,
    status: z.enum(ALLOWED_STATUSES).optional(),
    wifi_mac_address: optionalString,
    wifiMacAddress: optionalString,
    location: optionalString,
    supplier: optionalString,
    invoice_no: optionalString,
    invoiceNo: optionalString,
    purchase_date: optionalString,
    purchaseDate: optionalString,
    purchase_amount: optionalPositiveAmount,
    purchaseAmount: optionalPositiveAmount,
    warranty_start_date: optionalString,
    warranty_end_date: optionalString,
    warrantyStartDate: optionalString,
    warrantyEndDate: optionalString,
    specs: z
      .object({
        cpu: optionalString,
        ram: optionalString,
        gpu: optionalString,
        dvd: z.boolean().nullable().optional(),
      })
      .nullable()
      .optional(),
  })
  .refine(
    (data) => {
      const startDateStr = data.warranty_start_date || data.warrantyStartDate;
      const endDateStr = data.warranty_end_date || data.warrantyEndDate;
      if (startDateStr && endDateStr && startDateStr.trim() !== '' && endDateStr.trim() !== '') {
        const start = new Date(startDateStr);
        const end = new Date(endDateStr);
        return !isNaN(start.getTime()) && !isNaN(end.getTime()) && end >= start;
      }
      return true;
    },
    {
      message: 'Garanti bitiş tarihi başlangıç tarihinden sonra veya aynı gün olmalıdır.',
      path: ['warranty_end_date'],
    }
  );
