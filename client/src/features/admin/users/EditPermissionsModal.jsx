import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, Shield, Check, Loader2, ChevronDown, ChevronRight } from 'lucide-react';
import axiosClient from '../../../api/axiosClient';
import { MODULE_PERMISSIONS, ALL_PERMISSIONS } from '../../../utils/permissions';

export default function EditPermissionsModal({ isOpen, onClose, user, onSuccess }) {
  const [selectedPermissions, setSelectedPermissions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [expandedModules, setExpandedModules] = useState(() =>
    MODULE_PERMISSIONS.reduce((acc, mod) => ({ ...acc, [mod.key]: true }), {})
  );

  const toggleModuleAccordion = (modKey) => {
    setExpandedModules((prev) => ({ ...prev, [modKey]: !prev[modKey] }));
  };

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

  useEffect(() => {
    if (user && isOpen) {
      setSelectedPermissions(Array.isArray(user.permissions) ? user.permissions : []);
      setError('');
      setSuccessMsg('');
      setExpandedModules(
        MODULE_PERMISSIONS.reduce((acc, mod) => ({ ...acc, [mod.key]: true }), {})
      );
    }
  }, [user, isOpen]);

  // Sync indeterminate property on parent checkbox DOM elements
  useEffect(() => {
    MODULE_PERMISSIONS.forEach((mod) => {
      const ref = parentCheckboxRefs.current[mod.key];
      if (ref) {
        ref.indeterminate = isModuleIndeterminate(mod);
      }
    });
  }, [selectedPermissions, isModuleIndeterminate]);

  if (!isOpen || !user) return null;

  const isPermissionSelected = (code) => selectedPermissions.includes(code);

  // Smart toggle for the parent (view) checkbox
  const toggleParentPermission = (moduleObj) => {
    const allModuleCodes = [
      moduleObj.viewPermission,
      ...moduleObj.subPermissions.map((s) => s.key),
    ];
    const allSelected = allModuleCodes.every((code) => selectedPermissions.includes(code));

    if (allSelected) {
      // All were selected → uncheck parent + all children
      setSelectedPermissions((prev) => prev.filter((code) => !allModuleCodes.includes(code)));
    } else {
      // Not all selected → check parent + all children
      setSelectedPermissions((prev) => Array.from(new Set([...prev, ...allModuleCodes])));
    }
  };

  // Smart toggle for a sub-permission: auto-adds parent viewPermission if checked, but doesn't remove parent if unchecked
  const toggleSubPermission = (moduleObj, subCode) => {
    setSelectedPermissions((prev) => {
      let next;
      if (prev.includes(subCode)) {
        // Unchecking a sub-permission
        next = prev.filter((p) => p !== subCode);
      } else {
        // Checking a sub-permission
        next = [...prev, subCode];
      }

      // If a subCode is newly selected, ensure viewPermission is also selected
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

    if (isModuleAllSelected(moduleObj)) {
      // Remove all
      setSelectedPermissions((prev) => prev.filter((code) => !allModuleCodes.includes(code)));
    } else {
      // Add all missing
      setSelectedPermissions((prev) => Array.from(new Set([...prev, ...allModuleCodes])));
    }
  };

  const handleSelectAllSystem = () => {
    setSelectedPermissions([...ALL_PERMISSIONS]);
  };

  const handleClearAllSystem = () => {
    setSelectedPermissions([]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccessMsg('');

    try {
      await axiosClient.put(`/users/${user.id}`, {
        role: user.role,
        permissions: selectedPermissions,
      });

      setSuccessMsg('Kullanıcı izinleri başarıyla güncellendi.');
      if (onSuccess) onSuccess();
      setTimeout(() => {
        onClose();
      }, 600);
    } catch (err) {
      setError(err.response?.data?.message || 'Yetkiler güncellenirken bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-3xl rounded-2xl border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-[#1E2534] text-white">
          <div className="flex items-center gap-2.5">
            <Shield className="w-5 h-5 text-[#4F8FE0]" />
            <div>
              <h2 className="font-bold text-base tracking-tight">Kullanıcı Erişim & İzin Matrisi</h2>
              <p className="text-xs text-slate-300 font-normal">
                {user.fullName} ({user.email}) — IT Personeli İzin Ayarları
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition p-1 rounded-lg hover:bg-slate-700/60 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action Top Bar */}
        <div className="px-6 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs">
          <span className="text-slate-500 font-medium">
            Toplam <strong className="text-[#1E2534]">{selectedPermissions.length}</strong> / {ALL_PERMISSIONS.length} izin seçili
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSelectAllSystem}
              className="px-2.5 py-1 rounded bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold transition cursor-pointer"
            >
              Tümünü Seç
            </button>
            <button
              type="button"
              onClick={handleClearAllSystem}
              className="px-2.5 py-1 rounded bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold transition cursor-pointer"
            >
              Tümünü Temizle
            </button>
          </div>
        </div>

        {/* Content Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold rounded-xl">
              {error}
            </div>
          )}
          {successMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold rounded-xl flex items-center gap-2">
              <Check className="w-4 h-4" /> {successMsg}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
            {MODULE_PERMISSIONS.map((mod) => {
              const allSelected = isModuleAllSelected(mod);
              const viewSelected = isPermissionSelected(mod.viewPermission);
              const isExpanded = expandedModules[mod.key] ?? true;

              return (
                <div
                  key={mod.key}
                  className="bg-slate-50/70 border border-slate-200 rounded-xl overflow-hidden hover:border-slate-300 transition"
                >
                  {/* Module Title Header */}
                  <div className={`flex items-center justify-between p-3.5 bg-slate-100/60 ${mod.subPermissions.length > 0 ? 'border-b border-slate-200/80' : ''}`}>
                    <div className="flex items-center gap-2 min-w-0">
                      <input
                        type="checkbox"
                        id={`view-${mod.key}`}
                        ref={(el) => { parentCheckboxRefs.current[mod.key] = el; }}
                        checked={viewSelected}
                        onChange={() => toggleParentPermission(mod)}
                        className="w-4 h-4 rounded text-[#4F8FE0] focus:ring-[#4F8FE0] border-slate-300 cursor-pointer shrink-0"
                      />
                      {mod.subPermissions.length > 0 ? (
                        <button
                          type="button"
                          onClick={() => toggleModuleAccordion(mod.key)}
                          className="flex items-center gap-1.5 text-xs font-bold text-[#1E2534] hover:text-[#4F8FE0] transition cursor-pointer text-left truncate"
                          title={isExpanded ? 'Daralt' : 'Genişlet'}
                        >
                          <span className="truncate">{mod.label}</span>
                          {isExpanded ? (
                            <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          ) : (
                            <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          )}
                        </button>
                      ) : (
                        <label
                          htmlFor={`view-${mod.key}`}
                          className="text-xs font-bold text-[#1E2534] cursor-pointer truncate"
                        >
                          {mod.label}
                        </label>
                      )}
                    </div>

                    {mod.subPermissions.length > 0 && (
                      <button
                        type="button"
                        onClick={() => toggleModuleAll(mod)}
                        className="text-[10px] font-bold text-[#4F8FE0] hover:underline cursor-pointer shrink-0 ml-2"
                      >
                        {allSelected ? 'Tümünü Kaldır' : 'Tümünü Seç'}
                      </button>
                    )}
                  </div>

                  {/* Sub-permissions list (Collapsible Accordion Body) */}
                  {mod.subPermissions.length > 0 && isExpanded && (
                    <div className="p-3.5 pl-6 space-y-2 bg-white/50 animate-in fade-in duration-150">
                      {mod.subPermissions.map((sub) => {
                        const isSubSelected = isPermissionSelected(sub.key);

                        return (
                          <div key={sub.key} className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              id={`sub-${sub.key}`}
                              checked={isSubSelected}
                              onChange={() => toggleSubPermission(mod, sub.key)}
                              className="w-3.5 h-3.5 rounded text-blue-600 focus:ring-blue-500 border-slate-300 cursor-pointer"
                            />
                            <label
                              htmlFor={`sub-${sub.key}`}
                              className="text-xs text-slate-700 font-medium cursor-pointer"
                            >
                              {sub.label}
                            </label>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Footer Buttons */}
          <div className="pt-4 border-t border-slate-200 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-300 bg-white text-slate-700 text-xs font-bold hover:bg-slate-50 transition cursor-pointer"
            >
              İptal
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 rounded-xl bg-[#1E2534] hover:bg-slate-800 text-white text-xs font-bold transition cursor-pointer flex items-center gap-2 shadow-xs disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Kaydediliyor...
                </>
              ) : (
                'Yetkileri Kaydet'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
