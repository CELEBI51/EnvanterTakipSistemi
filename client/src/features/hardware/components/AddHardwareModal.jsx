import React, { useState } from 'react';
import { X, Cpu, HardDrive, Monitor, CheckCircle2, AlertCircle } from 'lucide-react';
import useAuthStore from '../../../store/authStore';

const CATEGORIES = [
  'Desktop',
  'Laptop',
  'Yazıcı',
  'Mouse',
  'Klavye',
  'Kulaklık',
  'Monitör',
  'Depolama Birimi',
  'Kamera',
  'Diğer',
];

export default function AddHardwareModal({ isOpen, onClose, onSuccess }) {
  const token = useAuthStore((state) => state.accessToken);

  const [mode, setMode] = useState('new'); // 'new' | 'existing'
  const [category, setCategory] = useState('Laptop');
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [serialNo, setSerialNo] = useState('');
  const [demirbasNo, setDemirbasNo] = useState('');

  // Specs for Desktop & Laptop
  const [cpu, setCpu] = useState('');
  const [ram, setRam] = useState('');
  const [gpu, setGpu] = useState('');
  const [dvd, setDvd] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const isPcCategory = category === 'Desktop' || category === 'Laptop';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (mode === 'existing' && (!demirbasNo || !demirbasNo.trim())) {
      setError('Mevcut ürün için Demirbaş Numarası girilmesi zorunludur.');
      return;
    }

    setLoading(true);

    const payload = {
      category,
      brand,
      model,
      serial_no: serialNo,
      mode,
      demirbas_no: mode === 'existing' ? demirbasNo.trim() : undefined,
    };

    if (isPcCategory) {
      payload.specs = {
        cpu: cpu || undefined,
        ram: ram || undefined,
        gpu: gpu || undefined,
        dvd,
      };
    }

    try {
      const res = await fetch('http://localhost:5000/api/hardware', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Ürün eklenirken hata oluştu.');
      }

      onSuccess();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
      <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div>
            <h2 className="font-heading text-lg font-bold text-[#1E2534]">Yeni Donanım Ekle</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Sisteme yeni bir demirbaş/donanım kaydı oluşturun.
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 flex-1">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-medium flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Mode Toggle (Yeni Ürün / Mevcut Ürün) */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">Kayıt Modu</label>
            <div className="grid grid-cols-2 gap-2 p-1 bg-[#F0F4F8] rounded-xl">
              <button
                type="button"
                onClick={() => setMode('new')}
                className={`py-2 px-3 text-xs font-bold rounded-lg transition-all ${
                  mode === 'new'
                    ? 'bg-white text-[#1E2534] shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Yeni Ürün (Otomatik DMB No)
              </button>
              <button
                type="button"
                onClick={() => setMode('existing')}
                className={`py-2 px-3 text-xs font-bold rounded-lg transition-all ${
                  mode === 'existing'
                    ? 'bg-white text-[#1E2534] shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Mevcut Ürün (Elle DMB No)
              </button>
            </div>

            {mode === 'new' ? (
              <p className="text-[11px] text-emerald-600 font-medium mt-1.5 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Demirbaş numarası otomatik oluşturulacak (Örn: DMB-2026-0001)
              </p>
            ) : (
              <div className="mt-3">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Demirbaş Numarası *
                </label>
                <input
                  type="text"
                  required={mode === 'existing'}
                  value={demirbasNo}
                  onChange={(e) => setDemirbasNo(e.target.value)}
                  placeholder="Örn: DMB-2024-0042 veya MAN-102"
                  className="w-full px-3 py-2 rounded-xl border border-[#E2E8F0] font-mono text-xs text-[#1E2534] focus:outline-hidden focus:border-[#4F8FE0] focus:ring-1 focus:ring-[#4F8FE0]"
                />
              </div>
            )}
          </div>

          {/* Kategori */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Kategori *</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-[#E2E8F0] text-xs font-medium text-[#1E2534] focus:outline-hidden focus:border-[#4F8FE0] focus:ring-1 focus:ring-[#4F8FE0]"
            >
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* Marka & Model */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Marka *</label>
              <input
                type="text"
                required
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                placeholder="Örn: Dell, HP, Lenovo"
                className="w-full px-3 py-2 rounded-xl border border-[#E2E8F0] text-xs text-[#1E2534] focus:outline-hidden focus:border-[#4F8FE0] focus:ring-1 focus:ring-[#4F8FE0]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Model *</label>
              <input
                type="text"
                required
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder="Örn: ThinkPad X1, Latitude 5520"
                className="w-full px-3 py-2 rounded-xl border border-[#E2E8F0] text-xs text-[#1E2534] focus:outline-hidden focus:border-[#4F8FE0] focus:ring-1 focus:ring-[#4F8FE0]"
              />
            </div>
          </div>

          {/* Seri No */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Seri No (Opsiyonel)
            </label>
            <input
              type="text"
              value={serialNo}
              onChange={(e) => setSerialNo(e.target.value)}
              placeholder="Örn: SN-9988776655"
              className="w-full px-3 py-2 rounded-xl border border-[#E2E8F0] text-xs font-mono text-[#1E2534] focus:outline-hidden focus:border-[#4F8FE0] focus:ring-1 focus:ring-[#4F8FE0]"
            />
          </div>

          {/* Şartlı Özellikler (Desktop veya Laptop seçildiyse) */}
          {isPcCategory && (
            <div className="p-4 bg-[#F0F4F8]/80 rounded-xl border border-slate-200/60 space-y-3">
              <div className="flex items-center gap-1.5 text-xs font-bold text-[#1E2534]">
                <Cpu className="w-4 h-4 text-[#4F8FE0]" />
                <span>Bilgisayar Özellikleri (Specs)</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">İşlemci (CPU)</label>
                  <input
                    type="text"
                    value={cpu}
                    onChange={(e) => setCpu(e.target.value)}
                    placeholder="i7-12700H"
                    className="w-full px-2.5 py-1.5 rounded-lg border border-[#E2E8F0] text-xs bg-white text-[#1E2534]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">RAM (Bellek)</label>
                  <input
                    type="text"
                    value={ram}
                    onChange={(e) => setRam(e.target.value)}
                    placeholder="16 GB DDR5"
                    className="w-full px-2.5 py-1.5 rounded-lg border border-[#E2E8F0] text-xs bg-white text-[#1E2534]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Ekran Kartı (GPU)</label>
                  <input
                    type="text"
                    value={gpu}
                    onChange={(e) => setGpu(e.target.value)}
                    placeholder="RTX 4060"
                    className="w-full px-2.5 py-1.5 rounded-lg border border-[#E2E8F0] text-xs bg-white text-[#1E2534]"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="dvdCheck"
                  checked={dvd}
                  onChange={(e) => setDvd(e.target.checked)}
                  className="rounded-sm border-slate-300 text-[#4F8FE0] focus:ring-[#4F8FE0]"
                />
                <label htmlFor="dvdCheck" className="text-xs font-medium text-slate-700">
                  DVD / Optik Sürücü var
                </label>
              </div>
            </div>
          )}

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 transition-colors"
            >
              İptal
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 text-xs font-bold text-white bg-[#4F8FE0] hover:bg-[#3D75C4] rounded-xl shadow-xs disabled:opacity-50 transition-all"
            >
              {loading ? 'Kaydediliyor...' : 'Kaydet'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
