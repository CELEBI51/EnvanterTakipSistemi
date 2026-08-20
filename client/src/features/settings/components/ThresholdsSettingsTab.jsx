import React, { useEffect, useState } from 'react';
import { Sliders, Save, CheckCircle2, AlertCircle, AlertTriangle, Clock, Info } from 'lucide-react';
import useAuthStore from '../../../store/authStore';
import { API_BASE_URL } from '../../../config';

export default function ThresholdsSettingsTab() {
  const token = useAuthStore((state) => state.accessToken);
  const user = useAuthStore((state) => state.user);

  const [criticalStockThreshold, setCriticalStockThreshold] = useState(5);
  const [licenseWarningDays, setLicenseWarningDays] = useState(15);

  const [loading, setLoading] = useState(true);
  const [saveLoading, setSaveLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isDirty, setIsDirty] = useState(false);

  const canEdit = user?.role === 'admin';

  // Fetch current settings from GET /api/settings
  const fetchSettings = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE_URL}/settings`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Ayarlar yüklenemedi.');

      if (data.data) {
        setCriticalStockThreshold(data.data.criticalStockThreshold ?? 5);
        setLicenseWarningDays(data.data.licenseWarningDays ?? 15);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, [token]);

  // Handle Form Submit (PUT /api/settings)
  const handleSave = async (e) => {
    e.preventDefault();

    const stockVal = Number(criticalStockThreshold);
    const daysVal = Number(licenseWarningDays);

    if (isNaN(stockVal) || stockVal < 1 || stockVal > 100) {
      setError('Kritik stok eşiği 1 ile 100 arasında bir değer olmalıdır.');
      return;
    }

    if (isNaN(daysVal) || daysVal < 1 || daysVal > 90) {
      setError('Lisans uyarı süresi 1 ile 90 gün arasında bir değer olmalıdır.');
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
          criticalStockThreshold: stockVal,
          licenseWarningDays: daysVal,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Bildirim eşikleri kaydedilemedi.');

      setSuccess('Bildirim eşikleri başarıyla güncellendi.');
      setIsDirty(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaveLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-xs text-slate-400 font-medium shadow-xs">
        Bildirim eşik ayarları yükleniyor...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold font-heading text-[#1E2534] flex items-center gap-2" style={{ color: 'var(--theme-text-primary)' }}>
            <Sliders className="w-5 h-5" style={{ color: 'var(--theme-accent)' }} />
            Bildirim & Stok Eşikleri Yönetimi
          </h2>
          <p className="text-xs mt-1" style={{ color: 'var(--theme-text-secondary)' }}>
            Kritik stok uyarı limitlerini ve lisans bitiş hatırlatma sürelerini özelleştirin.
          </p>
        </div>
      </div>

      {/* Global Alerts */}
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

      {/* Thresholds Form Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
        <form onSubmit={handleSave} className="space-y-6">
          {/* Field 1: Critical Stock Threshold */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center font-bold shrink-0">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <div>
                <label className="block text-xs font-bold text-[#1E2534]">
                  Kritik Stok Eşiği (Adet) <span className="text-rose-500">*</span>
                </label>
                <p className="text-[11px] text-slate-500">
                  Bu sayının altına düşen veya eşit olan ürünler stok uyarı listesine girer ve e-posta bildirimi tetiklenir.
                </p>
              </div>
            </div>

            <div className="pt-2 flex items-center gap-3">
              <input
                type="number"
                min="1"
                max="100"
                required
                disabled={!canEdit}
                value={criticalStockThreshold}
                onChange={(e) => {
                  setCriticalStockThreshold(e.target.value);
                  setIsDirty(true);
                }}
                className="w-32 px-3.5 py-2 bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold text-[#1E2534] focus:outline-hidden focus:border-[#4C82F7] disabled:opacity-60"
              />
              <span className="text-xs text-slate-600 font-medium">adet ve altı kritik stok kabul edilsin</span>
            </div>
          </div>

          {/* Field 2: License Warning Days */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center font-bold shrink-0">
                <Clock className="w-4 h-4" />
              </div>
              <div>
                <label className="block text-xs font-bold text-[#1E2534]">
                  Lisans Bitiş Uyarı Süresi (Gün) <span className="text-rose-500">*</span>
                </label>
                <p className="text-[11px] text-slate-500">
                  Lisans bitiş tarihine belirtilen gün kadar süre kaldığında bildirim panelinde gösterilir ve özet e-posta atılır.
                </p>
              </div>
            </div>

            <div className="pt-2 flex items-center gap-3">
              <input
                type="number"
                min="1"
                max="90"
                required
                disabled={!canEdit}
                value={licenseWarningDays}
                onChange={(e) => {
                  setLicenseWarningDays(e.target.value);
                  setIsDirty(true);
                }}
                className="w-32 px-3.5 py-2 bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold text-[#1E2534] focus:outline-hidden focus:border-[#4C82F7] disabled:opacity-60"
              />
              <span className="text-xs text-slate-600 font-medium">gün kala uyarı gönderilsin</span>
            </div>
          </div>

          {/* Info note */}
          <div className="p-3.5 bg-blue-50 border border-blue-200 text-blue-700 rounded-xl text-[11px] font-medium flex items-center gap-2">
            <Info className="w-4 h-4 shrink-0 text-[#4C82F7]" />
            <span>
              Güncellenen eşik değerleri arka plan kontrol görevlerinde ve bildirim özet panellerinde anında geçerli olur.
            </span>
          </div>

          {/* Action Row */}
          {canEdit && (
            <div className="pt-3 flex items-center justify-between border-t border-slate-100">
              <div className="text-xs text-slate-400">
                {isDirty ? (
                  <span className="text-amber-600 font-bold flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" /> Kaydedilmemiş değişiklikler var
                  </span>
                ) : (
                  <span className="text-emerald-600 font-medium flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Tüm değerler güncel
                  </span>
                )}
              </div>

              <button
                type="submit"
                disabled={saveLoading || !isDirty}
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
