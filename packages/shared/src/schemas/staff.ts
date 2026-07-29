import { z } from 'zod';
import { listQuerySchema } from './common.js';
import {
  booleanQuery,
  nullableEmail,
  nullableId,
  nullableText,
  requiredText,
} from './helpers.js';

export const createStaffSchema = z.object({
  /** Sicil numarasi. Aktif kayitlar arasinda tekildir (partial unique index). */
  employeeNo: requiredText(32),
  firstName: requiredText(80),
  lastName: requiredText(80),
  departmentId: nullableId,
  title: nullableText(120),
  email: nullableEmail,
  phone: nullableText(32),
  notes: nullableText(1000),
  isActive: z.boolean().default(true),
});
export type CreateStaffInput = z.infer<typeof createStaffSchema>;

export const updateStaffSchema = createStaffSchema.partial();
export type UpdateStaffInput = z.infer<typeof updateStaffSchema>;

export const staffListQuerySchema = listQuerySchema.extend({
  departmentId: nullableId,
  isActive: booleanQuery,
  /** true ise sadece uzerinde acik zimmet bulunan personel listelenir. */
  hasOpenAssignments: booleanQuery,
});
export type StaffListQuery = z.infer<typeof staffListQuerySchema>;

/** GET /api/staff/:id/assignments filtresi (personel gecmisi). */
export const staffAssignmentsQuerySchema = z.object({
  status: z.enum(['open', 'all']).default('all'),
});
export type StaffAssignmentsQuery = z.infer<typeof staffAssignmentsQuerySchema>;
