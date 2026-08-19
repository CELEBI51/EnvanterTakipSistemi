import rateLimit from 'express-rate-limit';

/**
 * Şifremi unuttum istekleri için Rate Limiting (15 dakikada en fazla 3 istek)
 */
export const forgotPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 dakika
  max: 3, // En fazla 3 istek
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: 'fail',
    message: 'Çok fazla istek. Lütfen 15 dakika sonra tekrar deneyin.',
  },
});
