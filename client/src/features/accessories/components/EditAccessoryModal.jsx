import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import useAuthStore from '../../../store/authStore';
import { API_BASE_URL } from '../../../config';

export default function EditAccessoryModal({ isOpen, onClose, accessory, onSuccess }) {
  const token = useAuthStore((state) => state.accessToken);

  const [categories, setCategories] = useState([]);
  const [loadingCategories, setLoadingCategories] = useState(false);

  const [categoryId, setCategoryId] = useState('');
  const [name, setName] = useState('');
  const [brand, setBrand] = useState('');
  const [supplier, setSupplier] = useState('');
  const [totalQuantity, setTotalQuantity] = useState('');
  const [minThreshold, setMinThreshold] = useState('');
  const [notes, setNotes] = useState('');

  const [loading, setLoading] = useState(false);
  const [generalError, setGeneralError] = useState('');

  useEffect(() => {
    if (isOpen) {
      fetchCategories();
    }
  }, [isOpen]);

  useEffect(() => {
    if (accessory && isOpen) {
      setCategoryId(accessory.categoryId || '');
      setName(accessory.name || '');
      setBrand(accessory.brand || '');
      setSupplier(accessory.supplier || '');
      setTotalQuantity(accessory.totalQuantity !== null && accessory.totalQuantity !== undefined ? String(accessory.totalQuantity) : '0');
      setMinThreshold(accessory.minThreshold !== null && accessory.minThreshold !== undefined ? String(accessory.minThreshold) : '5');
      setNotes(accessory.notes || '');
    }
  }, [accessory, isOpen]);

  const fetchCategories = async () => {
    setLoadingCategories(true);
    try {
      const res = await fetch(`${API_BASE_URL}/categories?parentType=Aksesuar`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) {
        setCategories(data.data || []);
      }
    } catch (err) {
      console.error('Kategoriler çekilemedi:', err);
    } finally {
      setLoadingCategories(false);
    }
  };

  if (!isOpen || !accessory) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setGeneralError('');

    if (!name.trim()) {
      setGeneralError('Lütfen aksesuar adını giriniz.');
      return;
    }

    const payload = {
      categoryId: categoryId || null,
      name: name.trim(),
      brand: brand.trim() || null,
      supplier: supplier.trim() || null,
      totalQuantity: parseInt(totalQuantity, 10) || 0,
      minThreshold: parseInt(minThreshold, 10) || 0,
      notes: notes.trim() || null,
    };

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/accessories/${accessory.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Aksesuar güncellenirken hata oluştu.');
      }

      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      setGeneralError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50/50">
          <div>
            <h2 className="text-lg font-bold text-[#1E2534] font-heading">Aksesuar Bilgilerini Düzenle</h2>
            <p className="text-xs text-slate-500 font-mono mt-0.5">{accessory.name}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {generalError && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl font-medium">
              {generalError}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Aksesuar Adı <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                placeholder="Örn: Kablosuz Mouse"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#4F8FE0]"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Kategori</label>
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#4F8FE0]"
                >
                  <option value="">-- Kategori Seçin --</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Marka</label>
                <input
                  type="text"
                  placeholder="Örn: Logitech"
                  value={brand}
                  onChange={(e) => setBrand(e.target.value)}
                  className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#4F8FE0]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Toplam Stok Miktarı</label>
                <input
                  type="number"
                  min="0"
                  value={totalQuantity}
                  onChange={(e) => setTotalQuantity(e.target.value)}
                  className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#4F8FE0]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Kritik Stok Eşiği</label>
                <input
                  type="number"
                  min="0"
                  value={minThreshold}
                  onChange={(e) => setMinThreshold(e.target.value)}
                  className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#4F8FE0]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Tedarikçi Firma</label>
              <input
                type="text"
                placeholder="Örn: Hepsiburada / Vatan"
                value={supplier}
                onChange={(e) => setSupplier(e.target.value)}
                className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#4F8FE0]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Notlar / Açıklama</label>
              <textarea
                rows="2"
                placeholder="Aksesuar detayları..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#4F8FE0]"
              ></textarea>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-bold transition cursor-pointer"
            >
              İptal
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 rounded-xl bg-[#4F8FE0] hover:bg-[#3D75C4] text-white text-xs font-bold transition cursor-pointer disabled:opacity-50"
            >
              {loading ? 'Kaydediliyor...' : 'Değişiklikleri Kaydet'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
