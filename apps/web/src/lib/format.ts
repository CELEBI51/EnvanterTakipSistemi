import { DISPLAY_TIME_ZONE } from '@entanter/shared';

/**
 * Veritabani ve API UTC calisir; kullaniciya her zaman Europe/Istanbul
 * saatiyle gosterilir. Donusum tek noktada yapilir ki ekranlar arasinda
 * farkli saat gorunmesin.
 */
const dateTimeFormatter = new Intl.DateTimeFormat('tr-TR', {
  dateStyle: 'short',
  timeStyle: 'short',
  timeZone: DISPLAY_TIME_ZONE,
});

const dateFormatter = new Intl.DateTimeFormat('tr-TR', {
  dateStyle: 'medium',
  timeZone: DISPLAY_TIME_ZONE,
});

export function formatDateTime(value: string | Date | null | undefined): string {
  if (!value) return '—';
  return dateTimeFormatter.format(new Date(value));
}

export function formatDate(value: string | Date | null | undefined): string {
  if (!value) return '—';
  // 'YYYY-MM-DD' saf tarih degerleri UTC olarak yorumlanip kaymasin diye
  // gun basina sabitlenir.
  const date = typeof value === 'string' && value.length === 10 ? new Date(`${value}T12:00:00`) : new Date(value);
  return dateFormatter.format(date);
}

export function formatNumber(value: number | null | undefined): string {
  if (value === null || value === undefined) return '—';
  return new Intl.NumberFormat('tr-TR').format(value);
}
