import { API_BASE_URL } from '../config';

let cachedLogo = null;
let cachedCompanyName = 'Ditaş BDY Yedek Parça İmalat ve Teknik A.Ş.';

export const fetchCompanyInfo = async (forceRefresh = false) => {
  if (cachedLogo && cachedCompanyName && !forceRefresh) {
    return { companyName: cachedCompanyName, logoSrc: cachedLogo };
  }
  try {
    const res = await fetch(`${API_BASE_URL}/settings/public`);
    const data = await res.json();
    if (res.ok && data.data?.companyName) {
      cachedCompanyName = data.data.companyName;
    }
  } catch (err) {
    console.error('Şirket bilgileri çekilirken hata:', err);
  }

  try {
    const resLogo = await fetch(`${API_BASE_URL}/settings/logo?format=base64`);
    const dataLogo = await resLogo.json();
    if (resLogo.ok && dataLogo.data?.base64) {
      cachedLogo = dataLogo.data.base64;
    }
  } catch (err) {
    console.error('Logo yüklenirken hata oluştu:', err);
  }

  if (!cachedLogo) cachedLogo = '/ditas-logo.png';

  return { companyName: cachedCompanyName, logoSrc: cachedLogo };
};

export const fetchCompanyLogo = async (forceRefresh = false) => {
  const info = await fetchCompanyInfo(forceRefresh);
  return info.logoSrc;
};

export const updateLogoCache = (newBase64) => {
  cachedLogo = newBase64;
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('company-logo-changed', { detail: newBase64 }));
  }
};

export const updateCompanyInfoCache = (info) => {
  if (info.companyName) cachedCompanyName = info.companyName;
  if (info.logoSrc) cachedLogo = info.logoSrc;
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('company-info-changed', { detail: info }));
    window.dispatchEvent(new CustomEvent('company-logo-changed', { detail: cachedLogo }));
  }
};
