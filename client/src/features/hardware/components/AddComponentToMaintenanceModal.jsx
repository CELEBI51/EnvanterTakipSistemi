import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import useAuthStore from '../../../store/authStore';
import { API_BASE_URL } from '../../../config';

export default function AddComponentToMaintenanceModal({ isOpen, onClose, maintenanceId, onSuccess }) {
  const token = useAuthStore((state) => state.accessToken);

  const [components, setComponents] = useState([]);
  const [loadingComponents, setLoadingComponents] = useState(false);
  const [componentId, setComponentId] = useState('');

  const [quantityUsed, setQuantityUsed] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      fetchComponents();
    }
  }, [isOpen]);

  const fetchComponents = async () => {
    setLoadingComponents(true);
    try {
      const res = await fetch(`${API_BASE_URL}/components?pageSize=100`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok && data.data) {
        setComponents(data.data);
      }
    } catch (err) {
      console.error('Bileşenler alınamadı:', err);
    } finally {
      setLoadingComponents(false);
    }
  };

  if (!isOpen) return null;

  const selectedComp = components.find((c) => c.id === componentId);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!componentId) {
      setError('Lütfen bakıma eklenecek bileşeni seçin.');
      return;
    }

    const qtyNum = parseInt(quantityUsed, 10);
    if (isNaN(qtyNum) || qtyNum < 1) {
      setError('Kullanılan miktar 1 veya daha büyük olmalıdır.');
      return;
    }

    if (selectedComp && qtyNum > selectedComp.availableQuantity) {
      setError(`Yeterli stok yok. Mevcut hazır stok: ${selectedComp.availableQuantity} adet.`);
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(`${API_BASE_URL}/maintenance/${maintenanceId}/components`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          componentId,
          quantityUsed: qtyNum,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Bileşen eklenirken hata oluştu.');
      }

      setComponentId('');
      setQuantityUsed(1);
      onSuccess();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-md overflow-hidden flex flex-col my-8">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-[#1E2534] text-white">
          <div>
            <h3 className="font-heading text-base font-bold">Bakıma Bileşen Ekle</h3>
            <p className="text-xs text-slate-300">Stoktaki donanım bileşenlerinden ekleyin.</p>
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

          {/* Bileşen Seçimi */}
          <div>
            <label className="block text-xs font-bold text-[#1E2534] mb-1">
              Bileşen Seçin <span className="text-rose-500">*</span>
            </label>
            {loadingComponents ? (
              <div className="text-xs text-slate-500 py-2">Bileşenler yükleniyor...</div>
            ) : components.length === 0 ? (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800">
                Stokta kayıtlı bileşen bulunmuyor. Önce Bileşenler sayfasından stok eklenmelidir.
              </div>
            ) : (
              <select
                value={componentId}
                onChange={(e) => setComponentId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-medium text-[#1E2534]"
              >
                <option value="">Seçiniz...</option>
                {components.map((c) => (
                  <option key={c.id} value={c.id} disabled={c.availableQuantity === 0}>
                    {c.name} {c.brand ? `(${c.brand})` : ''} — Stok: {c.availableQuantity} adet {c.availableQuantity === 0 ? '(Stok Yok)' : ''}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Kullanılan Miktar */}
          <div>
            <label className="block text-xs font-bold text-[#1E2534] mb-1">
              Kullanılan Miktar (Adet) <span className="text-rose-500">*</span>
            </label>
            <input
              type="number"
              min="1"
              max={selectedComp ? selectedComp.availableQuantity : undefined}
              required
              value={quantityUsed}
              onChange={(e) => setQuantityUsed(e.target.value)}
              placeholder=""
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-mono text-[#1E2534]"
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
              disabled={loading || !componentId}
              className="px-5 py-2.5 text-xs font-bold text-white bg-[#4F8FE0] hover:bg-[#3D75C4] rounded-xl shadow-xs disabled:opacity-50 transition cursor-pointer"
            >
              {loading ? 'Ekleniyor...' : 'Bileşen Ekle'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
