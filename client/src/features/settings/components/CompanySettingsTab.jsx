import React, { useEffect, useState } from 'react';
import {
  Building,
  Upload,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Image as ImageIcon,
  Building2,
  Phone,
  Mail,
  MapPin,
  FileText,
  Save,
} from 'lucide-react';
import useAuthStore from '../../../store/authStore';
import { API_BASE_URL } from '../../../config';
import FileUploadField from '../../../components/common/FileUploadField';

export default function CompanySettingsTab() {
  const token = useAuthStore((state) => state.accessToken);
  const user = useAuthStore((state) => state.user);

  const [loading, setLoading] = useState(true);
  const [saveLoading, setSaveLoading] = useState(false);
  const [logoLoading, setLogoLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form State
  const [companyName, setCompanyName] = useState('');
  const [companyAddress, setCompanyAddress] = useState('');
  const [companyPhone, setCompanyPhone] = useState('');
  const [companyEmail, setCompanyEmail] = useState('');
  const [companyTaxNo, setCompanyTaxNo] = useState('');

  // Logo State
  const [logoPath, setLogoPath] = useState(null);
  const [logoBase64, setLogoBase64] = useState(null);
  const [selectedLogoFile, setSelectedLogoFile] = useState(null);

  const canEdit = user?.role === 'admin';

  // Fetch Current System Settings
  const fetchSettings = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE_URL}/settings`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Şirket bilgileri alınamadı.');

      const s = data.data || {};
      setCompanyName(s.companyName || '');
      setCompanyAddress(s.companyAddress || '');
      setCompanyPhone(s.companyPhone || '');
      setCompanyEmail(s.companyEmail || '');
      setCompanyTaxNo(s.companyTaxNo || '');
      setLogoPath(s.logoPath || null);

      if (s.logoPath) {
        fetchLogoBase64();
      } else {
        setLogoBase64(null);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Fetch Logo as base64 for reliable display
  const fetchLogoBase64 = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/settings/logo?format=base64`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok && data.data?.base64) {
        setLogoBase64(data.data.base64);
      }
    } catch (err) {
      console.error('Logo yüklenemedi:', err);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, [token]);

  // Handle Logo Upload Submit
  const handleUploadLogo = async (file) => {
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      setError('Logo dosya boyutu maksimum 2MB olabilir.');
      return;
    }

    setLogoLoading(true);
    setError('');
    setSuccess('');

    const formData = new FormData();
    formData.append('logo', file);

    try {
      const res = await fetch(`${API_BASE_URL}/settings/logo`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Logo yüklenirken bir hata oluştu.');

      setSuccess('Şirket logosu başarıyla yüklendi.');
      setSelectedLogoFile(null);
      window.dispatchEvent(new CustomEvent('company-logo-changed'));
      fetchSettings();
    } catch (err) {
      setError(err.message);
    } finally {
      setLogoLoading(false);
    }
  };

  // Handle Logo Removal
  const handleRemoveLogo = async () => {
    if (!window.confirm('Şirket logosunu kaldırmak istediğinize emin misiniz?')) return;

    setLogoLoading(true);
    setError('');
    setSuccess('');

    try {
      const res = await fetch(`${API_BASE_URL}/settings`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ logoPath: null }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Logo kaldırılırken hata oluştu.');

      setLogoPath(null);
      setLogoBase64(null);
      setSuccess('Şirket logosu kaldırıldı.');
      window.dispatchEvent(new CustomEvent('company-logo-changed'));
    } catch (err) {
      setError(err.message);
    } finally {
      setLogoLoading(false);
    }
  };

  // Handle Form Submit for Text Details
  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (!companyName.trim()) {
      setError('Şirket adı zorunludur.');
      return;
    }

    setSaveLoading(true);
    setError('');
    setSuccess('');

    try {
      const res = await fetch(`${API_BASE_URL}/settings`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          companyName: companyName.trim(),
          companyAddress: companyAddress.trim() || null,
          companyPhone: companyPhone.trim() || null,
          companyEmail: companyEmail.trim() || null,
          companyTaxNo: companyTaxNo.trim() || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Şirket bilgileri kaydedilemedi.');

      setSuccess('Şirket bilgileri başarıyla kaydedildi.');
      fetchSettings();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaveLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-xs text-slate-400 font-medium shadow-xs">
        Şirket bilgileri yükleniyor...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold font-heading text-[#1E2534] flex items-center gap-2" style={{ color: 'var(--theme-text-primary)' }}>
            <Building className="w-5 h-5" style={{ color: 'var(--theme-accent)' }} />
            Şirket Bilgileri & Kurumsal Kimlik
          </h2>
          <p className="text-xs mt-1" style={{ color: 'var(--theme-text-secondary)' }}>
            Zimmet tutanakları, iade formları ve raporlarda görünecek şirket bilgilerini ve logosunu yönetin.
          </p>
        </div>
      </div>

      {/* Global Banners */}
      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-700 font-medium flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs text-emerald-800 font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
          <span>{success}</span>
        </div>
      )}

      {/* ─── ÜST KISIM: LOGO YÖNETİMİ ─── */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-[#4F8FE0] flex items-center justify-center font-bold">
              <ImageIcon className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold font-heading text-[#1E2534]">
                Kurumsal Logo
              </h3>
              <p className="text-[11px] text-slate-500">
                PDF zimmet ve iade tutanaklarının üst kısmında görüntülenir. (PNG, JPG, SVG - Max 2MB)
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
          {/* Logo Preview Box */}
          <div className="md:col-span-4 flex flex-col items-center justify-center p-6 bg-slate-50 border border-slate-200 rounded-2xl text-center min-h-[160px]">
            {logoBase64 ? (
              <div className="space-y-3 flex flex-col items-center">
                <div className="p-3 bg-white border border-slate-200 rounded-xl shadow-xs max-w-[220px]">
                  <img
                    src={logoBase64}
                    alt="Şirket Logosu"
                    className="max-h-[70px] max-w-[190px] object-contain mx-auto"
                  />
                </div>
                <span className="text-[11px] text-emerald-600 font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Yüklü Logo Önizlemesi
                </span>
              </div>
            ) : (
              <div className="space-y-2 text-slate-400">
                <ImageIcon className="w-10 h-10 mx-auto opacity-40" />
                <p className="text-xs italic font-medium">Henüz logo yüklenmedi</p>
                <p className="text-[10px] text-slate-400">Varsayılan DİTAŞ logosu kullanılmaktadır</p>
              </div>
            )}
          </div>

          {/* Logo Action Box */}
          <div className="md:col-span-8 space-y-4">
            {canEdit ? (
              <>
                <FileUploadField
                  label="Yeni Logo Seç veya Yükle"
                  selectedFile={selectedLogoFile}
                  onFileSelect={(file) => {
                    setSelectedLogoFile(file);
                    if (file) handleUploadLogo(file);
                  }}
                  disabled={logoLoading}
                />

                {logoPath && (
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={handleRemoveLogo}
                      disabled={logoLoading}
                      className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold transition border border-rose-200 cursor-pointer disabled:opacity-50"
                    >
                      <Trash2 className="w-4 h-4 text-rose-600" />
                      Logoyu Kaldır
                    </button>
                  </div>
                )}
              </>
            ) : (
              <p className="text-xs text-slate-400 italic">
                Logo değiştirme yetkisine sadece admin sahiptir.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* ─── ALT KISIM: ŞİRKET BİLGİLERİ FORMU ─── */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
              <Building2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold font-heading text-[#1E2534]">
                Kurumsal İletişim & Fatura Detayları
              </h3>
              <p className="text-[11px] text-slate-500">
                Resmi evrak ve tutanak başlıklarında görünecek şirket kimlik bilgileri.
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleFormSubmit} className="space-y-4">
          {/* Company Name (Required) */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Şirket Unvanı / Adı <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <Building className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                required
                disabled={!canEdit}
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="Örn: DİTAŞ Otomotiv A.Ş."
                className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-[#1E2534] focus:outline-hidden focus:border-[#4F8FE0] disabled:opacity-60"
              />
            </div>
          </div>

          {/* Address */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Şirket Adresi
            </label>
            <div className="relative">
              <MapPin className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <textarea
                rows="2"
                disabled={!canEdit}
                value={companyAddress}
                onChange={(e) => setCompanyAddress(e.target.value)}
                placeholder="Örn: Organize Sanayi Bölgesi 1. Cadde No: 15 Niğde"
                className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-[#1E2534] focus:outline-hidden focus:border-[#4F8FE0] disabled:opacity-60"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Phone */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Telefon
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  disabled={!canEdit}
                  value={companyPhone}
                  onChange={(e) => setCompanyPhone(e.target.value)}
                  placeholder="Örn: 0388 232 35 00"
                  className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-[#1E2534] focus:outline-hidden focus:border-[#4F8FE0] disabled:opacity-60"
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                E-posta
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="email"
                  disabled={!canEdit}
                  value={companyEmail}
                  onChange={(e) => setCompanyEmail(e.target.value)}
                  placeholder="Örn: info@ditas.com.tr"
                  className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-[#1E2534] focus:outline-hidden focus:border-[#4F8FE0] disabled:opacity-60"
                />
              </div>
            </div>

            {/* Tax No */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Vergi No / Daire
              </label>
              <div className="relative">
                <FileText className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  disabled={!canEdit}
                  value={companyTaxNo}
                  onChange={(e) => setCompanyTaxNo(e.target.value)}
                  placeholder="Örn: Niğde V.D. 2990012345"
                  className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-[#1E2534] focus:outline-hidden focus:border-[#4F8FE0] disabled:opacity-60"
                />
              </div>
            </div>
          </div>

          {/* Submit Row */}
          {canEdit && (
            <div className="pt-3 flex items-center justify-end border-t border-slate-100">
              <button
                type="submit"
                disabled={saveLoading}
                className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#4F8FE0] hover:bg-[#3D75C4] text-white font-bold text-xs rounded-xl shadow-md hover:shadow-lg transition cursor-pointer disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {saveLoading ? 'Kaydediliyor...' : 'Değişiklikleri Kaydet'}
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
