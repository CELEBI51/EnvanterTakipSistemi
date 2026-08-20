import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  User,
  Mail,
  Phone,
  Lock,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Loader2,
  KeyRound,
  Send,
  Calendar,
  Building2,
  Sparkles,
} from 'lucide-react';
import useAuthStore from '../../../store/authStore';
import { API_BASE_URL } from '../../../config';
import { formatPhoneInput, getPhoneDigits } from '../../../utils/inputFormatters';

const profileSchema = z.object({
  fullName: z.string().min(2, 'Ad Soyad en az 2 karakter olmalıdır.'),
  phone: z.string().optional(),
});

const passwordSchema = z
  .object({
    newPassword: z.string().min(6, 'Yeni şifre en az 6 karakter olmalıdır.'),
    confirmPassword: z.string().min(6, 'Şifre tekrarı zorunludur.'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Yeni şifreler eşleşmiyor.',
    path: ['confirmPassword'],
  });

export default function ProfilePage() {
  const token = useAuthStore((state) => state.accessToken);
  const { user, updateUser, setAuth } = useAuthStore();

  const [activeTab, setActiveTab] = useState('info'); // 'info' | 'email' | 'password'
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState('');
  const [profileError, setProfileError] = useState('');

  // Email Change State
  const [newEmail, setNewEmail] = useState('');
  const [emailCurrentPassword, setEmailCurrentPassword] = useState('');
  const [emailStep, setEmailStep] = useState('request'); // 'request' | 'verify'
  const [verificationCode, setVerificationCode] = useState('');
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailSuccess, setEmailSuccess] = useState('');
  const [emailError, setEmailError] = useState('');

  // Password Change State
  const [passLoading, setPassLoading] = useState(false);
  const [passSuccess, setPassSuccess] = useState('');
  const [passError, setPassError] = useState('');

  const {
    register: registerProfile,
    handleSubmit: handleProfileSubmit,
    setValue: setProfileValue,
    formState: { errors: profileErrors },
  } = useForm({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      fullName: user?.fullName || '',
      phone: user?.phone || '',
    },
  });

  const {
    register: registerPass,
    handleSubmit: handlePassSubmit,
    reset: resetPassForm,
    formState: { errors: passErrors },
  } = useForm({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      newPassword: '',
      confirmPassword: '',
    },
  });

  // Fetch complete profile on mount
  useEffect(() => {
    if (!token) return;
    const fetchProfile = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/auth/profile`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (res.ok && data.data) {
          updateUser(data.data);
          setProfileValue('fullName', data.data.fullName || '');
          setProfileValue('phone', data.data.phone || '');
        }
      } catch (err) {
        console.error('Profil yükleme hatası:', err);
      }
    };

    fetchProfile();
  }, [token]);

  // Handle Personal Info Submit
  const onSaveProfile = async (formData) => {
    setProfileLoading(true);
    setProfileSuccess('');
    setProfileError('');

    try {
      const res = await fetch(`${API_BASE_URL}/auth/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          fullName: formData.fullName,
          phone: formData.phone,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Profil güncellenemedi.');

      if (data.data?.user) {
        updateUser(data.data.user);
        if (data.data.accessToken) {
          setAuth({ user: data.data.user, accessToken: data.data.accessToken });
        }
      }
      setProfileSuccess('Profil bilgileriniz başarıyla güncellendi.');
    } catch (err) {
      setProfileError(err.message);
    } finally {
      setProfileLoading(false);
    }
  };

  // Handle Request Email Change Code
  const onRequestEmailCode = async (e) => {
    e.preventDefault();
    setEmailLoading(true);
    setEmailSuccess('');
    setEmailError('');

    if (!newEmail.trim() || !emailCurrentPassword) {
      setEmailError('Yeni e-posta adresi ve mevcut şifreniz gereklidir.');
      setEmailLoading(false);
      return;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/auth/request-email-change`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          newEmail: newEmail.trim(),
          currentPassword: emailCurrentPassword,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Doğrulama kodu gönderilemedi.');

      setEmailSuccess(`6 haneli doğrulama kodu ${newEmail.trim()} adresine gönderildi.`);
      setEmailStep('verify');
    } catch (err) {
      setEmailError(err.message);
    } finally {
      setEmailLoading(false);
    }
  };

  // Handle Verify Email Code
  const onVerifyEmailCode = async (e) => {
    e.preventDefault();
    setEmailLoading(true);
    setEmailSuccess('');
    setEmailError('');

    if (!verificationCode.trim() || verificationCode.trim().length !== 6) {
      setEmailError('Lütfen 6 haneli onay kodunu eksiksiz giriniz.');
      setEmailLoading(false);
      return;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/auth/verify-email-change`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          newEmail: newEmail.trim(),
          code: verificationCode.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'E-posta doğrulanamadı.');

      if (data.data?.user) {
        updateUser(data.data.user);
        if (data.data.accessToken) {
          setAuth({ user: data.data.user, accessToken: data.data.accessToken });
        }
      }

      setEmailSuccess('E-posta adresiniz başarıyla güncellendi!');
      setNewEmail('');
      setEmailCurrentPassword('');
      setVerificationCode('');
      setEmailStep('request');
    } catch (err) {
      setEmailError(err.message);
    } finally {
      setEmailLoading(false);
    }
  };

  // Handle Password Change
  const onSavePassword = async (formData) => {
    setPassLoading(true);
    setPassSuccess('');
    setPassError('');

    try {
      const res = await fetch(`${API_BASE_URL}/auth/change-password`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          newPassword: formData.newPassword,
          confirmPassword: formData.confirmPassword,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Şifre değiştirilemedi.');

      setPassSuccess('Şifreniz başarıyla değiştirildi.');
      resetPassForm();
    } catch (err) {
      setPassError(err.message);
    } finally {
      setPassLoading(false);
    }
  };

  const userInitials = user?.fullName
    ? user.fullName.substring(0, 2).toUpperCase()
    : 'US';

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-8 animate-in fade-in duration-200">
      {/* Header Banner */}
      <div className="relative overflow-hidden bg-gradient-to-r from-[#1E2534] via-[#2A3447] to-[#1E2534] rounded-3xl p-8 text-white shadow-xl">
        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-[#4F8FE0] to-[#2563EB] flex items-center justify-center font-bold text-2xl text-white shadow-lg border-2 border-white/20">
              {userInitials}
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="font-heading text-2xl font-bold">{user?.fullName || 'Kullanıcı'}</h1>
                <span className="px-3 py-1 text-xs font-bold bg-[#4F8FE0]/20 text-[#60A5FA] border border-[#4F8FE0]/30 rounded-full uppercase tracking-wider">
                  {user?.role === 'admin' ? 'Yönetici' : 'IT Personeli'}
                </span>
              </div>
              <p className="text-slate-300 text-sm mt-1 flex items-center gap-2">
                <Mail className="w-4 h-4 text-slate-400" />
                {user?.email}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 bg-white/10 backdrop-blur-md px-4 py-2.5 rounded-2xl border border-white/10 text-xs">
            <ShieldCheck className="w-4 h-4 text-[#60A5FA]" />
            <span>Hesap Durumu: <strong className="text-emerald-400">Aktif</strong></span>
          </div>
        </div>
      </div>

      {/* Main Tabs Navigation */}
      <div className="flex border-b border-slate-200 gap-2">
        <button
          onClick={() => setActiveTab('info')}
          className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold border-b-2 transition cursor-pointer ${
            activeTab === 'info'
              ? 'border-[#4F8FE0] text-[#4F8FE0]'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <User className="w-4 h-4" />
          Kişisel Bilgiler
        </button>

        <button
          onClick={() => setActiveTab('email')}
          className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold border-b-2 transition cursor-pointer ${
            activeTab === 'email'
              ? 'border-[#4F8FE0] text-[#4F8FE0]'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <Mail className="w-4 h-4" />
          E-posta Değiştirme
        </button>

        <button
          onClick={() => setActiveTab('password')}
          className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold border-b-2 transition cursor-pointer ${
            activeTab === 'password'
              ? 'border-[#4F8FE0] text-[#4F8FE0]'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <Lock className="w-4 h-4" />
          Şifre Güvenliği
        </button>
      </div>

      {/* TAB 1: Personal Info */}
      {activeTab === 'info' && (
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-6 animate-in fade-in duration-150">
          <div>
            <h2 className="text-lg font-bold text-[#1E2534]">Kişisel Bilgileriniz</h2>
            <p className="text-slate-500 text-xs mt-0.5">Ad soyad ve telefon numaranızı buradan güncelleyebilirsiniz.</p>
          </div>

          {profileSuccess && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm rounded-2xl flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 shrink-0" />
              <span>{profileSuccess}</span>
            </div>
          )}

          {profileError && (
            <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-2xl flex items-center gap-3">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <span>{profileError}</span>
            </div>
          )}

          <form onSubmit={handleProfileSubmit(onSaveProfile)} className="space-y-5 max-w-lg">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Ad Soyad</label>
              <div className="relative">
                <User className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
                <input
                  type="text"
                  {...registerProfile('fullName')}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#4F8FE0] transition"
                  placeholder="Ad Soyad"
                />
              </div>
              {profileErrors.fullName && (
                <p className="text-rose-600 text-xs mt-1 font-medium">{profileErrors.fullName.message}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Telefon Numarası</label>
              <div className="relative">
                <Phone className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
                <input
                  type="text"
                  {...registerProfile('phone')}
                  onChange={(e) => setProfileValue('phone', formatPhoneInput(e.target.value))}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#4F8FE0] transition"
                  placeholder="0 (5XX) XXX XX XX"
                />
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={profileLoading}
                className="px-6 py-2.5 bg-[#4F8FE0] hover:bg-[#3b7dd3] text-white text-sm font-bold rounded-xl transition cursor-pointer flex items-center gap-2 disabled:opacity-50"
              >
                {profileLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                Değişiklikleri Kaydet
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TAB 2: Email Change with 6-digit Code */}
      {activeTab === 'email' && (
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-6 animate-in fade-in duration-150">
          <div>
            <h2 className="text-lg font-bold text-[#1E2534]">E-posta Adresi Değiştirme</h2>
            <p className="text-slate-500 text-xs mt-0.5">
              E-posta değişikliği güvenliğiniz için 6 haneli e-posta onay kodu gerektirir.
            </p>
          </div>

          {emailSuccess && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm rounded-2xl flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 shrink-0" />
              <span>{emailSuccess}</span>
            </div>
          )}

          {emailError && (
            <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-2xl flex items-center gap-3">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <span>{emailError}</span>
            </div>
          )}

          {emailStep === 'request' ? (
            <form onSubmit={onRequestEmailCode} className="space-y-5 max-w-lg">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Mevcut E-posta Adresiniz</label>
                <input
                  type="text"
                  disabled
                  value={user?.email || ''}
                  className="w-full px-4 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-sm text-slate-500 font-medium cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Yeni E-posta Adresi</label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
                  <input
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    required
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#4F8FE0] transition"
                    placeholder="yeni.eposta@ditas.com.tr"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Mevcut Şifreniz (Güvenlik Doğrulaması)</label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
                  <input
                    type="password"
                    value={emailCurrentPassword}
                    onChange={(e) => setEmailCurrentPassword(e.target.value)}
                    required
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#4F8FE0] transition"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={emailLoading}
                  className="px-6 py-2.5 bg-[#4F8FE0] hover:bg-[#3b7dd3] text-white text-sm font-bold rounded-xl transition cursor-pointer flex items-center gap-2 disabled:opacity-50"
                >
                  {emailLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  Doğrulama Kodu Gönder
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={onVerifyEmailCode} className="space-y-5 max-w-lg animate-in zoom-in-95 duration-150">
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl">
                <p className="text-xs text-slate-600">
                  <strong className="text-slate-800">{newEmail}</strong> adresine gönderilen 6 haneli doğrulama kodunu aşağıdaki alana giriniz:
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">6 Haneli Doğrulama Kodu</label>
                <input
                  type="text"
                  maxLength={6}
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="123456"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-300 rounded-xl text-center text-2xl font-bold tracking-widest font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#4F8FE0] transition"
                />
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="submit"
                  disabled={emailLoading}
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded-xl transition cursor-pointer flex items-center gap-2 disabled:opacity-50"
                >
                  {emailLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  Kodu Doğrula ve E-postayı Değiştir
                </button>

                <button
                  type="button"
                  onClick={() => setEmailStep('request')}
                  className="px-4 py-2.5 text-slate-600 hover:bg-slate-100 text-sm font-medium rounded-xl transition cursor-pointer"
                >
                  Geri Dön
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* TAB 3: Change Password */}
      {activeTab === 'password' && (
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-6 animate-in fade-in duration-150">
          <div>
            <h2 className="text-lg font-bold text-[#1E2534]">Şifre Değiştirme</h2>
            <p className="text-slate-500 text-xs mt-0.5">Hesap şifrenizi buradan yenileyebilirsiniz.</p>
          </div>

          {passSuccess && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm rounded-2xl flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 shrink-0" />
              <span>{passSuccess}</span>
            </div>
          )}

          {passError && (
            <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-2xl flex items-center gap-3">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <span>{passError}</span>
            </div>
          )}

          <form onSubmit={handlePassSubmit(onSavePassword)} className="space-y-5 max-w-lg">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Yeni Şifre</label>
              <div className="relative">
                <KeyRound className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
                <input
                  type="password"
                  {...registerPass('newPassword')}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#4F8FE0] transition"
                  placeholder="En az 6 karakter"
                />
              </div>
              {passErrors.newPassword && (
                <p className="text-rose-600 text-xs mt-1 font-medium">{passErrors.newPassword.message}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Yeni Şifre (Tekrar)</label>
              <div className="relative">
                <KeyRound className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
                <input
                  type="password"
                  {...registerPass('confirmPassword')}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#4F8FE0] transition"
                  placeholder="Şifreyi tekrar giriniz"
                />
              </div>
              {passErrors.confirmPassword && (
                <p className="text-rose-600 text-xs mt-1 font-medium">{passErrors.confirmPassword.message}</p>
              )}
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={passLoading}
                className="px-6 py-2.5 bg-[#4F8FE0] hover:bg-[#3b7dd3] text-white text-sm font-bold rounded-xl transition cursor-pointer flex items-center gap-2 disabled:opacity-50"
              >
                {passLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                Şifreyi Güncelle
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
