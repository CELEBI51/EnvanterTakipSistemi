import { pino } from 'pino';
import { env, isProduction } from '../config/env.js';

/**
 * Tek pino ornegi. Hem Fastify hem veritabani havuzu bunu kullanir,
 * boylece tum loglar tek formatta ve tek hedefe akar.
 * Dis log servisi YOK — offline ortamda stdout / dosya.
 */
export const logger = pino({
  level: env.LOG_LEVEL,
  // Uretimde ham JSON (dosyaya yazilip arsivlenebilir), gelistirmede okunabilir cikti.
  transport: isProduction
    ? undefined
    : {
        target: 'pino-pretty',
        options: { colorize: true, translateTime: 'HH:MM:ss', ignore: 'pid,hostname' },
      },
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      'res.headers["set-cookie"]',
      '*.password',
      '*.passwordHash',
      '*.currentPassword',
      '*.newPassword',
      '*.accessToken',
      '*.refreshToken',
    ],
    remove: true,
  },
});
