import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate } from 'react-router-dom';
import { Tag, Eye, EyeOff, Loader2, AlertCircle, ShieldCheck } from 'lucide-react';
import { z } from 'zod';
import axiosClient from '../../../api/axiosClient';
import useAuthStore from '../../../store/authStore';

const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'E-posta adresi gereklidir')
    .email('Geçerli bir e-posta adresi giriniz'),
  password: z.string().min(1, 'Şifre gereklidir'),
});

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const setAuth = useAuthStore((state) => state.setAuth);
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = async (data) => {
    setErrorMessage('');
    try {
      const response = await axiosClient.post('/auth/login', data);
      
      const resData = response.data?.data || response.data;
      const token = resData?.accessToken || resData?.token;
      const user = resData?.user;

      if (token && user) {
        setAuth({ user, accessToken: token });
        const userRole = user.role?.toLowerCase() || '';
        if (userRole === 'admin') {
          navigate('/admin');
        } else {
          navigate('/dashboard');
        }
      } else {
        setErrorMessage('E-posta veya şifre hatalı');
      }
    } catch (error) {
      setErrorMessage('E-posta veya şifre hatalı');
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#F0F4F8] flex flex-col justify-between items-center p-4 sm:p-6 md:p-8">
      {/* Üst Dengeleme Boşluğu */}
      <div className="flex-1" />

      {/* Kart Konteyneri */}
      <main className="w-full max-w-[400px] mx-auto my-auto">
        <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-sm p-6 sm:p-8">
          
          {/* Logo & Başlık Alanı */}
          <div className="flex flex-col items-center text-center mb-6">
            <div className="w-11 h-11 rounded-lg bg-[#1E2534] text-[#4F8FE0] flex items-center justify-center mb-3.5 shadow-sm">
              <Tag className="w-5 h-5 stroke-[2.25]" />
            </div>
            <h1 className="font-heading text-xl font-bold text-[#1E2534] tracking-tight">
              Demirbaş Takip Sistemi
            </h1>
            <p className="text-xs text-[#5C6470] mt-1 font-medium">
              Kurumsal İç Ağ Kurulumu
            </p>
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
            {/* E-posta Alanı */}
            <div>
              <label
                htmlFor="email"
                className="block text-xs font-semibold text-[#1E2534] mb-1.5"
              >
                E-posta
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="kullanici@sirket.com"
                className={`w-full h-11 px-3.5 text-sm bg-white text-[#1E2534] placeholder:text-slate-400 rounded-lg border ${
                  errors.email ? 'border-rose-400 focus:border-rose-500 focus:ring-1 focus:ring-rose-500' : 'border-[#CBD5E1] focus:border-[#4F8FE0] focus:ring-1 focus:ring-[#4F8FE0]'
                } outline-none transition-all duration-150`}
                {...register('email')}
              />
              {errors.email && (
                <p className="mt-1 text-[11px] text-rose-600 font-medium">
                  {errors.email.message}
                </p>
              )}
            </div>

            {/* Şifre Alanı */}
            <div>
              <label
                htmlFor="password"
                className="block text-xs font-semibold text-[#1E2534] mb-1.5"
              >
                Şifre
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className={`w-full h-11 pl-3.5 pr-10 text-sm bg-white text-[#1E2534] placeholder:text-slate-400 rounded-lg border ${
                    errors.password ? 'border-rose-400 focus:border-rose-500 focus:ring-1 focus:ring-rose-500' : 'border-[#CBD5E1] focus:border-[#4F8FE0] focus:ring-1 focus:ring-[#4F8FE0]'
                  } outline-none transition-all duration-150`}
                  {...register('password')}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex={-1}
                  aria-label={showPassword ? 'Şifreyi Gizle' : 'Şifreyi Göster'}
                  className="absolute right-0 top-0 h-11 px-3.5 flex items-center justify-center text-slate-400 hover:text-[#1E2534] transition-colors focus:outline-none"
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
              {errors.password && (
                <p className="mt-1 text-[11px] text-rose-600 font-medium">
                  {errors.password.message}
                </p>
              )}
            </div>

            {/* Giriş Yap Butonu */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full h-11 mt-2 bg-[#4F8FE0] hover:bg-[#3D75C4] active:bg-[#3566AD] text-white font-semibold text-sm rounded-lg shadow-sm transition-all duration-150 flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-[#4F8FE0] focus:ring-offset-2 disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span>Giriş yapılıyor...</span>
                </>
              ) : (
                <span>Giriş Yap</span>
              )}
            </button>
          </form>
        </div>
      </main>

      {/* Alt Dengeleme Boşluğu ve Bilgi Notu */}
      <div className="flex-1 flex flex-col justify-end pb-2 pt-6">
        <footer className="flex items-center justify-center gap-1.5 text-xs text-[#5C6470] text-center font-medium">
          <ShieldCheck className="w-3.5 h-3.5 text-[#1E2534]/60" />
          <span>Bu sistem yalnızca şirket iç ağında kullanılır.</span>
        </footer>
      </div>
    </div>
  );
}
