import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import prisma from '../../config/db.js';
import { generateResetToken, hashToken } from './token.util.js';
import { sendEmail } from '../../services/mail.service.js';

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

  const { createLog } = await import('../../services/log.service.js');
  createLog({
    userId: user.id,
    userEmail: user.email,
    action: 'LOGIN',
    module: 'auth',
    description: `${user.email} sisteme giriş yaptı`,
    statusCode: 200,
  });

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

/**
 * Şifre sıfırlama e-postası talebi oluşturur
 * @param {string} email 
 */
export const requestPasswordReset = async (email) => {
  const normalizedEmail = email.trim().toLowerCase();
  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  });

  // E-posta enumeration saldırılarını önlemek için kullanıcı olmasa dahi jenerik başarı döneriz
  if (!user) {
    return {
      message: 'Eğer bu e-posta sistemde kayıtlıysa, sıfırlama bağlantısı gönderildi.',
    };
  }

  // 1. Kullanıcının daha önce oluşturulmuş kullanılmamış token'larını geçersiz kıl
  await prisma.passwordResetToken.updateMany({
    where: {
      userId: user.id,
      usedAt: null,
    },
    data: {
      usedAt: new Date(),
    },
  });

  // 2. Yeni ham token ve SHA-256 hash'i üret
  const { rawToken, tokenHash } = generateResetToken();
  const ttlMinutes = parseInt(process.env.RESET_TOKEN_TTL_MINUTES || '30', 10);
  const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000);

  // 3. Veritabanına kaydet
  await prisma.passwordResetToken.create({
    data: {
      userId: user.id,
      tokenHash,
      expiresAt,
    },
  });

  // 4. Bağlantı linkini oluştur ve e-posta gönder
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:4000';
  const resetUrl = `${frontendUrl}/reset-password?token=${rawToken}`;

  const subject = '🔒 Şifre Sıfırlama Talebi — Demirbaş Takip Sistemi';
  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 8px; overflow: hidden; border: 1px solid #e2e8f0;">
      <div style="background: #1E2534; padding: 24px; text-align: center; color: #ffffff;">
        <h2 style="margin: 0; font-size: 20px;">DİTAŞ Otomotiv • Demirbaş Takip Sistemi</h2>
      </div>
      <div style="padding: 24px; color: #1E2534; line-height: 1.6;">
        <h3 style="margin-top: 0; color: #1E2534;">Sayın ${user.fullName},</h3>
        <p>Demirbaş Takip Sistemi hesabınız için şifre sıfırlama talebinde bulundunuz.</p>
        <p>Şifrenizi yenilemek için lütfen aşağıdaki bağlantıya tıklayın (Bu bağlantı <strong>${ttlMinutes} dakika</strong> süreyle geçerlidir):</p>
        <div style="text-align: center; margin: 28px 0;">
          <a href="${resetUrl}" style="background-color: #4C82F7; color: #ffffff; padding: 12px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block; font-size: 14px;">Şifremi Sıfırla</a>
        </div>
        <p style="font-size: 12px; color: #64748b;">Bağlantı çalışmıyorsa aşağıdaki adresi tarayıcınıza kopyalayabilirsiniz:<br/>
        <a href="${resetUrl}" style="color: #4C82F7; word-break: break-all;">${resetUrl}</a></p>
        <p style="font-size: 12px; color: #94a3b8; margin-top: 24px;">Eğer bu talebi siz yapmadıysanız bu e-postayı dikkate almayınız. Şifreniz değişmeyecektir.</p>
      </div>
      <div style="background: #f8fafc; padding: 16px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0;">
        Bu e-posta otomatik olarak oluşturulmuştur. Lütfen yanıtlamayınız. © 2026 DİTAŞ Otomotiv
      </div>
    </div>
  `;

  await sendEmail({
    to: user.email,
    subject,
    text: `Sayın ${user.fullName},\n\nŞifre sıfırlama bağlantınız: ${resetUrl}\nBu bağlantı ${ttlMinutes} dakika geçerlidir.`,
    html: htmlContent,
  });

  return {
    message: 'Eğer bu e-posta sistemde kayıtlıysa, sıfırlama bağlantısı gönderildi.',
  };
};

/**
 * Ham token ve yeni şifre ile şifreyi yeniler
 * @param {string} rawToken 
 * @param {string} newPassword 
 */
export const resetPassword = async (rawToken, newPassword) => {
  const tokenHash = hashToken(rawToken);

  const resetRecord = await prisma.passwordResetToken.findUnique({
    where: { tokenHash },
    include: { user: true },
  });

  // Kayıt yoksa, önceden kullanılmışsa veya süresi dolmuşsa geçersizdir
  if (!resetRecord || resetRecord.usedAt !== null || resetRecord.expiresAt < new Date()) {
    const error = new Error('Geçersiz veya süresi dolmuş sıfırlama bağlantısı.');
    error.statusCode = 400;
    throw error;
  }

  const newPasswordHash = await bcrypt.hash(newPassword, 10);

  // İşlemleri atomik transaction içerisinde gerçekleştir
  await prisma.$transaction([
    prisma.user.update({
      where: { id: resetRecord.userId },
      data: {
        passwordHash: newPasswordHash,
        mustChangePassword: false,
      },
    }),
    prisma.passwordResetToken.update({
      where: { id: resetRecord.id },
      data: {
        usedAt: new Date(),
      },
    }),
  ]);

  const { createLog } = await import('../../services/log.service.js');
  createLog({
    userId: resetRecord.userId,
    userEmail: resetRecord.user.email,
    action: 'RESET_PASSWORD',
    module: 'auth',
    description: `${resetRecord.user.email} kullanıcısının şifresi sıfırlama bağlantısıyla yenilendi`,
    statusCode: 200,
  });

  return {
    message: 'Şifreniz başarıyla güncellendi.',
  };
};
