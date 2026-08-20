// client/src/config.js
const getApiBaseUrl = () => {
  // 1. Build-time env var varsa kullan (production .env.production'dan gelir)
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  // 2. Yoksa: aynı host, /api path'i — IIS reverse proxy bu isteği
  //    backend'e yönlendirir. Port yazmıyoruz.
  return `${window.location.protocol}//${window.location.hostname}/api`;
};

export const API_BASE_URL = getApiBaseUrl();
