import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X, Copy, Check, ShieldAlert, UserPlus, Loader2, Shield, ChevronDown, ChevronRight } from 'lucide-react';
import axiosClient from '../../../api/axiosClient';
import { MODULE_PERMISSIONS, ALL_PERMISSIONS } from '../../../utils/permissions';

const addUserSchema = z.object({
  fullName: z
    .string()
    .min(2, 'Ad soyad en az 2 karakter olmalıdır.'),
  email: z
    .string()
    .email('Geçerli bir e-posta adresi giriniz.'),
  role: z.enum(['admin', 'it_staff'], {
    errorMap: () => ({ message: 'Lütfen bir rol seçiniz.' }),
  }),
});

export default function AddUserModal({ isOpen, onClose, onSuccess }) {
  const [createdUserPassword, setCreatedUserPassword] = useState(null);
  const [copied, setCopied] = useState(false);
  const [apiError, setApiError] = useState('');
  const [selectedPermissions, setSelectedPermissions] = useState([...ALL_PERMISSIONS]);
  const [expandedModules, setExpandedModules] = useState(() =>
    MODULE_PERMISSIONS.reduce((acc, mod) => ({ ...acc, [mod.key]: true }), {})
  );

  const toggleModuleAccordion = (modKey) => {
    setExpandedModules((prev) => ({ ...prev, [modKey]: !prev[modKey] }));
  };

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(addUserSchema),
    defaultValues: {
      fullName: '',
      email: '',
      role: 'it_staff',
    },
  });

  const selectedRole = watch('role');

  const parentCheckboxRefs = useRef({});

  // Derives whether all sub-permissions of a module are selected
  const isModuleAllSelected = useCallback((moduleObj) => {
    const allModuleCodes = [
      moduleObj.viewPermission,
      ...moduleObj.subPermissions.map((s) => s.key),
    ];
    return allModuleCodes.every((code) => selectedPermissions.includes(code));
  }, [selectedPermissions]);

  // Derives whether some (but not all) sub-permissions are selected
  const isModuleIndeterminate = useCallback((moduleObj) => {
    const subCodes = moduleObj.subPermissions.map((s) => s.key);
    const selectedSubCount = subCodes.filter((code) => selectedPermissions.includes(code)).length;
    const viewSelected = selectedPermissions.includes(moduleObj.viewPermission);
    if (selectedSubCount > 0 && selectedSubCount < subCodes.length) return true;
    if (viewSelected && selectedSubCount < subCodes.length) return true;
    return false;
  }, [selectedPermissions]);

  // Sync indeterminate property on parent checkbox DOM elements
  useEffect(() => {
    MODULE_PERMISSIONS.forEach((mod) => {
      const ref = parentCheckboxRefs.current[mod.key];
      if (ref) {
        ref.indeterminate = isModuleIndeterminate(mod);
      }
    });
  }, [selectedPermissions, isModuleIndeterminate]);

  if (!isOpen) return null;

  const handleModalClose = () => {
    reset();
    setCreatedUserPassword(null);
    setCopied(false);
    setApiError('');
    setSelectedPermissions([...ALL_PERMISSIONS]);
    setExpandedModules(
      MODULE_PERMISSIONS.reduce((acc, mod) => ({ ...acc, [mod.key]: true }), {})
    );
    onClose();
  };

  const isPermissionSelected = (code) => selectedPermissions.includes(code);

  // Smart toggle for the parent (view) checkbox
  const toggleParentPermission = (moduleObj) => {
    const allModuleCodes = [
      moduleObj.viewPermission,
      ...moduleObj.subPermissions.map((s) => s.key),
    ];
    const allSelected = allModuleCodes.every((code) => selectedPermissions.includes(code));

    if (allSelected) {
      setSelectedPermissions((prev) => prev.filter((code) => !allModuleCodes.includes(code)));
    } else {
      setSelectedPermissions((prev) => Array.from(new Set([...prev, ...allModuleCodes])));
    }
  };

  // Smart toggle for a sub-permission: auto-adds parent viewPermission if checked, but doesn't remove parent if unchecked
  const toggleSubPermission = (moduleObj, subCode) => {
    setSelectedPermissions((prev) => {
      let next;
      if (prev.includes(subCode)) {
        next = prev.filter((p) => p !== subCode);
      } else {
        next = [...prev, subCode];
      }

      if (next.includes(subCode) && !next.includes(moduleObj.viewPermission)) {
        next = [...next, moduleObj.viewPermission];
      }

      return next;
    });
  };

  const toggleModuleAll = (moduleObj) => {
    const allModuleCodes = [
      moduleObj.viewPermission,
      ...moduleObj.subPermissions.map((s) => s.key),
    ];
    const isAll = allModuleCodes.every((code) => selectedPermissions.includes(code));
    if (isAll) {
      setSelectedPermissions((prev) => prev.filter((code) => !allModuleCodes.includes(code)));
    } else {
      setSelectedPermissions((prev) => Array.from(new Set([...prev, ...allModuleCodes])));
    }
  };

  const onSubmit = async (data) => {
    setApiError('');
    try {
      const payload = {
        ...data,
        permissions: data.role === 'it_staff' ? selectedPermissions : [],
      };

      const response = await axiosClient.post('/users', payload);
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
      <div className="bg-white w-full max-w-2xl max-h-[90vh] flex flex-col rounded-xl border border-[#E2E8F0] shadow-xl relative overflow-hidden">
        <button
          onClick={handleModalClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition-colors z-10"
        >
          <X className="w-5 h-5" />
        </button>

        {/* 1. Aşama: Şifre Üretildi ve 1 Kerelik Gösterim Ekranı */}
        {createdUserPassword ? (
          <div className="p-6 space-y-4">
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
          <div className="flex flex-col h-full max-h-[90vh]">
            <div className="p-6 border-b border-slate-200 flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-lg bg-[#1E2534] text-[#4F8FE0] flex items-center justify-center shrink-0">
                <UserPlus className="w-4 h-4" />
              </div>
              <h3 className="font-heading text-lg font-bold text-[#1E2534]">Yeni Kullanıcı Ekle</h3>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4 overflow-y-auto flex-1" noValidate>
              {apiError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium rounded-lg">
                  {apiError}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#1E2534] mb-1">Ad Soyad</label>
                  <input
                    type="text"
                    placeholder="Ahmet Yılmaz"
                    className={`w-full h-10 px-3 text-sm bg-white text-[#1E2534] rounded-lg border ${
                      errors.fullName ? 'border-rose-400' : 'border-[#CBD5E1] focus:border-[#4F8FE0]'
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
                      errors.email ? 'border-rose-400' : 'border-[#CBD5E1] focus:border-[#4F8FE0]'
                    } outline-none`}
                    {...register('email')}
                  />
                  {errors.email && <p className="mt-1 text-[11px] text-rose-600">{errors.email.message}</p>}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#1E2534] mb-1">Sistem Rolü</label>
                <select
                  className="w-full h-10 px-3 text-sm bg-white text-[#1E2534] rounded-lg border border-[#CBD5E1] focus:border-[#4F8FE0] outline-none"
                  {...register('role')}
                >
                  <option value="it_staff">IT Personeli (it_staff)</option>
                  <option value="admin">Yönetici (admin)</option>
                </select>
                {errors.role && <p className="mt-1 text-[11px] text-rose-600">{errors.role.message}</p>}
              </div>

              {/* IT Personeli için İzin Matrisi */}
              {selectedRole === 'it_staff' && (
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between pb-1 border-b border-slate-200">
                    <span className="text-xs font-bold text-[#1E2534] flex items-center gap-1.5">
                      <Shield className="w-3.5 h-3.5 text-[#4F8FE0]" /> IT Personeli Modül ve Alt Yetkileri
                    </span>
                    <span className="text-[11px] text-slate-500 font-medium">
                      ({selectedPermissions.length} yetki seçili)
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-64 overflow-y-auto pr-1 items-start">
                    {MODULE_PERMISSIONS.map((mod) => {
                      const allSelected = [mod.viewPermission, ...mod.subPermissions.map(s => s.key)].every(c => selectedPermissions.includes(c));
                      const isExpanded = expandedModules[mod.key] ?? true;

                      return (
                        <div key={mod.key} className="bg-slate-50 border border-slate-200 rounded-lg overflow-hidden space-y-0">
                          <div className={`flex items-center justify-between p-2.5 bg-slate-100/70 ${mod.subPermissions.length > 0 ? 'border-b border-slate-200/80' : ''}`}>
                            <div className="flex items-center gap-1.5 min-w-0">
                              <input
                                type="checkbox"
                                id={`add-view-${mod.key}`}
                                ref={(el) => { parentCheckboxRefs.current[mod.key] = el; }}
                                checked={isPermissionSelected(mod.viewPermission)}
                                onChange={() => toggleParentPermission(mod)}
                                className="w-3.5 h-3.5 rounded text-[#4F8FE0] focus:ring-[#4F8FE0] border-slate-300 cursor-pointer shrink-0"
                              />
                              {mod.subPermissions.length > 0 ? (
                                <button
                                  type="button"
                                  onClick={() => toggleModuleAccordion(mod.key)}
                                  className="flex items-center gap-1 text-xs font-bold text-[#1E2534] hover:text-[#4F8FE0] transition cursor-pointer text-left truncate"
                                  title={isExpanded ? 'Daralt' : 'Genişlet'}
                                >
                                  <span className="truncate">{mod.label}</span>
                                  {isExpanded ? (
                                    <ChevronDown className="w-3 h-3 text-slate-400 shrink-0" />
                                  ) : (
                                    <ChevronRight className="w-3 h-3 text-slate-400 shrink-0" />
                                  )}
                                </button>
                              ) : (
                                <label htmlFor={`add-view-${mod.key}`} className="text-xs font-bold text-[#1E2534] cursor-pointer truncate">
                                  {mod.label}
                                </label>
                              )}
                            </div>
                            {mod.subPermissions.length > 0 && (
                              <button
                                type="button"
                                onClick={() => toggleModuleAll(mod)}
                                className="text-[10px] font-bold text-[#4F8FE0] hover:underline cursor-pointer shrink-0 ml-1"
                              >
                                {allSelected ? 'Kaldır' : 'Seç'}
                              </button>
                            )}
                          </div>

                          {mod.subPermissions.length > 0 && isExpanded && (
                            <div className="p-2.5 pl-5 space-y-1.5 bg-white/40 animate-in fade-in duration-150">
                              {mod.subPermissions.map((sub) => (
                                <div key={sub.key} className="flex items-center gap-1.5">
                                  <input
                                    type="checkbox"
                                    id={`add-sub-${sub.key}`}
                                    checked={isPermissionSelected(sub.key)}
                                    onChange={() => toggleSubPermission(mod, sub.key)}
                                    className="w-3 h-3 rounded text-blue-600 focus:ring-blue-500 border-slate-300 cursor-pointer"
                                  />
                                  <label htmlFor={`add-sub-${sub.key}`} className="text-[11px] text-slate-600 font-medium cursor-pointer">
                                    {sub.label}
                                  </label>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
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

