import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Loader2, AlertCircle, ShieldCheck, Building2 } from 'lucide-react';
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
        navigate('/dashboard');
      } else {
        setErrorMessage('E-posta veya şifre hatalı');
      }
    } catch (error) {
      setErrorMessage('E-posta veya şifre hatalı');
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#F7F9FC] flex flex-col justify-between items-center p-4 sm:p-6 md:p-8 font-sans">
      {/* Üst Dengeleme Boşluğu */}
      <div className="flex-1" />

      {/* Kart Konteyneri */}
      <main className="w-full max-w-[400px] mx-auto my-auto">
        <div className="bg-white rounded-[10px] border border-[#E5E7EB] shadow-xs p-6 sm:p-8">
          
          {/* DİTAŞ Logo & Başlık Alanı */}
          <div className="flex flex-col items-center text-center mb-6">
            <div className="w-16 h-16 rounded-2xl bg-white flex items-center justify-center p-2 mb-3 shadow-md border border-slate-100">
              <img src="/ditas-logo.png" alt="DİTAŞ Logo" className="w-full h-full object-contain" />
            </div>
            <h1 className="font-heading text-xl font-bold text-[#0B2C55] tracking-tight">
              DİTAŞ OTOMOTİV
            </h1>
            <p className="text-xs text-[#6B7280] mt-1 font-semibold uppercase tracking-wider">
              Demirbaş Takip Sistemi
            </p>
          </div>

          {/* Hata Bildirimi */}
          {errorMessage && (
            <div
              role="alert"
              className="mb-5 p-3.5 bg-rose-50 border border-rose-200 rounded-[10px] flex items-start gap-2.5 text-[#DC2626] text-xs font-medium"
            >
              <AlertCircle className="w-4 h-4 text-[#DC2626] shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
            {/* E-posta Alanı */}
            <div>
              <label
                htmlFor="email"
                className="block text-xs font-semibold text-[#1F2937] mb-1.5"
              >
                Kurumsal E-posta
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="kullanici@ditas.com.tr"
                className={`w-full h-11 px-3.5 text-xs font-normal bg-white text-[#1F2937] placeholder-[#6B7280] rounded-[10px] border ${
                  errors.email ? 'border-[#DC2626] focus:border-[#DC2626]' : 'border-[#E5E7EB] focus:border-[#2F6BFF]'
                } outline-none transition-all duration-150`}
                {...register('email')}
              />
              {errors.email && (
                <p className="mt-1 text-[11px] text-[#DC2626] font-medium">
                  {errors.email.message}
                </p>
              )}
            </div>

            {/* Şifre Alanı */}
            <div>
              <label
                htmlFor="password"
                className="block text-xs font-semibold text-[#1F2937] mb-1.5"
              >
                Şifre
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className={`w-full h-11 pl-3.5 pr-10 text-xs font-normal bg-white text-[#1F2937] placeholder-[#6B7280] rounded-[10px] border ${
                    errors.password ? 'border-[#DC2626] focus:border-[#DC2626]' : 'border-[#E5E7EB] focus:border-[#2F6BFF]'
                  } outline-none transition-all duration-150`}
                  {...register('password')}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex={-1}
                  aria-label={showPassword ? 'Şifreyi Gizle' : 'Şifreyi Göster'}
                  className="absolute right-0 top-0 h-11 px-3.5 flex items-center justify-center text-[#6B7280] hover:text-[#0B2C55] transition-colors focus:outline-none"
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
              {errors.password && (
                <p className="mt-1 text-[11px] text-[#DC2626] font-medium">
                  {errors.password.message}
                </p>
              )}
            </div>

            {/* Giriş Yap Butonu (Primary Filled Navy #0B2C55, 10px radius) */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full h-11 mt-2 bg-[#0B2C55] hover:bg-[#163B6B] active:bg-[#082243] text-white font-semibold text-xs rounded-[10px] shadow-xs transition-all duration-150 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span>Giriş yapılıyor...</span>
                </>
              ) : (
                <span>Güvenli Giriş Yap</span>
              )}
            </button>
          </form>
        </div>
      </main>

      {/* Alt Dengeleme Boşluğu ve Bilgi Notu */}
      <div className="flex-1 flex flex-col justify-end pb-2 pt-6">
        <footer className="flex items-center justify-center gap-1.5 text-xs text-[#6B7280] text-center font-medium">
          <ShieldCheck className="w-3.5 h-3.5 text-[#0B2C55]" />
          <span>Bu sistem yalnızca DİTAŞ Otomotiv iç ağında kullanılır. © 2026</span>
        </footer>
      </div>
    </div>
  );
}
