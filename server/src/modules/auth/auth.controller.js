import { z } from 'zod';
import * as authService from './auth.service.js';

const forgotPasswordSchema = z.object({
  email: z.string().email('Geçerli bir e-posta adresi giriniz.'),
});

const resetPasswordSchema = z.object({
  token: z.string().length(64, 'Geçersiz sıfırlama bağlantısı.'),
  newPassword: z.string().min(8, 'Yeni şifre en az 8 karakter olmalıdır.'),
});

export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: 'E-posta ve şifre zorunludur.' });
    }

    const result = await authService.loginUser({ email, password });
    return res.status(200).json({
      status: 'success',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const changePassword = async (req, res, next) => {
  try {
    const { newPassword, confirmPassword } = req.body;
    const userId = req.user.id;

    const result = await authService.changePassword(userId, { newPassword, confirmPassword });
    return res.status(200).json({
      status: 'success',
      message: 'Şifreniz başarıyla değiştirildi.',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const forgotPassword = async (req, res, next) => {
  try {
    const parsed = forgotPasswordSchema.safeParse(req.body);
    if (!parsed.success) {
      const firstIssue = parsed.error.issues[0];
      return res.status(400).json({ message: firstIssue?.message || 'Geçersiz e-posta adresi.' });
    }

    const result = await authService.requestPasswordReset(parsed.data.email);
    return res.status(200).json({
      status: 'success',
      message: result.message,
    });
  } catch (error) {
    next(error);
  }
};

export const resetPassword = async (req, res, next) => {
  try {
    const parsed = resetPasswordSchema.safeParse(req.body);
    if (!parsed.success) {
      const firstIssue = parsed.error.issues[0];
      return res.status(400).json({ message: firstIssue?.message || 'Geçersiz istek parametreleri.' });
    }

    const result = await authService.resetPassword(parsed.data.token, parsed.data.newPassword);
    return res.status(200).json({
      status: 'success',
      message: result.message,
    });
  } catch (error) {
    next(error);
  }
};

export const logout = async (req, res, next) => {
  try {
    const { createLog } = await import('../../services/log.service.js');
    if (req.user) {
      createLog({
        userId: req.user.id,
        userEmail: req.user.email,
        action: 'LOGOUT',
        module: 'auth',
        description: `${req.user.email} sistemden çıkış yaptı`,
        statusCode: 200,
      });
    }
    return res.status(200).json({
      status: 'success',
      message: 'Başarıyla çıkış yapıldı.',
    });
  } catch (error) {
    next(error);
  }
};

export const getProfile = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const profile = await authService.getUserProfile(userId);
    return res.status(200).json({
      status: 'success',
      data: profile,
    });
  } catch (error) {
    next(error);
  }
};

export const updateProfile = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { fullName, phone, currentPassword } = req.body;
    const result = await authService.updateProfile(userId, { fullName, phone, currentPassword });
    return res.status(200).json({
      status: 'success',
      message: 'Profil bilgileriniz başarıyla güncellendi.',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const requestEmailChange = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { newEmail, currentPassword } = req.body;
    if (!newEmail || !currentPassword) {
      return res.status(400).json({ message: 'Yeni e-posta ve mevcut şifreniz gereklidir.' });
    }
    const result = await authService.requestEmailChange(userId, { newEmail, currentPassword });
    return res.status(200).json({
      status: 'success',
      message: result.message,
    });
  } catch (error) {
    next(error);
  }
};

export const verifyEmailChange = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { newEmail, code } = req.body;
    if (!newEmail || !code) {
      return res.status(400).json({ message: 'Yeni e-posta ve 6 haneli onay kodu gereklidir.' });
    }
    const result = await authService.verifyEmailChange(userId, { newEmail, code });
    return res.status(200).json({
      status: 'success',
      message: result.message,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

