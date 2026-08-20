import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import useAuthStore from '../../../store/authStore';
import { API_BASE_URL } from '../../../config';

const BRAND_OPTIONS = [
  'Dell',
  'HP',
  'Lenovo',
  'Asus',
  'Apple',
  'Acer',
  'MSI',
  'Logitech',
  'Canon',
  'Epson',
  'Samsung',
  'LG',
  'Diğer',
];

export default function EditHardwareModal({ isOpen, onClose, hardware, onSuccess }) {
  const token = useAuthStore((state) => state.accessToken);

  const [categories, setCategories] = useState([]);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [categoryId, setCategoryId] = useState('');

  const [selectedBrand, setSelectedBrand] = useState('');
  const [customBrand, setCustomBrand] = useState('');
  const [model, setModel] = useState('');
  const [serialNo, setSerialNo] = useState('');
  const [demirbasNo, setDemirbasNo] = useState('');

  const [wifiMacAddress, setWifiMacAddress] = useState('');
  const [location, setLocation] = useState('');
  const [supplier, setSupplier] = useState('');
  const [invoiceNo, setInvoiceNo] = useState('');
  const [purchaseDate, setPurchaseDate] = useState('');
  const [purchaseAmount, setPurchaseAmount] = useState('');

  const [warrantyStartDate, setWarrantyStartDate] = useState('');
  const [warrantyEndDate, setWarrantyEndDate] = useState('');

  const [cpu, setCpu] = useState('');
  const [ram, setRam] = useState('');
  const [gpu, setGpu] = useState('');
  const [dvd, setDvd] = useState(false);

  const [loading, setLoading] = useState(false);
  const [generalError, setGeneralError] = useState('');

  useEffect(() => {
    if (isOpen) {
      fetchCategories();
    }
  }, [isOpen]);

  useEffect(() => {
    if (hardware && isOpen) {
      setCategoryId(hardware.categoryId || '');
      
      const brandVal = hardware.brand || '';
      if (BRAND_OPTIONS.includes(brandVal)) {
        setSelectedBrand(brandVal);
        setCustomBrand('');
      } else {
        setSelectedBrand('Diğer');
        setCustomBrand(brandVal);
      }

      setModel(hardware.model || '');
      setSerialNo(hardware.serialNo || '');
      setDemirbasNo(hardware.demirbasNo || '');
      setWifiMacAddress(hardware.wifiMacAddress || '');
      setLocation(hardware.location || '');
      setSupplier(hardware.supplier || '');
      setInvoiceNo(hardware.invoiceNo || '');

      setPurchaseDate(hardware.purchaseDate ? hardware.purchaseDate.split('T')[0] : '');
      setPurchaseAmount(hardware.purchaseAmount !== null && hardware.purchaseAmount !== undefined ? String(hardware.purchaseAmount) : '');

      setWarrantyStartDate(hardware.warrantyStartDate ? hardware.warrantyStartDate.split('T')[0] : '');
      setWarrantyEndDate(hardware.warrantyEndDate ? hardware.warrantyEndDate.split('T')[0] : '');

      const specs = hardware.specs || {};
      setCpu(specs.cpu || '');
      setRam(specs.ram || '');
      setGpu(specs.gpu || '');
      setDvd(specs.dvd === true || specs.dvd === 'Var');
    }
  }, [hardware, isOpen]);

  const fetchCategories = async () => {
    setLoadingCategories(true);
    try {
      const res = await fetch(`${API_BASE_URL}/categories?parentType=Varlık`, {
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

  if (!isOpen || !hardware) return null;

  const selectedCategoryObj = categories.find((c) => c.id === categoryId);
  const selectedCategoryName = selectedCategoryObj ? selectedCategoryObj.name : '';
  const isPcCategory = selectedCategoryName === 'Desktop' || selectedCategoryName === 'Laptop';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setGeneralError('');

    const finalBrand = selectedBrand === 'Diğer' ? customBrand.trim() : selectedBrand;
    if (!finalBrand) {
      setGeneralError('Lütfen marka belirtin.');
      return;
    }

    const payload = {
      categoryId,
      brand: finalBrand,
      model: model.trim() || null,
      serialNo: serialNo.trim(),
      demirbasNo: demirbasNo.trim() || null,
      wifiMacAddress: wifiMacAddress.trim() || null,
      location: location.trim() || null,
      supplier: supplier.trim() || null,
      invoiceNo: invoiceNo.trim() || null,
      purchaseDate: purchaseDate || null,
      purchaseAmount: purchaseAmount !== '' ? parseFloat(purchaseAmount) : null,
      warrantyStartDate: warrantyStartDate || null,
      warrantyEndDate: warrantyEndDate || null,
      specs: isPcCategory
        ? {
            cpu: cpu.trim() || null,
            ram: ram.trim() || null,
            gpu: gpu.trim() || null,
            dvd,
          }
        : null,
    };

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/hardware/${hardware.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Ürün güncellenirken bir hata oluştu.');
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
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50/50">
          <div>
            <h2 className="text-lg font-bold text-[#1E2534] font-heading">Varlık Bilgilerini Düzenle</h2>
            <p className="text-xs text-slate-500 font-mono mt-0.5">Demirbaş No: {hardware.demirbasNo || '-'}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
          {generalError && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl font-medium">
              {generalError}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Kategori <span className="text-rose-500">*</span>
              </label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                required
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
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Marka <span className="text-rose-500">*</span>
              </label>
              <select
                value={selectedBrand}
                onChange={(e) => setSelectedBrand(e.target.value)}
                required
                className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#4F8FE0]"
              >
                <option value="">-- Marka Seçin --</option>
                {BRAND_OPTIONS.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
              {selectedBrand === 'Diğer' && (
                <input
                  type="text"
                  placeholder="Marka adını giriniz..."
                  value={customBrand}
                  onChange={(e) => setCustomBrand(e.target.value)}
                  required
                  className="mt-2 w-full text-xs px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#4F8FE0]"
                />
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Model</label>
              <input
                type="text"
                placeholder="Örn: OptiPlex 7090"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#4F8FE0]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Seri Numarası</label>
              <input
                type="text"
                placeholder="Örn: CN-0X1234"
                value={serialNo}
                onChange={(e) => setSerialNo(e.target.value)}
                className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#4F8FE0]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Demirbaş No</label>
              <input
                type="text"
                value={demirbasNo}
                onChange={(e) => setDemirbasNo(e.target.value)}
                className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#4F8FE0]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Konum / Odası</label>
              <input
                type="text"
                placeholder="Örn: Bilgi İşlem / Kat 2"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#4F8FE0]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Tedarikçi Firma</label>
              <input
                type="text"
                placeholder="Örn: Vatan Bilgisayar"
                value={supplier}
                onChange={(e) => setSupplier(e.target.value)}
                className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#4F8FE0]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Fatura No</label>
              <input
                type="text"
                placeholder="Örn: GIB2026000123"
                value={invoiceNo}
                onChange={(e) => setInvoiceNo(e.target.value)}
                className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#4F8FE0]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Satın Alma Tarihi</label>
              <input
                type="date"
                value={purchaseDate}
                onChange={(e) => setPurchaseDate(e.target.value)}
                className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#4F8FE0]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Satın Alma Tutarı ($)</label>
              <input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={purchaseAmount}
                onChange={(e) => setPurchaseAmount(e.target.value)}
                className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#4F8FE0]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Garanti Başlangıç</label>
              <input
                type="date"
                value={warrantyStartDate}
                onChange={(e) => setWarrantyStartDate(e.target.value)}
                className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#4F8FE0]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Garanti Bitiş</label>
              <input
                type="date"
                value={warrantyEndDate}
                onChange={(e) => setWarrantyEndDate(e.target.value)}
                className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#4F8FE0]"
              />
            </div>
          </div>

          {isPcCategory && (
            <div className="pt-3 border-t border-slate-100">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-3">Sistem Donanım Özellikleri</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">İşlemci (CPU)</label>
                  <input
                    type="text"
                    placeholder="i7-12700K"
                    value={cpu}
                    onChange={(e) => setCpu(e.target.value)}
                    className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#4F8FE0]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Bellek (RAM)</label>
                  <input
                    type="text"
                    placeholder="16 GB DDR4"
                    value={ram}
                    onChange={(e) => setRam(e.target.value)}
                    className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#4F8FE0]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Ekran Kartı (GPU)</label>
                  <input
                    type="text"
                    placeholder="RTX 3060"
                    value={gpu}
                    onChange={(e) => setGpu(e.target.value)}
                    className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#4F8FE0]"
                  />
                </div>
              </div>
            </div>
          )}

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
