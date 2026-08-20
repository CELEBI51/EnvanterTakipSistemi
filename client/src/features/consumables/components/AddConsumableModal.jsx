import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import useAuthStore from '../../../store/authStore';
import { API_BASE_URL } from '../../../config';
import FileUploadField from '../../../components/common/FileUploadField';

export default function AddConsumableModal({ isOpen, onClose, onSuccess }) {
  const token = useAuthStore((state) => state.accessToken);

  const [categories, setCategories] = useState([]);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [categoryId, setCategoryId] = useState('');

  const [name, setName] = useState('');
  const [initialQuantity, setInitialQuantity] = useState(10);
  const [manufacturer, setManufacturer] = useState('');
  const [supplier, setSupplier] = useState('');
  const [location, setLocation] = useState('');
  const [invoiceNo, setInvoiceNo] = useState('');
  const [purchaseDate, setPurchaseDate] = useState('');
  const [purchaseAmount, setPurchaseAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [selectedInvoiceFile, setSelectedInvoiceFile] = useState(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      fetchCategories();
    }
  }, [isOpen]);

  const fetchCategories = async () => {
    setLoadingCategories(true);
    try {
      const res = await fetch(`${API_BASE_URL}/categories?parentType=Sarf Malzeme`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok && data.data) {
        setCategories(data.data);
      }
    } catch (err) {
      console.error('Sarf malzeme kategorileri alınamadı:', err);
    } finally {
      setLoadingCategories(false);
    }
  };

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!name || !name.trim()) {
      setError('Sarf malzeme ürün adı zorunludur.');
      return;
    }

    if (!categoryId) {
      setError('Lütfen bir kategori seçin.');
      return;
    }

    const qtyNum = parseInt(initialQuantity, 10);
    if (isNaN(qtyNum) || qtyNum < 1) {
      setError('Başlangıç stok miktarı 1 veya daha büyük olmalıdır.');
      return;
    }

    setLoading(true);

    const payload = {
      name: name.trim(),
      categoryId,
      initialQuantity: qtyNum,
      manufacturer: manufacturer.trim() || undefined,
      supplier: supplier.trim() || undefined,
      location: location.trim() || undefined,
      invoiceNo: invoiceNo.trim() || undefined,
      purchaseDate: purchaseDate || undefined,
      purchaseAmount: purchaseAmount ? Number(purchaseAmount) : undefined,
      notes: notes.trim() || undefined,
    };

    try {
      const res = await fetch(`${API_BASE_URL}/consumables`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Sarf malzeme eklenirken hata oluştu.');
      }

      const createdItem = data.data;

      // Fatura PDF/Resim Yükleme
      if (selectedInvoiceFile && createdItem?.id) {
        try {
          const formData = new FormData();
          formData.append('file', selectedInvoiceFile);
          formData.append('entityType', 'consumable');
          formData.append('entityId', createdItem.id);
          formData.append('fileType', 'invoice');

          await fetch(`${API_BASE_URL}/attachments`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
            body: formData,
          });
        } catch (uploadErr) {
          console.error('Fatura dosyası yüklenirken hata:', uploadErr);
        }
      }

      // Reset Form
      setName('');
      setCategoryId('');
      setInitialQuantity(10);
      setManufacturer('');
      setSupplier('');
      setLocation('');
      setInvoiceNo('');
      setPurchaseDate('');
      setPurchaseAmount('');
      setNotes('');
      setSelectedInvoiceFile(null);

      onSuccess();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-[#1E2534] text-white">
          <div>
            <h2 className="font-heading text-base font-bold">Yeni Sarf Malzeme Ekle</h2>
            <p className="text-xs text-slate-300">Stok takibi yapılacak yeni sarf malzeme tanımı yapın.</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 flex items-center justify-center transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 flex-1">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-medium">
              {error}
            </div>
          )}

          {/* Ürün Adı */}
          <div>
            <label className="block text-xs font-bold text-[#1E2534] mb-1">
              Sarf Malzeme Ürün Adı <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder=""
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-[#1E2534]"
            />
          </div>

          {/* Kategori & Başlangıç Stok */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-[#1E2534] mb-1">
                Kategori <span className="text-rose-500">*</span>
              </label>
              {loadingCategories ? (
                <div className="text-xs text-slate-500 py-2">Kategoriler yükleniyor...</div>
              ) : categories.length === 0 ? (
                <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-800">
                  Kategori bulunamadı.
                </div>
              ) : (
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-medium text-[#1E2534]"
                >
                  <option value="">Seçiniz...</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              )}
            </div>

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
                placeholder=""
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-mono text-[#1E2534]"
              />
            </div>
          </div>

          {/* Üretici & Tedarikçi */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-[#1E2534] mb-1">
                Üretici Firma
              </label>
              <input
                type="text"
                value={manufacturer}
                onChange={(e) => setManufacturer(e.target.value)}
                placeholder=""
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-[#1E2534]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#1E2534] mb-1">
                Tedarikçi Firma
              </label>
              <input
                type="text"
                value={supplier}
                onChange={(e) => setSupplier(e.target.value)}
                placeholder=""
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-[#1E2534]"
              />
            </div>
          </div>

          {/* Lokasyon & Fatura No */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-[#1E2534] mb-1">
                Lokasyon / Depo
              </label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder=""
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-[#1E2534]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#1E2534] mb-1">
                Fatura No
              </label>
              <input
                type="text"
                value={invoiceNo}
                onChange={(e) => setInvoiceNo(e.target.value)}
                placeholder=""
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-[#1E2534]"
              />
            </div>
          </div>

          {/* Satın Alma Tarihi & Tutarı */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-[#1E2534] mb-1">
                Satın Alma Tarihi
              </label>
              <input
                type="date"
                value={purchaseDate}
                onChange={(e) => setPurchaseDate(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-[#1E2534]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#1E2534] mb-1">
                Satın Alma Tutarı (₺)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={purchaseAmount}
                onChange={(e) => setPurchaseAmount(e.target.value)}
                placeholder=""
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-[#1E2534]"
              />
            </div>
          </div>

          {/* File Upload Component */}
          <FileUploadField
            label="Fatura Belgesi / PDF Ek"
            selectedFile={selectedInvoiceFile}
            onFileSelect={setSelectedInvoiceFile}
            disabled={loading}
          />

          {/* Notlar */}
          <div>
            <label className="block text-xs font-bold text-[#1E2534] mb-1">
              Notlar
            </label>
            <textarea
              rows="2"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder=""
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-[#1E2534]"
            ></textarea>
          </div>

          {/* Actions */}
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
              className="px-5 py-2.5 text-xs font-bold text-white bg-[#4F8FE0] hover:bg-[#3D75C4] rounded-xl shadow-xs disabled:opacity-50 transition cursor-pointer"
            >
              {loading ? 'Kaydediliyor...' : 'Kaydet'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
