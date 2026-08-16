import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import prisma from '../../config/db.js';

const JWT_SECRET = process.env.JWT_SECRET || 'demirbas-secret-key-2026';
const JWT_EXPIRES_IN = '24h';

export const loginUser = async ({ email, password }) => {
  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
  });

  if (!user) {
    const error = new Error('E-posta veya şifre hatalı.');
    error.statusCode = 401;
    throw error;
  }

  const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
  if (!isPasswordValid) {
    const error = new Error('E-posta veya şifre hatalı.');
    error.statusCode = 401;
    throw error;
  }

  const tokenPayload = {
    id: user.id,
    email: user.email,
    role: user.role,
    mustChangePassword: user.mustChangePassword,
  };

  const accessToken = jwt.sign(tokenPayload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  });

  const userResponse = {
    id: user.id,
    fullName: user.fullName,
    email: user.email,
    role: user.role,
    permissions: user.permissions || [],
    mustChangePassword: user.mustChangePassword,
  };

  return {
    user: userResponse,
    accessToken,
  };
};

export const changePassword = async (userId, { newPassword, confirmPassword }) => {
  if (!newPassword || newPassword.trim().length < 6) {
    const error = new Error('Yeni şifre en az 6 karakter olmalıdır.');
    error.statusCode = 400;
    throw error;
  }

  if (newPassword !== confirmPassword) {
    const error = new Error('Yeni şifreler eşleşmiyor.');
    error.statusCode = 400;
    throw error;
  }

  const newPasswordHash = await bcrypt.hash(newPassword, 10);

  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: {
      passwordHash: newPasswordHash,
      mustChangePassword: false,
    },
    select: {
      id: true,
      fullName: true,
      email: true,
      role: true,
      permissions: true,
      mustChangePassword: true,
    },
  });


  // Şifre yenilendikten sonra taze tam yetkili token üretilir
  const tokenPayload = {
    id: updatedUser.id,
    email: updatedUser.email,
    role: updatedUser.role,
    mustChangePassword: false,
  };

  const accessToken = jwt.sign(tokenPayload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  });

  return {
    user: updatedUser,
    accessToken,
  };
};
