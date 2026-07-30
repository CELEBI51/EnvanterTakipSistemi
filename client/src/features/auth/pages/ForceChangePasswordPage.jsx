import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { Tag, KeyRound, Eye, EyeOff, Loader2, AlertCircle, ShieldAlert, LogOut } from 'lucide-react';
import axiosClient from '../../../api/axiosClient';
import useAuthStore from '../../../store/authStore';

const forceChangeSchema = z
  .object({
    newPassword: z.string().min(6, 'Yeni şifre en az 6 karakter olmalıdır.'),
    confirmPassword: z.string().min(1, 'Şifre tekrarı zorunludur.'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Yeni şifreler birbiriyle eşleşmiyor.',
    path: ['confirmPassword'],
  });

export default function ForceChangePasswordPage() {
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  
  const { user, setAuth, clearAuth } = useAuthStore();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(forceChangeSchema),
    defaultValues: {
      newPassword: '',
      confirmPassword: '',
    },
  });

  const onSubmit = async (data) => {
    setErrorMessage('');
    try {
      const response = await axiosClient.put('/auth/change-password', {
        newPassword: data.newPassword,
        confirmPassword: data.confirmPassword,
      });

      const resData = response.data?.data;
      if (resData && resData.accessToken && resData.user) {
        setAuth({
          user: resData.user,
          accessToken: resData.accessToken,
        });

        const userRole = resData.user.role?.toLowerCase();
        if (userRole === 'admin') {
          navigate('/admin');
        } else {
          navigate('/dashboard');
        }
      }
    } catch (err) {
      setErrorMessage(err.response?.data?.message || 'Şifre güncellenirken bir hata oluştu.');
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#F0F4F8] flex flex-col justify-between items-center p-4 sm:p-6 md:p-8">
      {/* Üst Dengeleme Boşluğu */}
      <div className="flex-1" />

      {/* Kart Konteyneri */}
      <main className="w-full max-w-[420px] mx-auto my-auto">
        <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-sm p-6 sm:p-8">
          
          {/* Logo & Başlık */}
          <div className="flex flex-col items-center text-center mb-6">
            <div className="w-12 h-12 rounded-xl bg-[#1E2534] text-[#4F8FE0] flex items-center justify-center mb-3 shadow-sm">
              <KeyRound className="w-6 h-6 stroke-[2.25]" />
            </div>
            <h1 className="font-heading text-xl sm:text-22px font-bold text-[#1E2534] tracking-tight">
              Şifrenizi Değiştirin
            </h1>
            <p className="text-xs text-slate-500 mt-1 font-medium">
              Hoş geldiniz, <strong>{user?.fullName || user?.email}</strong>. İlk girişiniz olduğu için yeni bir şifre belirlemeniz gerekmektedir.
            </p>
          </div>

          <div className="mb-5 p-3.5 bg-amber-50 border border-amber-200/80 rounded-lg flex items-start gap-2.5 text-amber-900 text-xs font-medium">
            <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <span>Güvenliğiniz için lütfen yalnızca sizin bileceğiniz yeni bir şifre belirleyin.</span>
          </div>

          {/* Hata Bildirimi */}
          {errorMessage && (
            <div
              role="alert"
              className="mb-5 p-3.5 bg-rose-50 border border-rose-200/80 rounded-lg flex items-start gap-2.5 text-rose-800 text-xs font-medium"
            >
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
            {/* Yeni Şifre */}
            <div>
              <label htmlFor="newPassword" className="block text-xs font-semibold text-[#1E2534] mb-1.5">
                Yeni Şifre
              </label>
              <div className="relative">
                <input
                  id="newPassword"
                  type={showNewPassword ? 'text' : 'password'}
                  placeholder="En az 6 karakter"
                  className={`w-full h-11 pl-3.5 pr-10 text-sm bg-white text-[#1E2534] placeholder:text-slate-400 rounded-lg border ${
                    errors.newPassword ? 'border-rose-400 focus:border-rose-500 focus:ring-1 focus:ring-rose-500' : 'border-[#CBD5E1] focus:border-[#4F8FE0] focus:ring-1 focus:ring-[#4F8FE0]'
                  } outline-none transition-all duration-150`}
                  {...register('newPassword')}
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  tabIndex={-1}
                  className="absolute right-0 top-0 h-11 px-3.5 flex items-center justify-center text-slate-400 hover:text-[#1E2534] transition-colors focus:outline-none"
                >
                  {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.newPassword && (
                <p className="mt-1 text-[11px] text-rose-600 font-medium">{errors.newPassword.message}</p>
              )}
            </div>

            {/* Yeni Şifre Tekrar */}
            <div>
              <label htmlFor="confirmPassword" className="block text-xs font-semibold text-[#1E2534] mb-1.5">
                Yeni Şifre (Tekrar)
              </label>
              <div className="relative">
                <input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="Yeni şifreyi tekrar giriniz"
                  className={`w-full h-11 pl-3.5 pr-10 text-sm bg-white text-[#1E2534] placeholder:text-slate-400 rounded-lg border ${
                    errors.confirmPassword ? 'border-rose-400 focus:border-rose-500 focus:ring-1 focus:ring-rose-500' : 'border-[#CBD5E1] focus:border-[#4F8FE0] focus:ring-1 focus:ring-[#4F8FE0]'
                  } outline-none transition-all duration-150`}
                  {...register('confirmPassword')}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  tabIndex={-1}
                  className="absolute right-0 top-0 h-11 px-3.5 flex items-center justify-center text-slate-400 hover:text-[#1E2534] transition-colors focus:outline-none"
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.confirmPassword && (
                <p className="mt-1 text-[11px] text-rose-600 font-medium">{errors.confirmPassword.message}</p>
              )}
            </div>

            {/* Kaydet Butonu */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full h-11 mt-2 bg-[#4F8FE0] hover:bg-[#3D75C4] active:bg-[#3566AD] text-white font-semibold text-sm rounded-lg shadow-sm transition-all duration-150 flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-[#4F8FE0] focus:ring-offset-2 disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span>Şifre Kaydediliyor...</span>
                </>
              ) : (
                <span>Şifreyi Güncelle ve Devam Et</span>
              )}
            </button>
          </form>

          {/* Çıkış Yap Bağlantısı */}
          <div className="mt-6 pt-4 border-t border-slate-100 text-center">
            <button
              onClick={clearAuth}
              className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700 font-medium transition-colors cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Oturumu Kapat ve Giriş Ekranına Dön</span>
            </button>
          </div>
        </div>
      </main>

      {/* Alt Dengeleme Boşluğu */}
      <div className="flex-1" />
    </div>
  );
}
