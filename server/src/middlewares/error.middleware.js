import { ZodError } from 'zod';

export const errorHandler = (err, req, res, next) => {
  if (err instanceof ZodError) {
    const formattedError = err.errors.map((e) => e.message).join(', ');
    return res.status(400).json({
      success: false,
      message: formattedError || 'Geçersiz veri girişi.',
    });
  }

  const statusCode = err.statusCode || 500;
  const message = err.message || 'Sunucu içi bir hata oluştu.';

  return res.status(statusCode).json({
    success: false,
    message,
  });
};
