import jwt from 'jsonwebtoken';
import prisma from '../config/db.js';

const JWT_SECRET = process.env.JWT_SECRET || 'demirbas-secret-key-2026';

export const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Yetkilendirme token\'ı bulunamadı.' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);

    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        mustChangePassword: true,
      },
    });

    if (!user) {
      return res.status(401).json({ message: 'Geçersiz token veya kullanıcı bulunamadı.' });
    }

    req.user = user;

    // Şifre değiştirme zorunluluğu kontrolü:
    // Kullanıcı mustChangePassword: true durumundaysa, SADECE /api/auth/change-password endpoint'ine erişebilir.
    const isChangePasswordEndpoint = req.originalUrl.includes('/api/auth/change-password');
    if (user.mustChangePassword && !isChangePasswordEndpoint) {
      return res.status(403).json({
        message: 'İlk girişinizde şifrenizi değiştirmeniz gerekmektedir.',
        mustChangePassword: true,
      });
    }

    next();
  } catch (error) {
    return res.status(401).json({ message: 'Oturum süresi dolmuş veya geçersiz token.' });
  }
};
