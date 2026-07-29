/**
 * ILIKE deseni olustururken kullanicinin girdigi ozel karakterleri kacirir.
 * Kacirilmazsa "%" veya "_" iceren bir arama terimi joker karaktere donusur
 * ve beklenmeyen sonuclar dondurur.
 */
export function likePattern(term: string): string {
  const escaped = term.replace(/[\\%_]/g, (match) => `\\${match}`);
  return `%${escaped}%`;
}

/** Bir alani guncellemeye dahil etmek gerekip gerekmedigini belirler. */
export function definedOnly<T extends Record<string, unknown>>(input: T): Partial<T> {
  const output: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input)) {
    if (value !== undefined) output[key] = value;
  }
  return output as Partial<T>;
}
