import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { z } from 'zod';
import { Eye, EyeOff, Loader2, AlertCircle, CheckCircle2, KeyRound, ShieldCheck } from 'lucide-react';
import axiosClient from '../../../api/axiosClient';
import { API_BASE_URL } from '../../../config';

import { fetchCompanyInfo } from '../../../utils/logoHelper';

const resetPasswordSchema = z
  .object({
    newPassword: z.string().min(8, 'Yeni şifre en az 8 karakter olmalıdır.'),
    confirmPassword: z.string().min(1, 'Şifre tekrarı zorunludur.'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Şifreler birbiriyle eşleşmiyor.',
    path: ['confirmPassword'],
  });

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();

  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [logoSrc, setLogoSrc] = useState('/ditas-logo.png');
  const [companyName, setCompanyName] = useState('Ditas BDY Yedek Parça İmalat ve Teknik A.Ş.');

  React.useEffect(() => {
    fetchCompanyInfo().then((info) => {
      if (info.companyName) setCompanyName(info.companyName);
      if (info.logoSrc) setLogoSrc(info.logoSrc);
    });
  }, []);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      newPassword: '',
      confirmPassword: '',
    },
  });

  const onSubmit = async (data) => {
    setErrorMessage('');
    setSuccessMessage('');

    if (!token) {
      setErrorMessage('Geçersiz veya eksik şifre sıfırlama bağlantısı.');
      return;
    }

    try {
      const response = await axiosClient.post('/auth/reset-password', {
        token,
        newPassword: data.newPassword,
      });

      setSuccessMessage(response.data?.message || 'Şifreniz başarıyla güncellendi.');
    } catch (error) {
      const msg = error.response?.data?.message || 'Şifre güncellenirken bir hata oluştu.';
      setErrorMessage(msg);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#F5F4EF] flex flex-col justify-between items-center p-4 sm:p-6 md:p-8 font-sans">
      {/* Üst Dengeleme Boşluğu */}
      <div className="flex-1" />

      {/* Kart Konteyneri */}
      <main className="w-full max-w-[420px] mx-auto my-auto">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xl p-6 sm:p-8">
          
          {/* Header & Logo */}
          <div className="flex flex-col items-center text-center mb-6">
            <img 
              src={logoSrc} 
              onError={() => setLogoSrc('/ditas-logo.png')}
              alt="Logo" 
              className="h-16 max-w-full object-contain mb-3" 
            />
            <h1 className="font-heading text-xl font-bold text-[#1E2534] tracking-tight">
              Yeni Şifre Belirleyin
            </h1>
            <p className="text-xs text-slate-500 mt-1 font-medium leading-relaxed">
              Hesabınız için lütfen güvenli yeni bir şifre tanımlayınız.
            </p>
          </div>

          {/* Eksik Token Bildirimi */}
          {!token && (
            <div
              role="alert"
              className="mb-5 p-3.5 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2.5 text-amber-900 text-xs font-semibold"
            >
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <span>Geçerli bir şifre sıfırlama token'ı bulunamadı. Lütfen e-postanızdaki bağlantıyı tekrar kontrol ediniz.</span>
            </div>
          )}

          {/* Hata Bildirimi */}
          {errorMessage && (
            <div
              role="alert"
              className="mb-5 p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5 text-rose-700 text-xs font-semibold"
            >
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Başarı Bildirimi */}
          {successMessage ? (
            <div className="text-center space-y-4">
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex flex-col items-center text-emerald-800 text-xs font-semibold gap-2">
                <CheckCircle2 className="w-8 h-8 text-emerald-600" />
                <span>{successMessage}</span>
              </div>
              <button
                type="button"
                onClick={() => navigate('/login')}
                className="w-full h-11 bg-[#4C82F7] hover:bg-[#3D6FE0] text-white font-bold text-xs rounded-xl shadow-md transition cursor-pointer"
              >
                Giriş Ekranına Git
              </button>
            </div>
          ) : (
            /* Form */
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
              {/* Yeni Şifre */}
              <div>
                <label htmlFor="newPassword" className="block text-xs font-bold text-[#1E2534] mb-1.5">
                  Yeni Şifre
                </label>
                <div className="relative">
                  <input
                    id="newPassword"
                    type={showNewPassword ? 'text' : 'password'}
                    placeholder="En az 8 karakter"
                    className={`w-full h-11 pl-3.5 pr-10 text-xs font-semibold bg-slate-50 text-[#1E2534] placeholder-slate-400 rounded-xl border ${
                      errors.newPassword ? 'border-rose-500 focus:border-rose-500' : 'border-slate-200 focus:border-[#4C82F7]'
                    } outline-none transition-all duration-150`}
                    {...register('newPassword')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    tabIndex={-1}
                    aria-label={showNewPassword ? 'Şifreyi Gizle' : 'Şifreyi Göster'}
                    className="absolute right-0 top-0 h-11 px-3.5 flex items-center justify-center text-slate-400 hover:text-[#4C82F7] transition-colors focus:outline-none"
                  >
                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {errors.newPassword && (
                  <p className="mt-1 text-[11px] text-rose-600 font-medium">
                    {errors.newPassword.message}
                  </p>
                )}
              </div>

              {/* Yeni Şifre Tekrar */}
              <div>
                <label htmlFor="confirmPassword" className="block text-xs font-bold text-[#1E2534] mb-1.5">
                  Yeni Şifre (Tekrar)
                </label>
                <div className="relative">
                  <input
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="Yeni şifreyi tekrar giriniz"
                    className={`w-full h-11 pl-3.5 pr-10 text-xs font-semibold bg-slate-50 text-[#1E2534] placeholder-slate-400 rounded-xl border ${
                      errors.confirmPassword ? 'border-rose-500 focus:border-rose-500' : 'border-slate-200 focus:border-[#4C82F7]'
                    } outline-none transition-all duration-150`}
                    {...register('confirmPassword')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    tabIndex={-1}
                    aria-label={showConfirmPassword ? 'Şifreyi Gizle' : 'Şifreyi Göster'}
                    className="absolute right-0 top-0 h-11 px-3.5 flex items-center justify-center text-slate-400 hover:text-[#4C82F7] transition-colors focus:outline-none"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {errors.confirmPassword && (
                  <p className="mt-1 text-[11px] text-rose-600 font-medium">
                    {errors.confirmPassword.message}
                  </p>
                )}
              </div>

              {/* Kaydet Butonu */}
              <button
                type="submit"
                disabled={isSubmitting || !token}
                className="w-full h-11 mt-2 bg-[#4C82F7] hover:bg-[#3D6FE0] active:bg-[#3566AD] text-white font-bold text-xs rounded-xl shadow-md hover:shadow-lg transition-all duration-150 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    <span>Şifre Güncelleniyor...</span>
                  </>
                ) : (
                  <span>Şifreyi Güncelle</span>
                )}
              </button>
            </form>
          )}

          {/* Geri Dön Linki */}
          {!successMessage && (
            <div className="mt-6 pt-4 border-t border-slate-100 text-center">
              <Link
                to="/login"
                className="text-xs text-slate-500 hover:text-[#4C82F7] font-semibold transition-colors cursor-pointer"
              >
                Giriş Ekranına Dön
              </Link>
            </div>
          )}
        </div>
      </main>

      {/* Alt Dengeleme Boşluğu ve Bilgi Notu */}
      <div className="flex-1 flex flex-col justify-end pb-2 pt-6">
        <footer className="text-xs text-slate-500 text-center font-medium">
          © Copyright 2026 | {companyName}. Tüm Hakları Saklıdır.
        </footer>
      </div>
    </div>
  );
}
