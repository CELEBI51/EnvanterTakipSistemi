/**
 * API istemcisi.
 *
 * - Access token BELLEKTE tutulur, localStorage'a YAZILMAZ: XSS ile calinamasin.
 * - Refresh token httpOnly cookie'dedir; JavaScript goremez.
 * - 401 alindiginda tek seferlik otomatik yenileme yapilir ve istek tekrarlanir.
 */

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3001';

let accessToken: string | null = null;
let refreshPromise: Promise<boolean> | null = null;
let unauthorizedHandler: (() => void) | null = null;

export function setAccessToken(token: string | null): void {
  accessToken = token;
}

export function hasAccessToken(): boolean {
  return accessToken !== null;
}

/** Yenileme de basarisiz olursa cagrilir (oturumu kapat, giris ekranina don). */
export function setUnauthorizedHandler(handler: () => void): void {
  unauthorizedHandler = handler;
}

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }

  /** Zod dogrulama hatalarini form alanlarina baglamak icin. */
  get fieldErrors(): Record<string, string[]> {
    const details = this.details as { fields?: Record<string, string[]> } | undefined;
    return details?.fields ?? {};
  }
}

async function performRefresh(): Promise<boolean> {
  try {
    const response = await fetch(`${API_URL}/api/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
    });
    if (!response.ok) return false;

    const data = (await response.json()) as { accessToken?: string };
    if (!data.accessToken) return false;

    accessToken = data.accessToken;
    return true;
  } catch {
    return false;
  }
}

/** Ayni anda gelen birden fazla 401 icin TEK yenileme istegi yapilir. */
export function refreshSession(): Promise<boolean> {
  if (!refreshPromise) {
    refreshPromise = performRefresh().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  isRetry = false,
): Promise<T> {
  const headers: Record<string, string> = {};
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
  // Govde yoksa Content-Type GONDERILMEZ.
  if (body !== undefined) headers['Content-Type'] = 'application/json';

  const response = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
    // Refresh cookie'sinin tasinmasi icin ZORUNLU (farkli origin).
    credentials: 'include',
  });

  // Oturum suresi dolmus: bir kez yenilemeyi dene, sonra istegi tekrarla.
  if (response.status === 401 && !isRetry && !path.startsWith('/api/auth/')) {
    const refreshed = await refreshSession();
    if (refreshed) return request<T>(method, path, body, true);
    unauthorizedHandler?.();
  }

  if (response.status === 204) return undefined as T;

  const payload = (await response.json().catch(() => null)) as
    | { error?: { code?: string; message?: string; details?: unknown } }
    | null;

  if (!response.ok) {
    throw new ApiError(
      response.status,
      payload?.error?.code ?? 'UNKNOWN',
      payload?.error?.message ?? 'Sunucuya ulaşılamadı veya beklenmeyen bir hata oluştu.',
      payload?.error?.details,
    );
  }

  return payload as T;
}

export const api = {
  get: <T>(path: string) => request<T>('GET', path),
  post: <T>(path: string, body?: unknown) => request<T>('POST', path, body),
  patch: <T>(path: string, body?: unknown) => request<T>('PATCH', path, body),
  delete: <T>(path: string) => request<T>('DELETE', path),
};

/** Sorgu parametrelerini bos degerleri atlayarak olusturur. */
export function buildQuery(params: Record<string, unknown>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue;
    search.set(key, String(value));
  }
  const queryString = search.toString();
  return queryString ? `?${queryString}` : '';
}
