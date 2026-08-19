import React, { useState, useEffect } from 'react';
import { X, CheckCircle2, Printer } from 'lucide-react';
import useAuthStore from '../../../store/authStore';
import BarcodeLabel from '../../../components/common/BarcodeLabel';
import BarcodePrintModal from '../../../components/common/BarcodePrintModal';
import FileUploadField from '../../../components/common/FileUploadField';

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

  const [categories, setCategories] = useState([]);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [categoryId, setCategoryId] = useState('');

  const [selectedBrand, setSelectedBrand] = useState('');
  const [customBrand, setCustomBrand] = useState('');
  const [model, setModel] = useState('');
  const [serialNo, setSerialNo] = useState('');
  const [demirbasNo, setDemirbasNo] = useState('');

  // New optional fields
  const [wifiMacAddress, setWifiMacAddress] = useState('');
  const [location, setLocation] = useState('');
  const [supplier, setSupplier] = useState('');
  const [invoiceNo, setInvoiceNo] = useState('');
  const [purchaseDate, setPurchaseDate] = useState('');
  const [purchaseAmount, setPurchaseAmount] = useState('');

  // File Upload State
  const [selectedInvoiceFile, setSelectedInvoiceFile] = useState(null);

  // Warranty dates
  const [warrantyStartDate, setWarrantyStartDate] = useState('');
  const [warrantyEndDate, setWarrantyEndDate] = useState('');

  // Specs for PC categories
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

  useEffect(() => {
    if (isOpen) {
      fetchCategories();
    }
  }, [isOpen]);

  const fetchCategories = async () => {
    setLoadingCategories(true);
    try {
      const res = await fetch('http://localhost:4001/api/categories?parentType=Varlık', {
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

  if (!isOpen) return null;

  const selectedCategoryObj = categories.find((c) => c.id === categoryId);
  const selectedCategoryName = selectedCategoryObj ? selectedCategoryObj.name : '';
  const isPcCategory = selectedCategoryName === 'Desktop' || selectedCategoryName === 'Laptop';

  const resetForm = () => {
    setCategoryId('');
    setSelectedBrand('');
    setCustomBrand('');
    setModel('');
    setSerialNo('');
    setDemirbasNo('');
    setWifiMacAddress('');
    setLocation('');
    setSupplier('');
    setInvoiceNo('');
    setPurchaseDate('');
    setPurchaseAmount('');
    setSelectedInvoiceFile(null);
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

    if (!categoryId) {
      setGeneralError('Lütfen bir kategori seçin.');
      return;
    }

    if (!demirbasNo || !demirbasNo.trim()) {
      setDemirbasNoError('Demirbaş numarası girilmesi zorunludur.');
      return;
    }

    const finalBrand = selectedBrand === 'Diğer' ? customBrand.trim() : selectedBrand;
    if (!finalBrand) {
      setBrandError('Lütfen marka seçin veya marka adını girin.');
      return;
    }

    if (warrantyStartDate && warrantyEndDate && warrantyEndDate < warrantyStartDate) {
      setWarrantyDateError('Garanti bitiş tarihi başlangıç tarihinden önce olamaz.');
      return;
    }

    setLoading(true);

    const payload = {
      categoryId,
      brand: finalBrand,
      model: model.trim() || undefined,
      serial_no: serialNo.trim() || undefined,
      demirbas_no: demirbasNo.trim(),
      wifiMacAddress: wifiMacAddress.trim() || undefined,
      location: location.trim() || undefined,
      supplier: supplier.trim() || undefined,
      invoiceNo: invoiceNo.trim() || undefined,
      purchaseDate: purchaseDate || undefined,
      purchaseAmount: purchaseAmount ? Number(purchaseAmount) : undefined,
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
      const res = await fetch('http://localhost:4001/api/hardware', {
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

      const createdItem = data.data;

      // Fatura PDF yükleme varsa POST /api/attachments
      if (selectedInvoiceFile && createdItem?.id) {
        try {
          const formData = new FormData();
          formData.append('file', selectedInvoiceFile);
          formData.append('entityType', 'hardware');
          formData.append('entityId', createdItem.id);
          formData.append('fileType', 'invoice');

          await fetch('http://localhost:4001/api/attachments', {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
            body: formData,
          });
        } catch (uploadErr) {
          console.error('Fatura dosyası yüklenirken hata:', uploadErr);
        }
      }

      setCreatedHardware(createdItem || { demirbasNo: payload.demirbas_no, brand: payload.brand, model: payload.model });
      setIsSuccessView(true);
    } catch (err) {
      setGeneralError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-[#1E2534] text-white">
          <div>
            <h2 className="text-lg font-bold font-heading">
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
            className="w-8 h-8 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 flex items-center justify-center transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        {isSuccessView && createdHardware ? (
          <div className="p-6 flex flex-col items-center justify-center space-y-4 text-center overflow-y-auto">
            <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-7 h-7" />
            </div>

            <div>
              <h3 className="font-heading text-base font-bold text-[#1E2534]">Ürün Başarıyla Eklendi!</h3>
              <p className="text-xs text-slate-500 mt-1">
                Barkod etiketini yazdırabilir veya kapatabilirsiniz.
              </p>
            </div>

            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl w-full flex justify-center">
              <BarcodeLabel
                demirbasNo={createdHardware.demirbasNo}
                brand={createdHardware.brand}
                model={createdHardware.model}
              />
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 w-full pt-2">
              <button
                type="button"
                onClick={() => setIsPrintModalOpen(true)}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#4F8FE0] hover:bg-[#3D75C4] text-white text-xs font-bold transition cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                Barkodu Yazdır
              </button>
              <button
                type="button"
                onClick={handleCloseAndReset}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition cursor-pointer"
              >
                Kapat / Listeye Dön
              </button>
            </div>

            <BarcodePrintModal
              isOpen={isPrintModalOpen}
              onClose={() => setIsPrintModalOpen(false)}
              demirbasNo={createdHardware.demirbasNo}
              brand={createdHardware.brand}
              model={createdHardware.model}
            />
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 flex-1">
            {generalError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-medium">
                {generalError}
              </div>
            )}

            {/* Demirbaş Numarası */}
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
                placeholder=""
                className={`w-full px-3.5 py-2.5 rounded-xl border text-xs font-mono text-[#1E2534] ${
                  demirbasNoError ? 'border-rose-500 bg-rose-50/30' : 'border-slate-200 focus:border-[#4F8FE0]'
                }`}
              />
              {demirbasNoError && (
                <p className="text-xs font-semibold text-rose-600 mt-1">{demirbasNoError}</p>
              )}
            </div>

            {/* Kategori Dropdown */}
            <div>
              <label className="block text-xs font-bold text-[#1E2534] mb-1">
                Kategori <span className="text-rose-500">*</span>
              </label>
              {loadingCategories ? (
                <div className="text-xs text-slate-500 py-2">Kategoriler yükleniyor...</div>
              ) : categories.length === 0 ? (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800">
                  Sistemde henüz Varlık kategorisi bulunmuyor. Önce Ayarlar sayfasından bir Varlık kategorisi eklenmelidir.
                </div>
              ) : (
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-medium text-[#1E2534] focus:border-[#4F8FE0]"
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

            {/* Marka & Model */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-medium text-[#1E2534] focus:border-[#4F8FE0]"
                >
                  <option value="">Seçiniz...</option>
                  {BRAND_OPTIONS.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </select>
                {brandError && <p className="text-xs font-semibold text-rose-600 mt-1">{brandError}</p>}
              </div>

              <div>
                <label className="block text-xs font-bold text-[#1E2534] mb-1">
                  Model
                </label>
                <input
                  type="text"
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  placeholder=""
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-[#1E2534] focus:border-[#4F8FE0]"
                />
              </div>
            </div>

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
                  placeholder=""
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-[#1E2534]"
                />
              </div>
            )}

            {/* Seri No & Wifi MAC */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-[#1E2534] mb-1">
                  Seri No
                </label>
                <input
                  type="text"
                  value={serialNo}
                  onChange={(e) => setSerialNo(e.target.value)}
                  placeholder=""
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-mono text-[#1E2534]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#1E2534] mb-1">
                  Wifi MAC Adresi
                </label>
                <input
                  type="text"
                  value={wifiMacAddress}
                  onChange={(e) => setWifiMacAddress(e.target.value)}
                  placeholder=""
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-mono text-[#1E2534]"
                />
              </div>
            </div>

            {/* Lokasyon & Tedarikçi */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-[#1E2534] mb-1">
                  Lokasyon
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

            {/* Fatura No, Satın Alma Tarihi, Tutarı */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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

            {/* Fatura PDF / Ek Yükleme */}
            <FileUploadField
              label="Fatura Belgesi / PDF Ek"
              selectedFile={selectedInvoiceFile}
              onFileSelect={setSelectedInvoiceFile}
              disabled={loading}
            />

            {/* Garanti Tarihleri */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-[#1E2534] mb-1">
                  Garanti Başlangıç Tarihi
                </label>
                <input
                  type="date"
                  value={warrantyStartDate}
                  onChange={(e) => {
                    setWarrantyStartDate(e.target.value);
                    setWarrantyDateError('');
                  }}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-[#1E2534]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#1E2534] mb-1">
                  Garanti Bitiş Tarihi
                </label>
                <input
                  type="date"
                  value={warrantyEndDate}
                  min={warrantyStartDate}
                  onChange={(e) => {
                    setWarrantyEndDate(e.target.value);
                    setWarrantyDateError('');
                  }}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-[#1E2534]"
                />
              </div>
            </div>
            {warrantyDateError && (
              <p className="text-xs font-semibold text-rose-600 mt-1">{warrantyDateError}</p>
            )}

            {/* PC Özellikleri */}
            {isPcCategory && (
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                <span className="text-xs font-bold text-[#1E2534]">Bilgisayar Donanım Özellikleri</span>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">İşlemci (CPU)</label>
                    <input
                      type="text"
                      value={cpu}
                      onChange={(e) => setCpu(e.target.value)}
                      placeholder=""
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs bg-white text-[#1E2534]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">RAM (Bellek)</label>
                    <input
                      type="text"
                      value={ram}
                      onChange={(e) => setRam(e.target.value)}
                      placeholder=""
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs bg-white text-[#1E2534]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Ekran Kartı (GPU)</label>
                    <input
                      type="text"
                      value={gpu}
                      onChange={(e) => setGpu(e.target.value)}
                      placeholder=""
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs bg-white text-[#1E2534]"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="dvdCheck"
                    checked={dvd}
                    onChange={(e) => setDvd(e.target.checked)}
                    className="rounded border-slate-300 text-[#4F8FE0]"
                  />
                  <label htmlFor="dvdCheck" className="text-xs font-medium text-slate-700">
                    Optik Sürücü / DVD var
                  </label>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={handleCloseAndReset}
                className="px-4 py-2.5 text-xs font-semibold text-slate-600 hover:text-slate-800 transition cursor-pointer"
              >
                İptal
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-5 py-2.5 text-xs font-bold text-white bg-[#4F8FE0] hover:bg-[#3D75C4] rounded-xl shadow-xs disabled:opacity-50 transition cursor-pointer"
              >
                {loading ? 'Kaydedildiği...' : 'Kaydet'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
