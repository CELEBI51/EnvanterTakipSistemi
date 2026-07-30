import bcrypt from 'bcrypt';
import crypto from 'crypto';
import prisma from '../../config/db.js';

// 10 karakterli harf ve rakam karışık güçlü rastgele şifre üretici
function generateTempPassword() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
  let password = '';
  for (let i = 0; i < 10; i++) {
    const randomIndex = crypto.randomInt(0, chars.length);
    password += chars[randomIndex];
  }
  return password;
}

export const getAllUsers = async () => {
  return await prisma.user.findMany({
    select: {
      id: true,
      fullName: true,
      email: true,
      role: true,
      mustChangePassword: true,
      createdAt: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
  });
};

export const createUser = async ({ fullName, email, role }) => {
  const existingUser = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
  });

  if (existingUser) {
    const error = new Error('Bu e-posta adresi ile kayıtlı bir kullanıcı zaten mevcut.');
    error.statusCode = 400;
    throw error;
  }

  const temporaryPassword = generateTempPassword();
  const passwordHash = await bcrypt.hash(temporaryPassword, 10);

  const newUser = await prisma.user.create({
    data: {
      fullName,
      email: email.toLowerCase(),
      role,
      passwordHash,
      mustChangePassword: true,
    },
    select: {
      id: true,
      fullName: true,
      email: true,
      role: true,
      mustChangePassword: true,
      createdAt: true,
    },
  });

  // Üretilen düz metin geçici şifre tek seferlik response'ta döner, DB'ye asla düz metin yazılmaz!
  return {
    user: newUser,
    temporaryPassword,
  };
};

export const resetPassword = async (targetUserId) => {
  const user = await prisma.user.findUnique({
    where: { id: targetUserId },
  });

  if (!user) {
    const error = new Error('Kullanıcı bulunamadı.');
    error.statusCode = 404;
    throw error;
  }

  const temporaryPassword = generateTempPassword();
  const passwordHash = await bcrypt.hash(temporaryPassword, 10);

  await prisma.user.update({
    where: { id: targetUserId },
    data: {
      passwordHash,
      mustChangePassword: true,
    },
  });

  return {
    userId: targetUserId,
    temporaryPassword,
  };
};

export const updateUserRole = async (targetUserId, newRole, currentUserId) => {
  const user = await prisma.user.findUnique({
    where: { id: targetUserId },
  });

  if (!user) {
    const error = new Error('Kullanıcı bulunamadı.');
    error.statusCode = 404;
    throw error;
  }

  // KRİTİK KURAL 2: Sistemde en az 1 admin kalmalı!
  if (user.role === 'admin' && newRole !== 'admin') {
    const adminCount = await prisma.user.count({
      where: { role: 'admin' },
    });

    if (adminCount <= 1) {
      const error = new Error('Sistemde en az bir yönetici (admin) bulunmalıdır. Son yöneticinin rolü düşürülemez.');
      error.statusCode = 400;
      throw error;
    }
  }

  const updatedUser = await prisma.user.update({
    where: { id: targetUserId },
    data: { role: newRole },
    select: {
      id: true,
      fullName: true,
      email: true,
      role: true,
      mustChangePassword: true,
      createdAt: true,
    },
  });

  return updatedUser;
};

export const deleteUser = async (targetUserId, currentUserId) => {
  // KRİTİK KURAL 1: Admin kendi kendini silemez!
  if (targetUserId === currentUserId) {
    const error = new Error('Kendi hesabınızı silemezsiniz.');
    error.statusCode = 403;
    throw error;
  }

  const user = await prisma.user.findUnique({
    where: { id: targetUserId },
  });

  if (!user) {
    const error = new Error('Kullanıcı bulunamadı.');
    error.statusCode = 404;
    throw error;
  }

  // KRİTİK KURAL 2: Sistemde en az 1 admin kalmalı!
  if (user.role === 'admin') {
    const adminCount = await prisma.user.count({
      where: { role: 'admin' },
    });

    if (adminCount <= 1) {
      const error = new Error('Sistemde en az bir yönetici (admin) bulunmalıdır. Son yönetici silinemez.');
      error.statusCode = 400;
      throw error;
    }
  }

  await prisma.user.delete({
    where: { id: targetUserId },
  });

  return { message: 'Kullanıcı başarıyla silindi.' };
};
