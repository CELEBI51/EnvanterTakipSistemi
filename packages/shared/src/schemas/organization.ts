import { z } from 'zod';
import { CATEGORY_KIND_VALUES } from '../constants/index.js';
import { listQuerySchema } from './common.js';
import { booleanQuery, nullableText, requiredText } from './helpers.js';

/* ----------------------------- Departman ----------------------------- */

export const createDepartmentSchema = z.object({
  name: requiredText(120),
  code: nullableText(32),
  isActive: z.boolean().default(true),
});
export type CreateDepartmentInput = z.infer<typeof createDepartmentSchema>;

export const updateDepartmentSchema = createDepartmentSchema.partial();
export type UpdateDepartmentInput = z.infer<typeof updateDepartmentSchema>;

export const departmentListQuerySchema = listQuerySchema.extend({
  isActive: booleanQuery,
});
export type DepartmentListQuery = z.infer<typeof departmentListQuerySchema>;

/* ----------------------------- Kategori ------------------------------ */

export const createCategorySchema = z.object({
  name: requiredText(120),
  /** Kategori ya demirbas ya sarf tarafina aittir; karisik kullanilamaz. */
  kind: z.enum(CATEGORY_KIND_VALUES),
});
export type CreateCategoryInput = z.infer<typeof createCategorySchema>;

export const updateCategorySchema = createCategorySchema.partial();
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;

export const categoryListQuerySchema = listQuerySchema.extend({
  kind: z.enum(CATEGORY_KIND_VALUES).optional(),
});
export type CategoryListQuery = z.infer<typeof categoryListQuerySchema>;
