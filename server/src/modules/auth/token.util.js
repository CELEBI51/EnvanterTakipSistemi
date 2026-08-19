import crypto from 'crypto';

/**
 * SHA-256 ile ham token'ı hash'ler
 * @param {string} rawToken 
 * @returns {string} SHA-256 hex string
 */
export const hashToken = (rawToken) => {
  return crypto.createHash('sha256').update(rawToken).digest('hex');
};

/**
 * Rastgele ham token ve onun SHA-256 hash'ini üretir
 * @returns {{ rawToken: string, tokenHash: string }}
 */
export const generateResetToken = () => {
  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = hashToken(rawToken);
  return { rawToken, tokenHash };
};
