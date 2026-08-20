import React, { useState } from 'react';
import { X, AlertTriangle, AlertCircle } from 'lucide-react';
import useAuthStore from '../../../store/authStore';
import { API_BASE_URL } from '../../../config';

export default function MarkDefectiveModal({ isOpen, onClose, accessory, onSuccess }) {
  const token = useAuthStore((state) => state.accessToken);

  const [quantity, setQuantity] = useState(1);
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen || !accessory) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const qtyNum = parseInt(quantity, 10);
    if (isNaN(qtyNum) || qtyNum < 1) {
      setError('Ayrılacak miktar 1 veya daha büyük olmalıdır.');
      return;
    }

    if (qtyNum > accessory.availableQuantity) {
      setError(`Yeterli hazır stok yok. Mevcut hazır stok: ${accessory.availableQuantity} adet.`);
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(`${API_BASE_URL}/accessories/${accessory.id}/mark-defective`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          quantity: qtyNum,
          note: note.trim() || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Arızalı stok ayrılırken hata oluştu.');
      }

      setQuantity(1);
      setNote('');
      onSuccess();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
      <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-2xl w-full max-w-md overflow-hidden flex flex-col my-8">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 bg-[#1E2534] text-white">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500 text-white flex items-center justify-center font-bold">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-heading text-base font-bold">Arızalı / Kullanım Dışı Ayır</h3>
              <p className="text-[11px] text-[#A0AEC0] truncate max-w-[220px]">{accessory.name}</p>
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
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-medium flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 flex justify-between items-center text-xs text-amber-900">
            <span className="font-medium">Kullanılabilir Hazır Stok:</span>
            <span className="font-mono font-bold text-sm text-amber-950">
              {accessory.availableQuantity} adet
            </span>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#1E2534] mb-1">
              Arızalı Ayrılacak Miktar <span className="text-rose-500">*</span>
            </label>
            <input
              type="number"
              min="1"
              max={accessory.availableQuantity}
              required
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#E2E8F0] text-xs font-mono text-[#1E2534] focus:outline-hidden focus:border-[#4F8FE0] focus:ring-1 focus:ring-[#4F8FE0]"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[#1E2534] mb-1">
              Arıza / Ayrılma Nedeni
            </label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder=""
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#E2E8F0] text-xs text-[#1E2534] focus:outline-hidden focus:border-[#4F8FE0] focus:ring-1 focus:ring-[#4F8FE0]"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            >
              İptal
            </button>
            <button
              type="submit"
              disabled={loading || accessory.availableQuantity === 0}
              className="px-5 py-2.5 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-xl shadow-xs disabled:opacity-50 transition-all cursor-pointer"
            >
              {loading ? 'İşleniyor...' : 'Arızalı Olarak Ayır'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
