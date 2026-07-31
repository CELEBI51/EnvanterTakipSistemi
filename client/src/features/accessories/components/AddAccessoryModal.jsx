import React, { useState } from 'react';
import { X, PackagePlus, AlertCircle } from 'lucide-react';
import useAuthStore from '../../../store/authStore';

const CATEGORIES = [
  'Mouse',
  'Klavye',
  'Kulaklık',
  'Kamera',
  'Depolama Birimi',
  'Diğer',
];

const BRAND_OPTIONS = [
  'Logitech',
  'Dell',
  'HP',
  'Lenovo',
  'Asus',
  'Apple',
  'Samsung',
  'Kingston',
  'SanDisk',
  'Diğer',
];

export default function AddAccessoryModal({ isOpen, onClose, onSuccess }) {
  const token = useAuthStore((state) => state.accessToken);

  const [name, setName] = useState('');
  const [category, setCategory] = useState('Mouse');
  const [selectedBrand, setSelectedBrand] = useState('Logitech');
  const [customBrand, setCustomBrand] = useState('');
  const [initialQuantity, setInitialQuantity] = useState(10);
  const [minThreshold, setMinThreshold] = useState(5);
  const [notes, setNotes] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!name || !name.trim()) {
      setError('Aksesuar adı zorunludur.');
      return;
    }

    const finalBrand = selectedBrand === 'Diğer' ? customBrand.trim() : selectedBrand;

    const qtyNum = parseInt(initialQuantity, 10);
    if (isNaN(qtyNum) || qtyNum < 1) {
      setError('Başlangıç stok miktarı 1 veya daha büyük olmalıdır.');
      return;
    }

    const thresholdNum = minThreshold !== '' && minThreshold !== null ? parseInt(minThreshold, 10) : undefined;

    setLoading(true);

    const payload = {
      name: name.trim(),
      category,
      brand: finalBrand || undefined,
      initialQuantity: qtyNum,
      minThreshold: !isNaN(thresholdNum) ? thresholdNum : undefined,
      notes: notes.trim() || undefined,
    };

    try {
      const res = await fetch('http://localhost:5000/api/accessories', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Aksesuar eklenirken hata oluştu.');
      }

      // Reset form
      setName('');
      setCategory('Mouse');
      setSelectedBrand('Logitech');
      setCustomBrand('');
      setInitialQuantity(10);
      setMinThreshold(5);
      setNotes('');

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
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-[#1E2534] text-white">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#4F8FE0] text-white flex items-center justify-center font-bold">
              <PackagePlus className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-heading text-base font-bold">Yeni Aksesuar Ekle</h2>
              <p className="text-xs text-slate-300">Stok takibi yapılacak yeni aksesuar türünü tanımlayın.</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 flex items-center justify-center transition-colors cursor-pointer"
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

          {/* Ürün Adı */}
          <div>
            <label className="block text-xs font-bold text-[#1E2534] mb-1">
              Aksesuar Ürün Adı <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="ör. Logitech M185 Kablosuz Mouse"
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#E2E8F0] text-xs text-[#1E2534] focus:outline-hidden focus:border-[#4F8FE0] focus:ring-1 focus:ring-[#4F8FE0]"
            />
          </div>

          {/* Kategori & Marka */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-[#1E2534] mb-1">
                Kategori <span className="text-rose-500">*</span>
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#E2E8F0] text-xs font-medium text-[#1E2534] focus:outline-hidden focus:border-[#4F8FE0] focus:ring-1 focus:ring-[#4F8FE0]"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#1E2534] mb-1">Marka</label>
              <select
                value={selectedBrand}
                onChange={(e) => setSelectedBrand(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#E2E8F0] text-xs font-medium text-[#1E2534] focus:outline-hidden focus:border-[#4F8FE0] focus:ring-1 focus:ring-[#4F8FE0]"
              >
                {BRAND_OPTIONS.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {selectedBrand === 'Diğer' && (
            <div>
              <label className="block text-xs font-bold text-[#1E2534] mb-1">Marka Adı Girin</label>
              <input
                type="text"
                value={customBrand}
                onChange={(e) => setCustomBrand(e.target.value)}
                placeholder="ör. Rapoo"
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#E2E8F0] text-xs text-[#1E2534] focus:outline-hidden focus:border-[#4F8FE0] focus:ring-1 focus:ring-[#4F8FE0]"
              />
            </div>
          )}

          {/* Stok ve Eşik Değerleri */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-[#1E2534] mb-1">
                Başlangıç Stok Miktarı <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                min="1"
                required
                value={initialQuantity}
                onChange={(e) => setInitialQuantity(e.target.value)}
                placeholder="ör. 20"
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#E2E8F0] text-xs font-mono text-[#1E2534] focus:outline-hidden focus:border-[#4F8FE0] focus:ring-1 focus:ring-[#4F8FE0]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#1E2534] mb-1">
                Minimum Stok Uyarısı Eşiği <span className="text-slate-400 font-normal">(opsiyonel)</span>
              </label>
              <input
                type="number"
                min="0"
                value={minThreshold}
                onChange={(e) => setMinThreshold(e.target.value)}
                placeholder="ör. 5"
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#E2E8F0] text-xs font-mono text-[#1E2534] focus:outline-hidden focus:border-[#4F8FE0] focus:ring-1 focus:ring-[#4F8FE0]"
              />
            </div>
          </div>

          {/* Notlar */}
          <div>
            <label className="block text-xs font-bold text-[#1E2534] mb-1">
              Notlar <span className="text-slate-400 font-normal">(opsiyonel)</span>
            </label>
            <textarea
              rows="2"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ürün ambalajı, saklama konumu vb. ek açıklamalar..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#E2E8F0] text-xs text-[#1E2534] focus:outline-hidden focus:border-[#4F8FE0] focus:ring-1 focus:ring-[#4F8FE0]"
            ></textarea>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-xs font-semibold text-slate-600 hover:text-slate-800 transition-colors cursor-pointer"
            >
              İptal
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 text-xs font-bold text-white bg-[#4F8FE0] hover:bg-[#3D75C4] active:bg-[#3566AD] rounded-xl shadow-xs disabled:opacity-50 transition-all cursor-pointer"
            >
              {loading ? 'Kaydediliyor...' : 'Kaydet'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
