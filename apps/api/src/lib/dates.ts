/**
 * `date` sutunlari semada mode:'string' ile tanimli ('YYYY-MM-DD').
 * Zod tarafinda ise z.coerce.date() Date uretir. Bu donusum, saat dilimi
 * kaymasi yuzunden "1 gun geri" hatasini onlemek icin tek noktada yapilir.
 */
export function toDateString(value: Date | null | undefined): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  return value.toISOString().slice(0, 10);
}
