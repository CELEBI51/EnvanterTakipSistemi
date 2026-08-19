// Dynamically determine API_BASE_URL based on the browser's current location.
// Works seamlessly on localhost, domain (envanter.ditas.com.tr), or any local LAN IP.
const getApiBaseUrl = () => {
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  if (typeof window !== 'undefined' && window.location) {
    const protocol = window.location.protocol;
    const hostname = window.location.hostname;
    return `${protocol}//${hostname}:4001/api`;
  }
  return 'http://localhost:4001/api';
};

export const API_BASE_URL = getApiBaseUrl();
export default API_BASE_URL;
