import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X, Copy, Check, ShieldAlert, UserPlus, Loader2 } from 'lucide-react';
import axiosClient from '../../../api/axiosClient';

const addUserSchema = z.object({
  fullName: z
    .string()
    .min(2, 'Ad soyad en az 2 karakter olmalıdır.'),
  email: z
    .string()
    .email('Geçerli bir e-posta adresi giriniz.'),
  role: z.enum(['admin', 'it_staff', 'viewer'], {
    errorMap: () => ({ message: 'Lütfen bir rol seçiniz.' }),
  }),
});

export default function AddUserModal({ isOpen, onClose, onSuccess }) {
  const [createdUserPassword, setCreatedUserPassword] = useState(null);
  const [copied, setCopied] = useState(false);
  const [apiError, setApiError] = useState('');

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(addUserSchema),
    defaultValues: {
      fullName: '',
      email: '',
      role: 'it_staff',
    },
  });

  if (!isOpen) return null;

  const handleModalClose = () => {
    reset();
    setCreatedUserPassword(null);
    setCopied(false);
    setApiError('');
    onClose();
  };

  const onSubmit = async (data) => {
    setApiError('');
    try {
      const response = await axiosClient.post('/users', data);
      const resData = response.data?.data;
      if (resData && resData.temporaryPassword) {
        setCreatedUserPassword({
          fullName: resData.user.fullName,
          email: resData.user.email,
          password: resData.temporaryPassword,
        });
        if (onSuccess) onSuccess();
      }
    } catch (err) {
      setApiError(err.response?.data?.message || 'Kullanıcı oluşturulurken bir hata oluştu.');
    }
  };

  const handleCopyPassword = () => {
    if (createdUserPassword?.password) {
      navigator.clipboard.writeText(createdUserPassword.password);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-md rounded-xl border border-[#E2E8F0] shadow-xl p-6 relative">
        <button
          onClick={handleModalClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* 1. Aşama: Şifre Üretildi ve 1 Kerelik Gösterim Ekranı */}
        {createdUserPassword ? (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                <Check className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-heading text-lg font-bold text-[#1E2534]">Kullanıcı Oluşturuldu</h3>
                <p className="text-xs text-slate-500">{createdUserPassword.fullName} ({createdUserPassword.email})</p>
              </div>
            </div>

            <div className="p-3.5 bg-amber-50 border border-amber-200/80 rounded-lg flex items-start gap-2.5 text-amber-900 text-xs font-medium">
              <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <span>Bu geçici şifreyi kopyalayın. Şifre veritabanında saklanmaz ve <strong>bir daha gösterilmeyecektir!</strong></span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Üretilen Geçici Şifre
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={createdUserPassword.password}
                  className="w-full h-11 px-3.5 text-sm font-mono bg-slate-50 font-bold text-[#1E2534] rounded-lg border border-slate-300 outline-none select-all"
                />
                <button
                  type="button"
                  onClick={handleCopyPassword}
                  className="h-11 px-4 bg-[#4F8FE0] hover:bg-[#3D75C4] active:bg-[#3566AD] text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shrink-0 transition-colors cursor-pointer"
                >
                  {copied ? (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Kopyalandı</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      <span>Kopyala</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            <div className="pt-3 flex justify-end">
              <button
                type="button"
                onClick={handleModalClose}
                className="w-full h-11 bg-[#1E2534] hover:bg-[#2D3748] text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
              >
                Anladım, Kapat
              </button>
            </div>
          </div>
        ) : (
          /* 2. Aşama: Form Ekranı */
          <div>
            <div className="flex items-center gap-2.5 mb-5">
              <div className="w-9 h-9 rounded-lg bg-[#1E2534] text-[#4F8FE0] flex items-center justify-center shrink-0">
                <UserPlus className="w-4 h-4" />
              </div>
              <h3 className="font-heading text-lg font-bold text-[#1E2534]">Yeni Kullanıcı Ekle</h3>
            </div>

            {apiError && (
              <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium rounded-lg">
                {apiError}
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
              <div>
                <label className="block text-xs font-semibold text-[#1E2534] mb-1">Ad Soyad</label>
                <input
                  type="text"
                  placeholder="Ahmet Yılmaz"
                  className={`w-full h-10 px-3 text-sm bg-white text-[#1E2534] rounded-lg border ${
                    errors.fullName ? 'border-rose-400' : 'border-[#CBD5E1] focus:border-[#4F8FE0] focus:ring-1 focus:ring-[#4F8FE0]'
                  } outline-none`}
                  {...register('fullName')}
                />
                {errors.fullName && <p className="mt-1 text-[11px] text-rose-600">{errors.fullName.message}</p>}
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#1E2534] mb-1">E-posta Adresi</label>
                <input
                  type="email"
                  placeholder="ahmet.yilmaz@firma.com"
                  className={`w-full h-10 px-3 text-sm bg-white text-[#1E2534] rounded-lg border ${
                    errors.email ? 'border-rose-400' : 'border-[#CBD5E1] focus:border-[#4F8FE0] focus:ring-1 focus:ring-[#4F8FE0]'
                  } outline-none`}
                  {...register('email')}
                />
                {errors.email && <p className="mt-1 text-[11px] text-rose-600">{errors.email.message}</p>}
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#1E2534] mb-1">Sistem Rolü</label>
                <select
                  className="w-full h-10 px-3 text-sm bg-white text-[#1E2534] rounded-lg border border-[#CBD5E1] focus:border-[#4F8FE0] outline-none"
                  {...register('role')}
                >
                  <option value="it_staff">IT Personeli (it_staff)</option>
                  <option value="viewer">İzleyici / Standart (viewer)</option>
                  <option value="admin">Yönetici (admin)</option>
                </select>
                {errors.role && <p className="mt-1 text-[11px] text-rose-600">{errors.role.message}</p>}
              </div>

              <div className="pt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={handleModalClose}
                  disabled={isSubmitting}
                  className="px-4 h-10 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 h-10 bg-[#4F8FE0] hover:bg-[#3D75C4] text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-60"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Oluşturuluyor...</span>
                    </>
                  ) : (
                    <span>Kullanıcıyı Kaydet</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
