import { z } from 'zod';
import { idSchema } from './helpers.js';

/** :id route parametresi. */
export const idParamSchema = z.object({ id: idSchema });
export type IdParam = z.infer<typeof idParamSchema>;

/** Tum liste endpoint'lerinin ortak sayfalama sozlesmesi. */
export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(200).default(25),
});
export type PaginationQuery = z.infer<typeof paginationQuerySchema>;

/** Sayfalama + serbest metin arama. */
export const listQuerySchema = paginationQuerySchema.extend({
  q: z.string().trim().min(1).max(120).optional(),
  order: z.enum(['asc', 'desc']).default('desc'),
});
export type ListQuery = z.infer<typeof listQuerySchema>;

/** Liste endpoint'lerinin donus tipi. */
export interface PaginatedResult<T> {
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

/** Tum hatalarin tek tip govdesi. */
export interface ApiErrorBody {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}
