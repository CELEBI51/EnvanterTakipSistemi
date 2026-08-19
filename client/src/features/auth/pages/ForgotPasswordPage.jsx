import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from 'react-router-dom';
import { z } from 'zod';
import { Mail, Loader2, AlertCircle, CheckCircle2, ArrowLeft, ShieldCheck } from 'lucide-react';
import axiosClient from '../../../api/axiosClient';

const forgotPasswordSchema = z.object({
  email: z
    .string()
    .min(1, 'E-posta adresi gereklidir.')
    .email('Geçerli bir e-posta adresi giriniz.'),
});

export default function ForgotPasswordPage() {
  const [infoMessage, setInfoMessage] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: '',
    },
  });

  const onSubmit = async (data) => {
    setInfoMessage('');
    setIsSuccess(false);

    try {
      const response = await axiosClient.post('/auth/forgot-password', data);
      const msg = response.data?.message || 'Eğer bu e-posta sistemde kayıtlıysa, sıfırlama bağlantısı gönderildi.';
      setInfoMessage(msg);
      setIsSuccess(true);
    } catch (error) {
      const errorMsg = error.response?.data?.message || 'Bir hata oluştu. Lütfen tekrar deneyiniz.';
      setInfoMessage(errorMsg);
      setIsSuccess(false);
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
            <img src="/ditas-logo.png" alt="DİTAŞ Logo" className="h-16 max-w-full object-contain mb-3" />
            <h1 className="font-heading text-xl font-bold text-[#1E2534] tracking-tight">
              Şifremi Unuttum
            </h1>
            <p className="text-xs text-slate-500 mt-1 font-medium leading-relaxed">
              Hesabınıza tanımlı kurumsal e-posta adresinizi giriniz. Şifre sıfırlama bağlantısı e-postanıza gönderilecektir.
            </p>
          </div>

          {/* Bilgi / Yanıt Mesajı */}
          {infoMessage && (
            <div
              role="alert"
              className={`mb-5 p-3.5 rounded-xl flex items-start gap-2.5 text-xs font-semibold ${
                isSuccess
                  ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                  : 'bg-rose-50 border border-rose-200 text-rose-700'
              }`}
            >
              {isSuccess ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              )}
              <span>{infoMessage}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
            <div>
              <label htmlFor="email" className="block text-xs font-bold text-[#1E2534] mb-1.5">
                Kurumsal E-posta Adresi
              </label>
              <div className="relative">
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="kullanici@ditas.com.tr"
                  className={`w-full h-11 pl-3.5 pr-10 text-xs font-semibold bg-slate-50 text-[#1E2534] placeholder-slate-400 rounded-xl border ${
                    errors.email ? 'border-rose-500 focus:border-rose-500' : 'border-slate-200 focus:border-[#4C82F7]'
                  } outline-none transition-all duration-150`}
                  {...register('email')}
                />
                <div className="absolute right-0 top-0 h-11 px-3.5 flex items-center justify-center text-slate-400 pointer-events-none">
                  <Mail className="w-4 h-4" />
                </div>
              </div>
              {errors.email && (
                <p className="mt-1 text-[11px] text-rose-600 font-medium">
                  {errors.email.message}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full h-11 mt-2 bg-[#4C82F7] hover:bg-[#3D6FE0] active:bg-[#3566AD] text-white font-bold text-xs rounded-xl shadow-md hover:shadow-lg transition-all duration-150 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span>Bağlantı Gönderiliyor...</span>
                </>
              ) : (
                <span>Sıfırlama Bağlantısı Gönder</span>
              )}
            </button>
          </form>

          {/* Geri Dön Linki */}
          <div className="mt-6 pt-4 border-t border-slate-100 text-center">
            <Link
              to="/login"
              className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-[#4C82F7] font-semibold transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Giriş Ekranına Dön</span>
            </Link>
          </div>
        </div>
      </main>

      {/* Alt Dengeleme Boşluğu ve Bilgi Notu */}
      <div className="flex-1 flex flex-col justify-end pb-2 pt-6">
        <footer className="flex items-center justify-center gap-1.5 text-xs text-slate-500 text-center font-medium">
          <ShieldCheck className="w-3.5 h-3.5 text-[#4C82F7]" />
          <span>Bu sistem yalnızca DİTAŞ Otomotiv iç ağında kullanılır. © 2026</span>
        </footer>
      </div>
    </div>
  );
}
