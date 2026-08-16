/**
 * Telefon numarası formatı: 05XX XXX XX XX
 * Sadece rakam, max 11 hane, otomatik boşluk ekleme
 */
export const formatPhoneInput = (value) => {
  // Sadece rakamları al
  const digits = value.replace(/\D/g, '');
  // Max 11 rakam
  const limited = digits.slice(0, 11);
  // Otomatik format: 05XX XXX XX XX
  let formatted = '';
  for (let i = 0; i < limited.length; i++) {
    if (i === 4 || i === 7 || i === 9) formatted += ' ';
    formatted += limited[i];
  }
  return formatted;
};

/**
 * Telefon numarasından sadece rakamları çıkar (kayıt için)
 */
export const getPhoneDigits = (formatted) => {
  return formatted.replace(/\D/g, '');
};

/**
 * Sicil numarası: sadece rakam, max 11 hane
 */
export const formatTcNoInput = (value) => {
  return value.replace(/\D/g, '').slice(0, 11);
};

/**
 * Lisans Anahtarı: Alfanümerik karakterleri büyük harfe çevirir,
 * her 5 karakterde bir otomatik tire (-) ekler (ör: XXXXX-XXXXX-XXXXX-XXXXX-XXXXX).
 * Standart lisans formatı (5'li bloklar, toplam 25 karakter + 4 tire = 29 karakter).
 */
export const formatLicenseKeyInput = (value) => {
  if (!value) return '';
  // Sadece harf ve rakamları al, büyük harfe çevir
  const cleaned = value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  // Max 25 karakter (5 blok x 5)
  const limited = cleaned.slice(0, 25);
  // Her 5 karakterde bir tire koy
  const parts = limited.match(/.{1,5}/g);
  return parts ? parts.join('-') : '';
};

