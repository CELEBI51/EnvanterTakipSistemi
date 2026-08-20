import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import useAuthStore from '../../../store/authStore';
import { API_BASE_URL } from '../../../config';

export default function EditLicenseModal({ isOpen, onClose, license, onSuccess }) {
  const token = useAuthStore((state) => state.accessToken);

  const [units, setUnits] = useState([]);
  const [loadingUnits, setLoadingUnits] = useState(false);

  const [unitId, setUnitId] = useState('');
  const [brand, setBrand] = useState('');
  const [productInfo, setProductInfo] = useState('');
  const [licenseKey, setLicenseKey] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [paymentType, setPaymentType] = useState('Tek Seferlik');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [invoiceAmount, setInvoiceAmount] = useState('');
  const [notes, setNotes] = useState('');

  const [loading, setLoading] = useState(false);
  const [generalError, setGeneralError] = useState('');

  useEffect(() => {
    if (isOpen) {
      fetchUnits();
    }
  }, [isOpen]);

  useEffect(() => {
    if (license && isOpen) {
      setUnitId(license.unitId || license.unit?.id || '');
      setBrand(license.brand || '');
      setProductInfo(license.productInfo || '');
      setLicenseKey(license.licenseKey || '');
      setStartDate(license.startDate ? license.startDate.split('T')[0] : '');
      setEndDate(license.endDate ? license.endDate.split('T')[0] : '');
      setPaymentType(license.paymentType || 'Tek Seferlik');
      setInvoiceNumber(license.invoiceNumber || '');
      setInvoiceAmount(license.invoiceAmount !== null && license.invoiceAmount !== undefined ? String(license.invoiceAmount) : '');
      setNotes(license.notes || '');
    }
  }, [license, isOpen]);

  const fetchUnits = async () => {
    setLoadingUnits(true);
    try {
      const res = await fetch(`${API_BASE_URL}/units`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) {
        setUnits(data.data || []);
      }
    } catch (err) {
      console.error('Birimler çekilemedi:', err);
    } finally {
      setLoadingUnits(false);
    }
  };

  if (!isOpen || !license) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setGeneralError('');

    if (!unitId || !brand.trim() || !productInfo.trim() || !startDate || !endDate) {
      setGeneralError('Lütfen gerekli alanları doldurunuz.');
      return;
    }

    const payload = {
      unitId,
      brand: brand.trim(),
      productInfo: productInfo.trim(),
      licenseKey: licenseKey.trim() || null,
      startDate,
      endDate,
      paymentType,
      invoiceNumber: invoiceNumber.trim() || null,
      invoiceAmount: invoiceAmount !== '' ? parseFloat(invoiceAmount) : null,
      notes: notes.trim() || null,
    };

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/licenses/${license.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Lisans güncellenirken hata oluştu.');
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
      <div className="bg-white w-full max-w-xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50/50">
          <div>
            <h2 className="text-lg font-bold text-[#1E2534] font-heading">Lisans Bilgilerini Düzenle</h2>
            <p className="text-xs text-slate-500 font-mono mt-0.5">{license.brand} {license.productInfo}</p>
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Kullanan Birim <span className="text-rose-500">*</span>
              </label>
              <select
                value={unitId}
                onChange={(e) => setUnitId(e.target.value)}
                required
                className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#4F8FE0]"
              >
                <option value="">-- Birim Seçin --</option>
                {units.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Yazılım Markası <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                placeholder="Örn: Microsoft, Adobe"
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                required
                className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#4F8FE0]"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Ürün Detayı / Sürüm <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                placeholder="Örn: Office 365 Business Standard"
                value={productInfo}
                onChange={(e) => setProductInfo(e.target.value)}
                required
                className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#4F8FE0]"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">Lisans Anahtarı / Ürün Kodu</label>
              <input
                type="text"
                placeholder="XXXXX-XXXXX-XXXXX-XXXXX"
                value={licenseKey}
                onChange={(e) => setLicenseKey(e.target.value)}
                className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 font-mono focus:outline-none focus:ring-2 focus:ring-[#4F8FE0]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Başlangıç Tarihi <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
                className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#4F8FE0]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Bitiş Tarihi <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                required
                className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#4F8FE0]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Ödeme Tipi</label>
              <select
                value={paymentType}
                onChange={(e) => setPaymentType(e.target.value)}
                className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#4F8FE0]"
              >
                <option value="Aylık">Aylık Abonelik</option>
                <option value="Yıllık">Yıllık Abonelik</option>
                <option value="Tek Seferlik">Tek Seferlik (Ömür Boyu)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Fatura Numarası</label>
              <input
                type="text"
                placeholder="Örn: GIB2026000456"
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#4F8FE0]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Fatura Tutarı ($)</label>
              <input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={invoiceAmount}
                onChange={(e) => setInvoiceAmount(e.target.value)}
                className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#4F8FE0]"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">Notlar / Açıklama</label>
              <textarea
                rows="2"
                placeholder="Ekstra açıklama veya abonelik notları..."
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
