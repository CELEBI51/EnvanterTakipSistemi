import React, { useState } from 'react';
import { X } from 'lucide-react';
import useAuthStore from '../../../store/authStore';

export default function RestockConsumableModal({ isOpen, onClose, consumable, onSuccess }) {
  const token = useAuthStore((state) => state.accessToken);

  const [quantity, setQuantity] = useState(10);
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen || !consumable) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const qtyNum = parseInt(quantity, 10);
    if (isNaN(qtyNum) || qtyNum < 1) {
      setError('Eklenecek stok miktarı 1 veya daha büyük olmalıdır.');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(`http://localhost:4001/api/consumables/${consumable.id}/restock`, {
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
        throw new Error(data.message || 'Stok eklenirken hata oluştu.');
      }

      setQuantity(10);
      setNote('');
      onSuccess();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const newTotal = consumable.totalQuantity + (parseInt(quantity, 10) || 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-md overflow-hidden flex flex-col my-8">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-[#1E2534] text-white">
          <div>
            <h3 className="font-heading text-base font-bold">Stok Takviyesi Yap</h3>
            <p className="text-xs text-slate-300 truncate max-w-[240px]">{consumable.name}</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 flex items-center justify-center transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-medium">
              {error}
            </div>
          )}

          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-600 font-medium">Mevcut Toplam Stok:</span>
              <span className="font-mono font-bold text-[#1E2534]">{consumable.totalQuantity} adet</span>
            </div>
            <div className="flex justify-between text-emerald-700 font-bold pt-1 border-t border-slate-200">
              <span>Yeni Toplam Stok:</span>
              <span className="font-mono">{newTotal} adet</span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#1E2534] mb-1">
              Eklenecek Stok Miktarı <span className="text-rose-500">*</span>
            </label>
            <input
              type="number"
              min="1"
              required
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-mono text-[#1E2534]"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[#1E2534] mb-1">
              Not / Sipariş Açıklaması
            </label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder=""
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-[#1E2534]"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-xs font-semibold text-slate-600 hover:text-slate-800 transition cursor-pointer"
            >
              İptal
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs disabled:opacity-50 transition cursor-pointer"
            >
              {loading ? 'Ekleniyor...' : 'Stok Ekle'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
