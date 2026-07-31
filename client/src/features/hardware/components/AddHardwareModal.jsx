import React, { useState } from 'react';
import { X, Cpu, AlertCircle, Calendar, CheckCircle2, Printer } from 'lucide-react';
import useAuthStore from '../../../store/authStore';
import BarcodeLabel from '../../../components/common/BarcodeLabel';
import BarcodePrintModal from '../../../components/common/BarcodePrintModal';

const CATEGORIES = [
  'Desktop',
  'Laptop',
  'Monitör',
  'Yazıcı',
  'Diğer',
];

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

export default function AddHardwareModal({ isOpen, onClose, onSuccess }) {
  const token = useAuthStore((state) => state.accessToken);

  const [category, setCategory] = useState('Laptop');
  const [selectedBrand, setSelectedBrand] = useState('Dell');
  const [customBrand, setCustomBrand] = useState('');
  const [model, setModel] = useState('');
  const [serialNo, setSerialNo] = useState('');
  const [demirbasNo, setDemirbasNo] = useState('');

  // Warranty dates
  const [warrantyStartDate, setWarrantyStartDate] = useState('');
  const [warrantyEndDate, setWarrantyEndDate] = useState('');

  // Specs for Desktop & Laptop
  const [cpu, setCpu] = useState('');
  const [ram, setRam] = useState('');
  const [gpu, setGpu] = useState('');
  const [dvd, setDvd] = useState(false);

  const [loading, setLoading] = useState(false);
  const [generalError, setGeneralError] = useState('');
  const [demirbasNoError, setDemirbasNoError] = useState('');
  const [warrantyDateError, setWarrantyDateError] = useState('');
  const [brandError, setBrandError] = useState('');

  // Success screen state & created hardware details
  const [isSuccessView, setIsSuccessView] = useState(false);
  const [createdHardware, setCreatedHardware] = useState(null);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

  if (!isOpen) return null;

  const isPcCategory = category === 'Desktop' || category === 'Laptop';

  const resetForm = () => {
    setCategory('Laptop');
    setSelectedBrand('Dell');
    setCustomBrand('');
    setModel('');
    setSerialNo('');
    setDemirbasNo('');
    setWarrantyStartDate('');
    setWarrantyEndDate('');
    setCpu('');
    setRam('');
    setGpu('');
    setDvd(false);
    setGeneralError('');
    setDemirbasNoError('');
    setWarrantyDateError('');
    setBrandError('');
    setIsSuccessView(false);
    setCreatedHardware(null);
    setIsPrintModalOpen(false);
  };

  const handleCloseAndReset = () => {
    const wasSuccess = isSuccessView;
    resetForm();
    if (wasSuccess && onSuccess) {
      onSuccess();
    } else if (onClose) {
      onClose();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setGeneralError('');
    setDemirbasNoError('');
    setWarrantyDateError('');
    setBrandError('');

    // Demirbaş No Kontrolü
    if (!demirbasNo || !demirbasNo.trim()) {
      setDemirbasNoError('Demirbaş numarası girilmesi zorunludur.');
      return;
    }

    // Marka "Diğer" seçildiyse serbest metin kontrolü
    const finalBrand = selectedBrand === 'Diğer' ? customBrand.trim() : selectedBrand;
    if (!finalBrand) {
      setBrandError('Lütfen marka adını girin.');
      return;
    }

    // Garanti Tarihi Kontrolü
    if (warrantyStartDate && warrantyEndDate && warrantyEndDate < warrantyStartDate) {
      setWarrantyDateError('Garanti bitiş tarihi başlangıç tarihinden önce olamaz.');
      return;
    }

    setLoading(true);

    const payload = {
      category,
      brand: finalBrand,
      model: model.trim() || undefined,
      serial_no: serialNo.trim() || undefined,
      demirbas_no: demirbasNo.trim(),
      warranty_start_date: warrantyStartDate || undefined,
      warranty_end_date: warrantyEndDate || undefined,
    };

    if (isPcCategory) {
      payload.specs = {
        cpu: cpu.trim() || undefined,
        ram: ram.trim() || undefined,
        gpu: gpu.trim() || undefined,
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
        if (res.status === 409 || (data.message && data.message.includes('zaten kayıtlı'))) {
          setDemirbasNoError(data.message || 'Bu demirbaş numarası zaten kayıtlı, lütfen farklı bir numara girin.');
          return;
        }
        throw new Error(data.message || 'Ürün eklenirken hata oluştu.');
      }

      // Backend 201 Başarılı Yanıtı -> Başarı Görünümüne Geçiş
      setCreatedHardware(data.data || { demirbasNo: payload.demirbas_no, brand: payload.brand, model: payload.model });
      setIsSuccessView(true);
    } catch (err) {
      setGeneralError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
      <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-[#1E2534] text-white">
          <div>
            <h2 className="font-heading text-lg font-bold">
              {isSuccessView ? 'Ürün Kaydı Tamamlandı' : 'Yeni Donanım Ekle'}
            </h2>
            <p className="text-xs text-slate-300 mt-0.5">
              {isSuccessView
                ? 'Yeni ürün sisteme başarıyla kaydedildi.'
                : 'Sisteme yeni bir demirbaş/donanım kaydı oluşturun.'}
            </p>
          </div>
          <button
            onClick={handleCloseAndReset}
            className="w-8 h-8 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        {isSuccessView && createdHardware ? (
          /* Başarı Görünümü */
          <div className="p-6 flex flex-col items-center justify-center space-y-4 text-center overflow-y-auto">
            <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shadow-xs">
              <CheckCircle2 className="w-7 h-7" />
            </div>

            <div>
              <h3 className="font-heading text-base font-bold text-[#1E2534]">Ürün Başarıyla Eklendi!</h3>
              <p className="text-xs text-slate-500 mt-1">
                Aşağıdaki barkod etiketini doğrudan yazdırabilir veya kapatabilirsiniz.
              </p>
            </div>

            {/* Barkod Önizlemesi */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl w-full flex justify-center shadow-xs">
              <BarcodeLabel
                demirbasNo={createdHardware.demirbasNo}
                brand={createdHardware.brand}
                model={createdHardware.model}
              />
            </div>

            {/* Butonlar */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 w-full pt-2">
              <button
                type="button"
                onClick={() => setIsPrintModalOpen(true)}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#4F8FE0] hover:bg-[#3D75C4] active:bg-[#3566AD] text-white text-xs font-bold shadow-xs transition-all cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                Barkodu Yazdır
              </button>
              <button
                type="button"
                onClick={handleCloseAndReset}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
              >
                Kapat / Listeye Dön
              </button>
            </div>

            {/* Barkod Print Modalı */}
            <BarcodePrintModal
              isOpen={isPrintModalOpen}
              onClose={() => setIsPrintModalOpen(false)}
              demirbasNo={createdHardware.demirbasNo}
              brand={createdHardware.brand}
              model={createdHardware.model}
            />
          </div>
        ) : (
          /* Form Görünümü */
          <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 flex-1">
            {generalError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-medium flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{generalError}</span>
              </div>
            )}

            {/* Demirbaş Numarası (Her zaman görünür ve zorunlu) */}
            <div>
              <label className="block text-xs font-bold text-[#1E2534] mb-1">
                Demirbaş Numarası <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={demirbasNo}
                onChange={(e) => {
                  setDemirbasNo(e.target.value);
                  setDemirbasNoError('');
                }}
                placeholder="ör. 2024-0157"
                className={`w-full px-3.5 py-2.5 rounded-xl border text-xs font-mono text-[#1E2534] focus:outline-hidden ${demirbasNoError
                  ? 'border-rose-500 bg-rose-50/30 focus:border-rose-500 focus:ring-1 focus:ring-rose-500'
                  : 'border-[#E2E8F0] focus:border-[#4F8FE0] focus:ring-1 focus:ring-[#4F8FE0]'
                  }`}
              />
              {demirbasNoError && (
                <p className="text-xs font-bold text-rose-600 mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  {demirbasNoError}
                </p>
              )}
            </div>

            {/* Kategori */}
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

            {/* Marka & Model */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Marka (Dropdown) */}
              <div>
                <label className="block text-xs font-bold text-[#1E2534] mb-1">
                  Marka <span className="text-rose-500">*</span>
                </label>
                <select
                  value={selectedBrand}
                  onChange={(e) => {
                    setSelectedBrand(e.target.value);
                    setBrandError('');
                  }}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#E2E8F0] text-xs font-medium text-[#1E2534] focus:outline-hidden focus:border-[#4F8FE0] focus:ring-1 focus:ring-[#4F8FE0]"
                >
                  {BRAND_OPTIONS.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </select>
              </div>

              {/* Model (Opsiyonel) */}
              <div>
                <label className="block text-xs font-bold text-[#1E2534] mb-1">
                  Model <span className="text-slate-400 font-normal">(opsiyonel)</span>
                </label>
                <input
                  type="text"
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  placeholder="ör. ThinkPad X1"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#E2E8F0] text-xs text-[#1E2534] focus:outline-hidden focus:border-[#4F8FE0] focus:ring-1 focus:ring-[#4F8FE0]"
                />
              </div>
            </div>

            {/* "Diğer" Marka Seçildiğinde Açılan Serbest Metin Input */}
            {selectedBrand === 'Diğer' && (
              <div>
                <label className="block text-xs font-bold text-[#1E2534] mb-1">
                  Marka Adını Girin <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={customBrand}
                  onChange={(e) => {
                    setCustomBrand(e.target.value);
                    setBrandError('');
                  }}
                  placeholder="Gerçek marka adını girin (ör. Monster)"
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-xs text-[#1E2534] focus:outline-hidden ${brandError
                    ? 'border-rose-500 bg-rose-50/30'
                    : 'border-[#E2E8F0] focus:border-[#4F8FE0] focus:ring-1 focus:ring-[#4F8FE0]'
                    }`}
                />
                {brandError && <p className="text-xs font-semibold text-rose-600 mt-1">{brandError}</p>}
              </div>
            )}

            {/* Seri No */}
            <div>
              <label className="block text-xs font-bold text-[#1E2534] mb-1">
                Seri No <span className="text-slate-400 font-normal">(opsiyonel)</span>
              </label>
              <input
                type="text"
                value={serialNo}
                onChange={(e) => setSerialNo(e.target.value)}
                placeholder="ör. SN-9988776655"
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#E2E8F0] text-xs font-mono text-[#1E2534] focus:outline-hidden focus:border-[#4F8FE0] focus:ring-1 focus:ring-[#4F8FE0]"
              />
            </div>

            {/* Garanti Başlangıç & Bitiş Tarihleri (Opsiyonel) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-[#1E2534] mb-1 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-[#4F8FE0]" />
                  Garanti Başlangıç Tarihi <span className="text-slate-400 font-normal"></span>
                </label>
                <input
                  type="date"
                  value={warrantyStartDate}
                  onChange={(e) => {
                    setWarrantyStartDate(e.target.value);
                    setWarrantyDateError('');
                  }}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#E2E8F0] text-xs text-[#1E2534] focus:outline-hidden focus:border-[#4F8FE0] focus:ring-1 focus:ring-[#4F8FE0]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#1E2534] mb-1 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-amber-500" />
                  Garanti Bitiş Tarihi <span className="text-slate-400 font-normal"></span>
                </label>
                <input
                  type="date"
                  value={warrantyEndDate}
                  min={warrantyStartDate}
                  onChange={(e) => {
                    setWarrantyEndDate(e.target.value);
                    setWarrantyDateError('');
                  }}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#E2E8F0] text-xs text-[#1E2534] focus:outline-hidden focus:border-[#4F8FE0] focus:ring-1 focus:ring-[#4F8FE0]"
                />
              </div>
            </div>
            {warrantyDateError && (
              <p className="text-xs font-bold text-rose-600 mt-1 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" />
                {warrantyDateError}
              </p>
            )}

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
                onClick={handleCloseAndReset}
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
        )}
      </div>
    </div>
  );
}
