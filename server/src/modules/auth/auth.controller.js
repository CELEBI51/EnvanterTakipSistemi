import * as authService from './auth.service.js';

export const login = async (req, res) => {
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
    return res.status(error.statusCode || 500).json({
      message: error.message || 'Giriş yapılırken bir hata oluştu.',
    });
  }
};

export const changePassword = async (req, res) => {
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
    return res.status(error.statusCode || 500).json({
      message: error.message || 'Şifre değiştirilirken bir hata oluştu.',
    });
  }
};
