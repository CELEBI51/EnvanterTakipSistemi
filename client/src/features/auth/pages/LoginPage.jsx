import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate, Link } from 'react-router-dom';
import { Eye, EyeOff, Loader2, AlertCircle, ShieldCheck } from 'lucide-react';
import { z } from 'zod';
import axiosClient from '../../../api/axiosClient';
import useAuthStore from '../../../store/authStore';
import { API_BASE_URL } from '../../../config';
import { fetchCompanyInfo } from '../../../utils/logoHelper';

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
  const [logoSrc, setLogoSrc] = useState('/ditas-logo.png');
  const [companyName, setCompanyName] = useState('Ditas BDY Yedek Parça İmalat ve Teknik A.Ş.');

  useEffect(() => {
    fetchCompanyInfo().then((info) => {
      if (info.companyName) setCompanyName(info.companyName);
      if (info.logoSrc) setLogoSrc(info.logoSrc);
    });

    const handleInfoChange = (e) => {
      if (e.detail?.companyName) setCompanyName(e.detail.companyName);
      if (e.detail?.logoSrc) setLogoSrc(e.detail.logoSrc);
    };
    window.addEventListener('company-info-changed', handleInfoChange);
    return () => window.removeEventListener('company-info-changed', handleInfoChange);
  }, []);

  const navigate = useNavigate();
  const setAuth = useAuthStore((state) => state.setAuth);

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
      const resData = response.data?.data;

      if (resData && resData.accessToken && resData.user) {
        setAuth({
          user: resData.user,
          accessToken: resData.accessToken,
        });

        if (resData.user.mustChangePassword) {
          navigate('/force-change-password');
        } else {
          navigate('/');
        }
      } else {
        setErrorMessage('Giriş başarılı fakat kullanıcı bilgisi alınamadı.');
      }
    } catch (err) {
      console.error('Giriş hatası:', err);
      if (err.response && err.response.data && err.response.data.message) {
        setErrorMessage(err.response.data.message);
      } else {
        setErrorMessage('Sunucuya bağlanırken bir hata oluştu. Lütfen tekrar deneyin.');
      }
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#F5F4EF] flex flex-col justify-between items-center p-4 sm:p-6 md:p-8 font-sans">
      {/* Üst Dengeleme Boşluğu */}
      <div className="flex-1" />

      {/* Kart Konteyneri */}
      <main className="w-full max-w-[400px] mx-auto my-auto">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xl p-6 sm:p-8">
          
          {/* Logo & Başlık Alanı */}
          <div className="flex flex-col items-center text-center mb-6">
            <img 
              src={logoSrc} 
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = '/ditas-logo.png';
              }}
              alt="Logo" 
              className="h-24 w-auto max-w-full object-contain mb-3" 
            />
            <h1 className="font-heading text-lg font-bold text-[#1E2534] tracking-tight">
              ENVANTER TAKİP SİSTEMİ
            </h1>
          </div>

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

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
            {/* E-posta Alanı */}
            <div>
              <label
                htmlFor="email"
                className="block text-xs font-bold text-[#1E2534] mb-1.5"
              >
                Kurumsal E-posta
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="kullanici@ditas.com.tr"
                className={`w-full h-11 px-3.5 text-xs font-semibold bg-slate-50 text-[#1E2534] placeholder-slate-400 rounded-xl border ${
                  errors.email ? 'border-rose-500 focus:border-rose-500' : 'border-slate-200 focus:border-[#4C82F7]'
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
                className="block text-xs font-bold text-[#1E2534] mb-1.5"
              >
                Şifre
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className={`w-full h-11 pl-3.5 pr-10 text-xs font-semibold bg-slate-50 text-[#1E2534] placeholder-slate-400 rounded-xl border ${
                    errors.password ? 'border-rose-500 focus:border-rose-500' : 'border-slate-200 focus:border-[#4C82F7]'
                  } outline-none transition-all duration-150`}
                  {...register('password')}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex={-1}
                  aria-label={showPassword ? 'Şifreyi Gizle' : 'Şifreyi Göster'}
                  className="absolute right-0 top-0 h-11 px-3.5 flex items-center justify-center text-slate-400 hover:text-[#4C82F7] transition-colors focus:outline-none"
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

            {/* Şifremi Unuttum Bağlantısı */}
            <div className="flex items-center justify-end">
              <Link
                to="/forgot-password"
                className="text-xs font-semibold text-[#4C82F7] hover:underline"
              >
                Şifremi Unuttum?
              </Link>
            </div>

            {/* Giriş Yap Butonu */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full h-11 mt-2 bg-[#4C82F7] hover:bg-[#3D6FE0] active:bg-[#3566AD] text-white font-bold text-xs rounded-xl shadow-md hover:shadow-lg transition-all duration-150 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer"
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
        <footer className="text-xs text-slate-500 text-center font-medium">
          © Copyright 2026 | {companyName}. Tüm Hakları Saklıdır.
        </footer>
      </div>
    </div>
  );
}
