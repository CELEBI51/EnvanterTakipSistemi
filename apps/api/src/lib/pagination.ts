import type { PaginatedResult } from '@entanter/shared';

/** Sayfa numarasindan SQL OFFSET degeri. */
export function toOffset(page: number, limit: number): number {
  return (page - 1) * limit;
}

/** Liste endpoint'lerinin ortak yanit govdesi. */
export function paginate<T>(
  data: T[],
  page: number,
  limit: number,
  total: number,
): PaginatedResult<T> {
  return {
    data,
    meta: {
      page,
      limit,
      total,
      totalPages: total === 0 ? 0 : Math.ceil(total / limit),
    },
  };
}
