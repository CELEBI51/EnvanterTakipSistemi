import React, { useState } from 'react';
import { X, Copy, Check, ShieldAlert, KeyRound, Loader2 } from 'lucide-react';
import axiosClient from '../../../api/axiosClient';

export default function ResetPasswordModal({ isOpen, onClose, user, onSuccess }) {
  const [newTempPassword, setNewTempPassword] = useState(null);
  const [copied, setCopied] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [apiError, setApiError] = useState('');

  if (!isOpen || !user) return null;

  const handleModalClose = () => {
    setNewTempPassword(null);
    setCopied(false);
    setApiError('');
    onClose();
  };

  const handleResetPassword = async () => {
    setIsSubmitting(true);
    setApiError('');
    try {
      const response = await axiosClient.put(`/users/${user.id}/reset-password`);
      const resData = response.data?.data;
      if (resData && resData.temporaryPassword) {
        setNewTempPassword(resData.temporaryPassword);
        if (onSuccess) onSuccess();
      }
    } catch (err) {
      setApiError(err.response?.data?.message || 'Şifre sıfırlanırken bir hata oluştu.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyPassword = () => {
    if (newTempPassword) {
      navigator.clipboard.writeText(newTempPassword);
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

        {newTempPassword ? (
          /* 1. Aşama: Sıfırlanan Geçici Şifre Gösterim Ekranı */
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                <Check className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-heading text-lg font-bold text-[#1E2534]">Şifre Sıfırlandı</h3>
                <p className="text-xs text-slate-500">{user.fullName} ({user.email})</p>
              </div>
            </div>

            <div className="p-3.5 bg-amber-50 border border-amber-200/80 rounded-lg flex items-start gap-2.5 text-amber-900 text-xs font-medium">
              <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <span>Yeni geçici şifreyi kopyalayın. Bu şifre veritabanında saklanmaz ve <strong>bir daha gösterilmeyecektir!</strong></span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Yeni Geçici Şifre
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={newTempPassword}
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
                Tamam, Kapat
              </button>
            </div>
          </div>
        ) : (
          /* 2. Aşama: Sıfırlama Onay Ekranı */
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-blue-100 text-[#4F8FE0] flex items-center justify-center shrink-0">
                <KeyRound className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-heading text-lg font-bold text-[#1E2534]">Şifre Sıfırlama Onayı</h3>
                <p className="text-xs text-slate-500">{user.fullName}</p>
              </div>
            </div>

            <p className="text-xs sm:text-sm text-slate-600 mb-5 leading-relaxed">
              <strong>{user.email}</strong> kullanıcısının mevcut şifresi sıfırlanacak ve rastgele 10 karakterli yeni bir geçici şifre üretilecektir. Kullanıcı ilk girişinde şifresini değiştirmek zorunda kalacaktır.
            </p>

            {apiError && (
              <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium rounded-lg">
                {apiError}
              </div>
            )}

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={handleModalClose}
                disabled={isSubmitting}
                className="px-4 h-10 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer"
              >
                İptal
              </button>
              <button
                type="button"
                onClick={handleResetPassword}
                disabled={isSubmitting}
                className="px-5 h-10 bg-[#4F8FE0] hover:bg-[#3D75C4] text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-60"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Sıfırlanıyor...</span>
                  </>
                ) : (
                  <span>Evet, Şifreyi Sıfırla</span>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
