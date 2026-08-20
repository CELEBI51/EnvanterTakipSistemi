import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  UserCheck,
  User,
  Search,
  Plus,
  Trash2,
  FileText,
  Download,
  CheckCircle2,
  ArrowLeft,
  Calendar,
  Package,
  Monitor,
  Headphones,
} from 'lucide-react';
import useAuthStore from '../../../store/authStore';
import { API_BASE_URL } from '../../../config';
import QuickAddEmployeeModal from '../components/QuickAddEmployeeModal';
import FileUploadField from '../../../components/common/FileUploadField';
import { getSearchVariants } from '../../../utils/search';

export default function CreateAssignmentPage() {
  const navigate = useNavigate();
  const token = useAuthStore((state) => state.accessToken);
  const currentUser = useAuthStore((state) => state.user);

  // Teslim Alan Employee state
  const [employeeSearch, setEmployeeSearch] = useState('');
  const [employeeResults, setEmployeeResults] = useState([]);
  const [loadingEmployees, setLoadingEmployees] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [showQuickAddModal, setShowQuickAddModal] = useState(false);

  // Date
  const [teslimTarihi, setTeslimTarihi] = useState(new Date().toISOString().slice(0, 10));

  // Product Selection & Basket
  const [activeTab, setActiveTab] = useState('hardware'); // 'hardware' | 'accessory' | 'license' | 'consumable'
  const [productSearch, setProductSearch] = useState('');
  const [productResults, setProductResults] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const productRequestId = useRef(0);

  // Quantity modal / selection state for non-hardware items
  const [selectedProductItem, setSelectedProductItem] = useState(null);
  const [itemQuantity, setItemQuantity] = useState(1);

  // Basket State
  const [basket, setBasket] = useState([]); // [{ id, type, name, category, availableQuantity, quantity, originalItem }]

  // Submission State
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [createdAssignment, setCreatedAssignment] = useState(null);

  // Optional Signed Form Upload in Success State
  const [signedFile, setSignedFile] = useState(null);
  const [uploadingSignedForm, setUploadingSignedForm] = useState(false);
  const [uploadMessage, setUploadMessage] = useState('');

  // Search Employees Effect
  useEffect(() => {
    if (!employeeSearch.trim() || selectedEmployee) {
      setEmployeeResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setLoadingEmployees(true);
      try {
        const res = await fetch(`${API_BASE_URL}/employees?isActive=true&q=${encodeURIComponent(employeeSearch.trim())}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (res.ok && data.data) {
          setEmployeeResults(data.data);
        }

      } catch (err) {
        console.error('Personel arama hatası:', err);
      } finally {
        setLoadingEmployees(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [employeeSearch, selectedEmployee, token]);

  // Search Products Effect
  useEffect(() => {
    const requestId = ++productRequestId.current;
    if (!productSearch.trim()) {
      setProductResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setLoadingProducts(true);
      try {
        let endpoint = '';
        if (activeTab === 'hardware') endpoint = `/hardware?q=${encodeURIComponent(productSearch.trim())}`;
        else if (activeTab === 'accessory') endpoint = `/accessories?q=${encodeURIComponent(productSearch.trim())}`;
        else if (activeTab === 'consumable') endpoint = `/consumables?q=${encodeURIComponent(productSearch.trim())}`;

        const variants = getSearchVariants(productSearch);
        const responses = await Promise.all(variants.map((variant) => fetch(
          `${API_BASE_URL}${endpoint.replace(encodeURIComponent(productSearch.trim()), encodeURIComponent(variant))}`,
          { headers: { Authorization: `Bearer ${token}` } },
        )));
        const resultMap = new Map();
        for (const res of responses) {
          const data = await res.json();
          if (!res.ok || !data) continue;
          const list = Array.isArray(data.data) ? data.data : (data.data?.items || data.items || []);
          list.forEach((item) => resultMap.set(item.id, item));
        }
        let list = [...resultMap.values()];
        // Filter eligible items
        if (activeTab === 'hardware') {
          list = list.filter((h) => h.status === 'Hazır' || h.status === 'Hazir');
        } else {
          list = list.filter((i) => i.availableQuantity > 0);
        }
        // The user may have typed another character while the requests were
        // in flight. Never let an older (shorter) query overwrite the latest.
        if (requestId === productRequestId.current) {
          setProductResults(list);
        }
      } catch (err) {
        if (requestId === productRequestId.current) {
          console.error('Ürün arama hatası:', err);
        }
      } finally {
        if (requestId === productRequestId.current) {
          setLoadingProducts(false);
        }
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [productSearch, activeTab, token]);

  // Handle adding product to basket
  const handleSelectProduct = (item) => {
    // Immediately close search results dropdown
    setProductSearch('');
    setProductResults([]);

    if (activeTab === 'hardware') {
      // Check if already in basket
      if (basket.some((b) => b.type === 'hardware' && b.id === item.id)) {
        alert('Bu varlık zaten sepete eklenmiş.');
        return;
      }
      setBasket((prev) => [
        ...prev,
        {
          id: item.id,
          type: 'hardware',
          name: `${item.brand} ${item.model || ''} (${item.demirbasNo})`,
          category: item.category?.name || item.category || 'Varlık',
          quantity: 1,
          originalItem: item,
        },
      ]);
    } else {
      // Open quantity selector
      setSelectedProductItem(item);
      setItemQuantity(1);
    }
  };

  const handleConfirmQuantityAdd = () => {
    if (!selectedProductItem) return;

    const maxAvail = selectedProductItem.availableQuantity || 1;
    if (itemQuantity < 1 || itemQuantity > maxAvail) {
      alert(`Miktar 1 ile ${maxAvail} arasında olmalıdır.`);
      return;
    }

    // Check if item already exists in basket
    const existingIndex = basket.findIndex((b) => b.type === activeTab && b.id === selectedProductItem.id);

    if (existingIndex >= 0) {
      const currentQty = basket[existingIndex].quantity;
      const newQty = currentQty + itemQuantity;
      if (newQty > maxAvail) {
        alert(`Sepetteki toplam miktar mevcut stoğu (${maxAvail}) aşamaz.`);
        return;
      }
      const updated = [...basket];
      updated[existingIndex].quantity = newQty;
      setBasket(updated);
    } else {
      let typeLabelName = selectedProductItem.name;

      setBasket((prev) => [
        ...prev,
        {
          id: selectedProductItem.id,
          type: activeTab,
          name: typeLabelName,
          category: selectedProductItem.category?.name || (activeTab === 'accessory' ? 'Aksesuar' : 'Sarf Malzeme'),
          availableQuantity: maxAvail,
          quantity: itemQuantity,
          originalItem: selectedProductItem,
        },
      ]);
    }

    setSelectedProductItem(null);
    setItemQuantity(1);
    setProductSearch('');
    setProductResults([]);
  };

  const handleRemoveFromBasket = (index) => {
    setBasket((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmitAssignment = async () => {
    if (!selectedEmployee) {
      setSubmitError('Lütfen bir teslim alan personel seçiniz.');
      return;
    }

    if (basket.length === 0) {
      setSubmitError('Lütfen zimmetlenecek en az bir ürün ekleyiniz.');
      return;
    }

    setSubmitting(true);
    setSubmitError('');

    try {
      const hardwareItems = basket.filter((b) => b.type === 'hardware').map((b) => ({ hardwareId: b.id }));
      const accessoryItems = basket.filter((b) => b.type === 'accessory').map((b) => ({ accessoryId: b.id, quantity: b.quantity }));
      const consumableItems = basket.filter((b) => b.type === 'consumable').map((b) => ({ consumableId: b.id, quantity: b.quantity }));

      const bodyPayload = {
        employeeId: selectedEmployee.id,
        teslimTarihi,
        hardwareItems,
        accessoryItems,
        consumableItems,
      };

      const res = await fetch(`${API_BASE_URL}/assignments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(bodyPayload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Zimmet kaydı oluşturulurken hata oluştu.');
      }

      setCreatedAssignment(data.data);
    } catch (err) {
      setSubmitError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleUploadSignedForm = async () => {
    if (!signedFile || !createdAssignment) return;

    setUploadingSignedForm(true);
    setUploadMessage('');

    try {
      const formData = new FormData();
      formData.append('file', signedFile);

      const res = await fetch(`${API_BASE_URL}/assignments/${createdAssignment.id}/signed-form`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Yükleme başarısız.');

      setUploadMessage('İmzalı belge başarıyla yüklendi!');
    } catch (err) {
      alert(err.message);
    } finally {
      setUploadingSignedForm(false);
    }
  };

  const getTypeBadge = (type) => {
    switch (type) {
      case 'hardware':
        return <span className="px-2 py-0.5 rounded-md bg-blue-100 text-blue-800 text-[10px] font-bold">Varlık</span>;
      case 'accessory':
        return <span className="px-2 py-0.5 rounded-md bg-purple-100 text-purple-800 text-[10px] font-bold">Aksesuar</span>;
      case 'consumable':
        return <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[10px] font-bold">Sarf Malzeme</span>;
      default:
        return null;
    }
  };

  // SUCCESS SCREEN (BÖLÜM C)
  if (createdAssignment) {
    return (
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="p-6 bg-white border border-slate-200 rounded-2xl shadow-xs text-center space-y-6">
          <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-10 h-10" />
          </div>

          <div>
            <h2 className="text-xl font-bold text-[#1E2534]">Zimmetleme Başarıyla Oluşturuldu!</h2>
            <p className="text-xs text-slate-500 mt-1">
              Form otomatik olarak üretildi. Dilerseniz PDF'i indirebilir veya hemen imzalı belgeyi yükleyebilirsiniz.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
            <button
              onClick={() => window.open(`${API_BASE_URL}/assignments/${createdAssignment.id}/pdf?token=${token}`, '_blank')}
              className="px-5 py-2.5 rounded-xl bg-[#1E2534] text-white text-xs font-bold hover:bg-slate-800 transition cursor-pointer flex items-center gap-2"
            >
              <Download className="w-4 h-4" /> PDF'i İndir
            </button>

            <button
              onClick={() => navigate('/assignments')}
              className="px-5 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-100 transition cursor-pointer"
            >
              Zimmet Listesine Dön
            </button>
          </div>

          {/* Opsiyonel İmzalı Form Yükleme */}
          <div className="p-5 bg-slate-50 border border-slate-200 rounded-xl text-left space-y-3 mt-6">
            <span className="text-xs font-bold text-[#1E2534] uppercase tracking-wider block">
              Opsiyonel: İmzalı Form Yükle
            </span>

            {uploadMessage ? (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold rounded-xl">
                {uploadMessage}
              </div>
            ) : (
              <div className="space-y-3">
                <FileUploadField
                  label="Taranmış veya Fotoğraflanmış İmzalı Zimmet Formu (PDF, JPG, PNG)"
                  selectedFile={signedFile}
                  onFileSelect={setSignedFile}
                />
                {signedFile && (
                  <button
                    onClick={handleUploadSignedForm}
                    disabled={uploadingSignedForm}
                    className="px-4 py-2 bg-[#4F8FE0] text-white text-xs font-bold rounded-xl hover:bg-blue-600 transition disabled:opacity-50 cursor-pointer"
                  >
                    {uploadingSignedForm ? 'Yükleniyor...' : 'İmzalı Belgeyi Kaydet'}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/assignments')}
            className="p-2 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-lg font-bold text-[#1E2534]">Yeni Zimmetleme Oluştur</h1>
            <p className="text-xs text-slate-500">Personele zimmetlenecek varlık, aksesuar ve lisansları seçiniz.</p>
          </div>
        </div>
      </div>

      {submitError && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold rounded-xl">
          {submitError}
        </div>
      )}

      {/* BÖLÜM B.1: ÜST BÖLÜM - İKİ AYRI KART (TESLİM EDEN & TESLİM ALAN) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* KART A: TESLİM EDEN (SALT OKUNUR - SİSTEM KULLANICISI) */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center gap-2 text-[#4F8FE0]">
            <UserCheck className="w-4 h-4" />
            <span className="text-xs font-bold uppercase tracking-wider">TESLİM EDEN (SİSTEM KULLANICISI)</span>
          </div>

          <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
            <p className="text-sm font-bold text-[#1E2534]">{currentUser?.fullName}</p>
            <p className="text-xs text-slate-500">{currentUser?.email}</p>
            <span className="inline-block mt-1 px-2 py-0.5 rounded-md bg-[#1E2534] text-white text-[10px] font-bold uppercase">
              {currentUser?.role}
            </span>
          </div>
          <p className="text-[11px] text-slate-400 italic">
            * Backend tarafından otomatik olarak sisteme giriş yapmış hesabınız kaydedilir.
          </p>
        </div>

        {/* KART B: TESLİM ALAN (ARAMA + KART SEÇİMİ + HIZLI EKLEME) */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3 relative">
          <div className="flex items-center gap-2 text-[#4F8FE0]">
            <User className="w-4 h-4" />
            <span className="text-xs font-bold uppercase tracking-wider">TESLİM ALAN (PERSONEL)</span>
          </div>

          {!selectedEmployee ? (
            <div className="space-y-3 relative">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={employeeSearch}
                  onChange={(e) => setEmployeeSearch(e.target.value)}
                  placeholder="İsim veya Sicil No ile personel ara..."
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-medium text-[#1E2534] focus:border-[#4F8FE0] focus:bg-white transition"
                />
              </div>

              {/* Dropdown Results */}
              {loadingEmployees && (
                <div className="p-3 text-xs text-slate-400 italic bg-slate-50 rounded-xl">Aranıyor...</div>
              )}

              {employeeResults.length > 0 && (
                <div className="absolute left-0 right-0 top-12 z-30 bg-white border border-slate-200 rounded-xl shadow-lg max-h-48 overflow-y-auto divide-y divide-slate-100">
                  {employeeResults.map((emp) => (
                    <button
                      key={emp.id}
                      type="button"
                      onClick={() => {
                        setSelectedEmployee(emp);
                        setEmployeeSearch('');
                        setEmployeeResults([]);
                      }}
                      className="w-full text-left p-3 hover:bg-[#EAF2FC]/50 transition flex items-center justify-between cursor-pointer"
                    >
                      <div>
                        <p className="text-xs font-bold text-[#1E2534]">{emp.fullName}</p>
                        <p className="text-[11px] text-slate-500 font-mono">Sicil No: {emp.tcNo} • {emp.unit?.name || '-'}</p>
                      </div>
                      <Plus className="w-4 h-4 text-[#4F8FE0]" />
                    </button>
                  ))}
                </div>
              )}

              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => setShowQuickAddModal(true)}
                  className="text-xs font-bold text-[#4F8FE0] hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" /> Listede yok mu? Hızlıca yeni çalışan ekle
                </button>
              </div>
            </div>
          ) : (
            <div className="p-4 bg-[#EAF2FC]/40 rounded-xl border border-[#4F8FE0]/30 space-y-2 relative">
              <div className="flex items-center justify-between">
                <p className="text-sm font-bold text-[#1E2534]">{selectedEmployee.fullName}</p>
                <button
                  type="button"
                  onClick={() => setSelectedEmployee(null)}
                  className="text-xs font-bold text-[#4F8FE0] hover:underline cursor-pointer"
                >
                  Değiştir
                </button>
              </div>
              <div className="text-xs text-slate-600 space-y-0.5 font-medium">
                <p className="font-mono">Sicil No: {selectedEmployee.tcNo}</p>
                <p>Birim: {selectedEmployee.unit?.name || '-'}</p>
                {selectedEmployee.phone && <p>Tel: {selectedEmployee.phone}</p>}
                {selectedEmployee.email && <p>E-posta: {selectedEmployee.email}</p>}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* BÖLÜM B.2: TARİH SEÇİMİ */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-4">
        <Calendar className="w-5 h-5 text-[#4F8FE0]" />
        <div className="flex-1 max-w-xs">
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
            Teslim Tarihi
          </label>
          <input
            type="date"
            value={teslimTarihi}
            onChange={(e) => setTeslimTarihi(e.target.value)}
            className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs font-medium text-[#1E2534] focus:border-[#4F8FE0] focus:bg-white transition"
          />
        </div>
      </div>

      {/* BÖLÜM B.3: ALT BÖLÜM - ÜRÜN EKLE VE SEPET */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-6">
        <h2 className="text-xs font-bold text-[#1E2534] uppercase tracking-wider border-b border-slate-100 pb-3">
          Ürün Ekle ve Sepet Oluştur
        </h2>

        {/* Tip Seçim Tabları (Bileşen YOKTUR) */}
        <div className="flex items-center gap-2 border-b border-slate-200 pb-3 overflow-x-auto">
          <button
            type="button"
            onClick={() => {
              setActiveTab('hardware');
              setProductSearch('');
              setProductResults([]);
            }}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-2 ${
              activeTab === 'hardware'
                ? 'bg-[#1E2534] text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Monitor className="w-4 h-4" /> Varlık (Hardware)
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('accessory');
              setProductSearch('');
              setProductResults([]);
            }}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-2 ${
              activeTab === 'accessory'
                ? 'bg-[#1E2534] text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Headphones className="w-4 h-4" /> Aksesuar
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('consumable');
              setProductSearch('');
              setProductResults([]);
            }}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-2 ${
              activeTab === 'consumable'
                ? 'bg-[#1E2534] text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Package className="w-4 h-4" /> Sarf Malzeme
          </button>
        </div>

        {/* Ürün Arama Kutusu */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={productSearch}
            onChange={(e) => setProductSearch(e.target.value)}
            placeholder={
              activeTab === 'hardware'
                ? 'Kategori, demirbaş no, marka veya model ile varlık ara...'
                : `${activeTab === 'accessory' ? 'Kategori, aksesuar adı veya marka' : 'Kategori, sarf malzeme adı veya üretici'} ile ara...`
            }
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-medium text-[#1E2534] focus:border-[#4F8FE0] focus:bg-white transition"
          />

          {loadingProducts && (
            <div className="p-2 text-xs text-slate-400 italic bg-slate-50 rounded-xl mt-1">Ürünler aranıyor...</div>
          )}

          {productResults.length > 0 && (
            <div className="absolute left-0 right-0 top-12 z-30 bg-white border border-slate-200 rounded-xl shadow-lg max-h-56 overflow-y-auto divide-y divide-slate-100">
              {productResults.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleSelectProduct(item)}
                  className="w-full text-left p-3 hover:bg-[#EAF2FC]/50 transition flex items-center justify-between cursor-pointer"
                >
                  <div>
                    <p className="text-xs font-bold text-[#1E2534]">
                      {activeTab === 'hardware' ? `${item.brand} ${item.model || ''} (${item.demirbasNo})` : item.name}
                    </p>
                    <p className="text-[11px] text-slate-500 font-mono">
                      {activeTab === 'hardware' ? `Seri: ${item.serialNo || '-'}` : `Mevcut Stok: ${item.availableQuantity} adet`}
                    </p>
                  </div>
                  <Plus className="w-4 h-4 text-[#4F8FE0]" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Miktar Seçim Modal / Input alanı (Aksesuar, Lisans, Sarf Malzeme için) */}
        {selectedProductItem && (
          <div className="p-4 bg-purple-50/50 border border-purple-200 rounded-xl space-y-3 animate-in fade-in duration-150">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-purple-900">
                "{selectedProductItem.name}" için Verilecek Miktarı Belirleyin:
              </span>
              <span className="text-xs text-purple-700 font-bold">
                Mevcut Stok: {selectedProductItem.availableQuantity} adet
              </span>
            </div>

            <div className="flex items-center gap-3">
              <input
                type="number"
                min={1}
                max={selectedProductItem.availableQuantity}
                value={itemQuantity}
                onChange={(e) => setItemQuantity(parseInt(e.target.value, 10) || 1)}
                className="w-28 px-3 py-2 rounded-xl border border-purple-300 bg-white text-xs font-bold text-slate-800"
              />
              <button
                type="button"
                onClick={handleConfirmQuantityAdd}
                className="px-4 py-2 bg-purple-700 text-white text-xs font-bold rounded-xl hover:bg-purple-800 transition cursor-pointer"
              >
                Sepete Ekle
              </button>
              <button
                type="button"
                onClick={() => setSelectedProductItem(null)}
                className="px-3 py-2 bg-slate-200 text-slate-700 text-xs font-bold rounded-xl hover:bg-slate-300 transition cursor-pointer"
              >
                İptal
              </button>
            </div>
          </div>
        )}

        {/* SEPET LİSTESİ */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-[#1E2534] uppercase tracking-wider">
              Zimmet Sepeti ({basket.length} Kalem)
            </h3>
            {basket.length > 0 && (
              <button
                type="button"
                onClick={() => setBasket([])}
                className="text-[11px] font-bold text-rose-600 hover:underline cursor-pointer"
              >
                Sepeti Temizle
              </button>
            )}
          </div>

          {basket.length === 0 ? (
            <div className="p-8 text-center border border-dashed border-slate-200 rounded-2xl text-xs text-slate-400">
              Henüz sepete ürün eklenmedi. Yukarıdaki arama kutusundan varlık, aksesuar veya lisans arayıp ekleyiniz.
            </div>
          ) : (
            <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100">
              {basket.map((item, index) => (
                <div key={index} className="p-3.5 flex items-center justify-between bg-slate-50/50 hover:bg-slate-50 transition">
                  <div className="flex items-center gap-3">
                    {getTypeBadge(item.type)}
                    <div>
                      <p className="text-xs font-bold text-[#1E2534]">{item.name}</p>
                      <p className="text-[11px] text-slate-500 font-mono">
                        {item.type === 'hardware' ? 'Tekil Donanım' : `Verilecek Miktar: ${item.quantity} adet`}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleRemoveFromBasket(index)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* BÖLÜM B.4: GÖNDERME BUTONU */}
        <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-4">
          <button
            type="button"
            onClick={() => navigate('/assignments')}
            className="px-5 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-100 transition cursor-pointer"
          >
            İptal
          </button>
          <button
            type="button"
            onClick={handleSubmitAssignment}
            disabled={!selectedEmployee || basket.length === 0 || submitting}
            className="px-6 py-2.5 rounded-xl bg-[#1E2534] text-white text-xs font-bold hover:bg-slate-800 transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow-xs"
          >
            {submitting ? 'Zimmetleniyor...' : 'Zimmetle ve PDF Oluştur'}
          </button>
        </div>
      </div>

      {/* Quick Add Employee Modal */}
      <QuickAddEmployeeModal
        isOpen={showQuickAddModal}
        onClose={() => setShowQuickAddModal(false)}
        onSuccess={(newEmp) => {
          setSelectedEmployee(newEmp);
        }}
      />
    </div>
  );
}
