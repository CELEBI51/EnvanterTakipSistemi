import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import useAuthStore from '../../../store/authStore';
import { API_BASE_URL } from '../../../config';
import FileUploadField from '../../../components/common/FileUploadField';
import { formatLicenseKeyInput } from '../../../utils/inputFormatters';

export default function AddLicenseModal({ isOpen, onClose, onSuccess }) {
  const token = useAuthStore((state) => state.accessToken);

  const [units, setUnits] = useState([]);
  const [loadingUnits, setLoadingUnits] = useState(false);
  const [unitId, setUnitId] = useState('');

  const [brand, setBrand] = useState('');
  const [productInfo, setProductInfo] = useState('');
  const [licenseKey, setLicenseKey] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState('');
  const [paymentType, setPaymentType] = useState('KREDI_KARTI');
  const [status, setStatus] = useState('YENILENMEDI');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [invoiceAmount, setInvoiceAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [selectedInvoiceFile, setSelectedInvoiceFile] = useState(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      fetchUnits();
    }
  }, [isOpen]);

  const fetchUnits = async () => {
    setLoadingUnits(true);
    try {
      const res = await fetch(`${API_BASE_URL}/units`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok && data.data) {
        setUnits(data.data);
      }
    } catch (err) {
      console.error('Birimler yüklenirken hata:', err);
    } finally {
      setLoadingUnits(false);
    }
  };

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!unitId) {
      setError('Lütfen birim seçiniz.');
      return;
    }

    if (!brand || !brand.trim()) {
      setError('Marka alanı boş bırakılamaz.');
      return;
    }

    if (!productInfo || !productInfo.trim()) {
      setError('Ürün bilgisi alanı boş bırakılamaz.');
      return;
    }

    if (!startDate) {
      setError('Lisans başlangıç tarihi girilmelidir.');
      return;
    }

    if (!endDate) {
      setError('Lisans bitiş tarihi girilmelidir.');
      return;
    }

    // Frontend validation: endDate must be after startDate
    if (new Date(endDate) <= new Date(startDate)) {
      setError('Bitiş tarihi, lisans oluşturulma (başlangıç) tarihinden sonra olmalıdır.');
      return;
    }

    setLoading(true);

    const payload = {
      unitId,
      brand: brand.trim(),
      productInfo: productInfo.trim(),
      licenseKey: licenseKey.trim() || undefined,
      startDate,
      endDate,
      paymentType,
      invoiceNumber: invoiceNumber.trim() || undefined,
      invoiceAmount: invoiceAmount ? Number(invoiceAmount) : undefined,
      notes: notes.trim() || undefined,
    };

    try {
      const res = await fetch(`${API_BASE_URL}/licenses`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Lisans kaydı eklenirken hata oluştu.');
      }

      const createdLicense = data.data;

      // Fatura Belgesi / PDF Yükleme
      if (selectedInvoiceFile && createdLicense?.id) {
        try {
          const formData = new FormData();
          formData.append('file', selectedInvoiceFile);
          formData.append('entityType', 'license');
          formData.append('entityId', createdLicense.id);
          formData.append('fileType', 'invoice');

          await fetch(`${API_BASE_URL}/attachments`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
            body: formData,
          });
        } catch (uploadErr) {
          console.error('Fatura belgesi yüklenirken hata:', uploadErr);
        }
      }

      // Reset Form
      setUnitId('');
      setBrand('');
      setProductInfo('');
      setLicenseKey('');
      setStartDate(new Date().toISOString().slice(0, 10));
      setEndDate('');
      setPaymentType('KREDI_KARTI');
      setStatus('YENILENMEDI');
      setInvoiceNumber('');
      setInvoiceAmount('');
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
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-[#1E2534] text-white shrink-0">
          <div>
            <h2 className="font-heading text-base font-bold">Yeni Lisans Ekle</h2>
            <p className="text-xs text-slate-300">Yenileme takibi yapılacak yeni lisans kaydı oluşturun.</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 flex items-center justify-center transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 flex-1">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-semibold">
              {error}
            </div>
          )}

          {/* Birim Seçimi */}
          <div>
            <label className="block text-xs font-bold text-[#1E2534] mb-1">
              Birim / Departman <span className="text-rose-500">*</span>
            </label>
            {loadingUnits ? (
              <div className="text-xs text-slate-500 py-2">Birimler yükleniyor...</div>
            ) : units.length === 0 ? (
              <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-800">
                Kayıtlı birim bulunamadı.
              </div>
            ) : (
              <select
                required
                value={unitId}
                onChange={(e) => setUnitId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-medium text-[#1E2534] focus:border-[#4F8FE0] focus:bg-white transition cursor-pointer"
              >
                <option value="">Birim Seçiniz...</option>
                {units.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Marka & Ürün Bilgisi */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-[#1E2534] mb-1">
                Marka <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                placeholder="Örn: Microsoft, JetBrains"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-[#1E2534] focus:border-[#4F8FE0] transition"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#1E2534] mb-1">
                Ürün Bilgisi <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={productInfo}
                onChange={(e) => setProductInfo(e.target.value)}
                placeholder="Örn: Office 365 Enterprise"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-[#1E2534] focus:border-[#4F8FE0] transition"
              />
            </div>
          </div>

          {/* Lisans Anahtarı */}
          <div>
            <label className="block text-xs font-bold text-[#1E2534] mb-1">
              Lisans Anahtarı (Opsiyonel)
            </label>
            <input
              type="text"
              value={licenseKey}
              onChange={(e) => setLicenseKey(formatLicenseKeyInput(e.target.value))}
              placeholder="XXXXX-XXXXX-XXXXX-XXXXX-XXXXX"
              maxLength={29}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-mono text-[#1E2534] focus:border-[#4F8FE0] transition"
            />
          </div>

          {/* Başlangıç Tarihi & Bitiş Tarihi */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-[#1E2534] mb-1">
                Lisans Başlangıç Tarihi <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                required
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-medium text-[#1E2534] focus:border-[#4F8FE0] transition cursor-pointer"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#1E2534] mb-1">
                Lisans Bitiş Tarihi <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                required
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-medium text-[#1E2534] focus:border-[#4F8FE0] transition cursor-pointer"
              />
            </div>
          </div>

          {/* Ödeme Tipi */}
          <div>
            <label className="block text-xs font-bold text-[#1E2534] mb-1">
              Ödeme Tipi <span className="text-rose-500">*</span>
            </label>
            <select
              required
              value={paymentType}
              onChange={(e) => setPaymentType(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-medium text-[#1E2534] focus:border-[#4F8FE0] transition cursor-pointer"
            >
              <option value="KREDI_KARTI">Kredi Kartı</option>
              <option value="NAKIT">Nakit</option>
              <option value="VADELI">Vadeli</option>
            </select>
          </div>

          {/* Fatura No & Fatura Tutarı */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-[#1E2534] mb-1">
                Fatura No (Opsiyonel)
              </label>
              <input
                type="text"
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value.slice(0, 50))}
                onBlur={(e) => setInvoiceNumber(e.target.value.trim())}
                placeholder="Örn: INV-2026-001"
                maxLength={50}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-mono text-[#1E2534] focus:border-[#4F8FE0] transition"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#1E2534] mb-1">
                Fatura Tutarı ($) (Opsiyonel)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={invoiceAmount}
                onChange={(e) => setInvoiceAmount(e.target.value)}
                placeholder="0.00"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-medium text-[#1E2534] focus:border-[#4F8FE0] transition"
              />
            </div>
          </div>

          {/* File Upload Component */}
          <FileUploadField
            label="Fatura Belgesi / PDF Ek (Opsiyonel)"
            selectedFile={selectedInvoiceFile}
            onFileSelect={setSelectedInvoiceFile}
            disabled={loading}
          />

          {/* Notlar */}
          <div>
            <label className="block text-xs font-bold text-[#1E2534] mb-1">
              Notlar (Opsiyonel)
            </label>
            <textarea
              rows="2"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Lisans ile ilgili ek notlar..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-medium text-[#1E2534] focus:border-[#4F8FE0] transition"
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
              {loading ? 'Kaydediliyor...' : 'Lisans Kaydet'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
