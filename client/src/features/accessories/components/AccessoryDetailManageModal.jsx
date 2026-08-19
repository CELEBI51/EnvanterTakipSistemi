import React, { useEffect, useState } from 'react';
import {
  X,
  PlusCircle,
  AlertTriangle,
  History,
  Package,
  CheckCircle,
  User,
  Calendar,
  RotateCcw,
  PackageCheck,
  Building,
} from 'lucide-react';
import useAuthStore from '../../../store/authStore';
import { getStockMovementInfo } from '../../../utils/stockMovementLabels';

export default function AccessoryDetailManageModal({
  isOpen,
  onClose,
  accessory,
  initialTab = 'restock',
  onSuccess,
}) {
  const token = useAuthStore((state) => state.accessToken);
  const user = useAuthStore((state) => state.user);

  const [activeTab, setActiveTab] = useState(initialTab);

  // Current accessory details state (updated after actions)
  const [currentAccessory, setCurrentAccessory] = useState(accessory);

  // Restock form state
  const [restockQty, setRestockQty] = useState(5);
  const [restockNote, setRestockNote] = useState('');
  const [restockLoading, setRestockLoading] = useState(false);
  const [restockError, setRestockError] = useState('');
  const [restockSuccess, setRestockSuccess] = useState('');

  // Defective form state
  const [defectiveQty, setDefectiveQty] = useState(1);
  const [defectiveReason, setDefectiveReason] = useState('');
  const [defectiveLoading, setDefectiveLoading] = useState(false);
  const [defectiveError, setDefectiveError] = useState('');
  const [defectiveSuccess, setDefectiveSuccess] = useState('');

  // History state
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState('');

  const canEdit = user?.role === 'admin' || user?.role === 'it_staff';

  useEffect(() => {
    if (isOpen && accessory) {
      setCurrentAccessory(accessory);
      setActiveTab(initialTab);
      setRestockQty(5);
      setRestockNote('');
      setRestockError('');
      setRestockSuccess('');
      setDefectiveQty(1);
      setDefectiveReason('');
      setDefectiveError('');
      setDefectiveSuccess('');
      fetchLatestAccessory();
      fetchHistory();
    }
  }, [isOpen, accessory, initialTab]);

  const fetchLatestAccessory = async () => {
    if (!accessory?.id || !token) return;
    try {
      const res = await fetch(`http://localhost:4001/api/accessories/${accessory.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok && data.data) {
        setCurrentAccessory(data.data);
      }
    } catch (err) {
      console.error('Aksesuar bilgisi güncellenemedi:', err);
    }
  };

  const fetchHistory = async () => {
    if (!accessory?.id || !token) return;
    setHistoryLoading(true);
    setHistoryError('');
    try {
      const res = await fetch(`http://localhost:4001/api/accessories/${accessory.id}/history`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Stok geçmişi alınamadı.');
      setHistory(data.data || []);
    } catch (err) {
      setHistoryError(err.message);
    } finally {
      setHistoryLoading(false);
    }
  };

  if (!isOpen || !accessory) return null;

  const handleRestockSubmit = async (e) => {
    e.preventDefault();
    setRestockError('');
    setRestockSuccess('');

    const qtyNum = parseInt(restockQty, 10);
    if (isNaN(qtyNum) || qtyNum < 1) {
      setRestockError('Eklenecek stok miktarı 1 veya daha büyük olmalıdır.');
      return;
    }

    setRestockLoading(true);
    try {
      const res = await fetch(`http://localhost:4001/api/accessories/${accessory.id}/restock`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          quantity: qtyNum,
          note: restockNote.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Stok eklenirken bir hata oluştu.');

      setRestockSuccess(`${qtyNum} adet stok başarıyla eklendi.`);
      setRestockNote('');
      fetchLatestAccessory();
      fetchHistory();
      if (onSuccess) onSuccess();
    } catch (err) {
      setRestockError(err.message);
    } finally {
      setRestockLoading(false);
    }
  };

  const handleDefectiveSubmit = async (e) => {
    e.preventDefault();
    setDefectiveError('');
    setDefectiveSuccess('');

    const qtyNum = parseInt(defectiveQty, 10);
    if (isNaN(qtyNum) || qtyNum < 1) {
      setDefectiveError('Miktar 1 veya daha büyük olmalıdır.');
      return;
    }

    if (qtyNum > (currentAccessory?.availableQuantity || 0)) {
      setDefectiveError(
        `Arızalıya ayrılacak miktar (${qtyNum}), mevcut kullanılabilir stoktan (${currentAccessory?.availableQuantity || 0}) fazla olamaz.`
      );
      return;
    }

    setDefectiveLoading(true);
    try {
      const res = await fetch(`http://localhost:4001/api/accessories/${accessory.id}/mark-defective`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          quantity: qtyNum,
          reason: defectiveReason.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Arızalıya ayırırken bir hata oluştu.');

      setDefectiveSuccess(`${qtyNum} adet aksesuar arızalı/kullanım dışı olarak ayrıldı.`);
      setDefectiveReason('');
      fetchLatestAccessory();
      fetchHistory();
      if (onSuccess) onSuccess();
    } catch (err) {
      setDefectiveError(err.message);
    } finally {
      setDefectiveLoading(false);
    }
  };

  const item = currentAccessory || accessory;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="p-6 bg-[#1E2534] text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#4F8FE0]/20 text-[#4F8FE0] flex items-center justify-center font-bold">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-heading text-lg font-bold tracking-tight text-white leading-tight">
                {item.name}
              </h2>
              <p className="text-xs text-slate-300">
                {item.brand ? `${item.brand} • ` : ''}
                {item.category?.name || 'Aksesuar Yönetim Paneli'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-700/60 rounded-xl transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Accessory Stats Quick Summary Bar */}
        <div className="grid grid-cols-4 gap-2 p-4 bg-[#F5F4EF] border-b border-slate-200 shrink-0 text-center">
          <div className="p-2.5 rounded-xl bg-white border border-slate-200 shadow-2xs">
            <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Kullanılabilir
            </span>
            <span className="text-base font-extrabold text-emerald-600 font-mono">
              {item.availableQuantity ?? 0}
            </span>
          </div>
          <div className="p-2.5 rounded-xl bg-white border border-slate-200 shadow-2xs">
            <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Zimmetli
            </span>
            <span className="text-base font-extrabold text-[#4F8FE0] font-mono">
              {item.assignedQuantity ?? 0}
            </span>
          </div>
          <div className="p-2.5 rounded-xl bg-white border border-slate-200 shadow-2xs">
            <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Kullanım Dışı
            </span>
            <span className="text-base font-extrabold text-rose-600 font-mono">
              {item.outOfUseQuantity ?? 0}
            </span>
          </div>
          <div className="p-2.5 rounded-xl bg-white border border-slate-200 shadow-2xs">
            <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Toplam Stok
            </span>
            <span className="text-base font-extrabold text-[#1E2534] font-mono">
              {item.totalQuantity ?? 0}
            </span>
          </div>
        </div>

        {/* Tab Header Buttons */}
        <div className="flex border-b border-slate-200 bg-white px-4 shrink-0 gap-2 pt-2">
          {canEdit && (
            <>
              <button
                onClick={() => setActiveTab('restock')}
                className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition cursor-pointer ${
                  activeTab === 'restock'
                    ? 'border-[#4F8FE0] text-[#4F8FE0] bg-blue-50/50 rounded-t-xl'
                    : 'border-transparent text-slate-500 hover:text-[#1E2534]'
                }`}
              >
                <PlusCircle className="w-4 h-4" />
                Stok Ekle
              </button>

              <button
                onClick={() => setActiveTab('defective')}
                className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition cursor-pointer ${
                  activeTab === 'defective'
                    ? 'border-rose-600 text-rose-600 bg-rose-50/50 rounded-t-xl'
                    : 'border-transparent text-slate-500 hover:text-[#1E2534]'
                }`}
              >
                <AlertTriangle className="w-4 h-4" />
                Arızalıya Ayır
              </button>
            </>
          )}

          <button
            onClick={() => setActiveTab('history')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition cursor-pointer ${
              activeTab === 'history'
                ? 'border-[#1E2534] text-[#1E2534] bg-slate-100/60 rounded-t-xl'
                : 'border-transparent text-slate-500 hover:text-[#1E2534]'
            }`}
          >
            <History className="w-4 h-4" />
            Stok Geçmişi ({history.length})
          </button>
        </div>

        {/* Tab Content Body */}
        <div className="p-6 overflow-y-auto flex-1">
          {/* TAB 1: STOK EKLE */}
          {activeTab === 'restock' && canEdit && (
            <form onSubmit={handleRestockSubmit} className="space-y-4 max-w-lg mx-auto">
              <div className="bg-emerald-50/60 border border-emerald-200 rounded-2xl p-4 text-xs text-emerald-800 space-y-1">
                <p className="font-bold flex items-center gap-1.5 text-emerald-900">
                  <PlusCircle className="w-4 h-4 text-emerald-600" />
                  Mevcut Stok: {item.availableQuantity ?? 0} Adet
                </p>
                <p>Eklediğiniz stok miktarı doğrudan kullanılabilir stoğa eklenecektir.</p>
              </div>

              {restockError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-medium">
                  {restockError}
                </div>
              )}

              {restockSuccess && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-700 font-semibold flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                  {restockSuccess}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Eklenecek Adet *
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  value={restockQty}
                  onChange={(e) => setRestockQty(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-hidden focus:border-[#4F8FE0] font-semibold text-[#1E2534]"
                  placeholder="Örn: 5"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Açıklama / İrsaliye Notu (İsteğe Bağlı)
                </label>
                <textarea
                  rows="3"
                  value={restockNote}
                  onChange={(e) => setRestockNote(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-hidden focus:border-[#4F8FE0]"
                  placeholder="Örn: Yeni fatura temini ile 5 adet sipariş geldi."
                />
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  disabled={restockLoading}
                  className="px-5 py-2.5 bg-[#4F8FE0] hover:bg-blue-600 text-white font-bold text-xs rounded-xl shadow-md hover:shadow-lg transition cursor-pointer disabled:opacity-50"
                >
                  {restockLoading ? 'Ekleniyor...' : 'Stok Ekle'}
                </button>
              </div>
            </form>
          )}

          {/* TAB 2: ARIZALIYA AYIR */}
          {activeTab === 'defective' && canEdit && (
            <form onSubmit={handleDefectiveSubmit} className="space-y-4 max-w-lg mx-auto">
              <div className="bg-rose-50/60 border border-rose-200 rounded-2xl p-4 text-xs text-rose-800 space-y-1">
                <p className="font-bold flex items-center gap-1.5 text-rose-900">
                  <AlertTriangle className="w-4 h-4 text-rose-600" />
                  Kullanılabilir Stok: {item.availableQuantity ?? 0} Adet
                </p>
                <p>
                  Belirttiğiniz miktar kullanılabilir stoktan düşülecek ve "Kullanım Dışı / Arızalı"
                  stoğa aktarılacaktır.
                </p>
              </div>

              {defectiveError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-medium">
                  {defectiveError}
                </div>
              )}

              {defectiveSuccess && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-700 font-semibold flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                  {defectiveSuccess}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Arızalıya Ayrılacak Miktar *
                </label>
                <input
                  type="number"
                  min="1"
                  max={item.availableQuantity || 1}
                  required
                  value={defectiveQty}
                  onChange={(e) => setDefectiveQty(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-hidden focus:border-rose-500 font-semibold text-[#1E2534]"
                  placeholder="Örn: 1"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Arıza Sebebi / Not (İsteğe Bağlı)
                </label>
                <textarea
                  rows="3"
                  value={defectiveReason}
                  onChange={(e) => setDefectiveReason(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-hidden focus:border-rose-500"
                  placeholder="Örn: Kablosu temassızlık yapıyor, hurdaya ayrıldı."
                />
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  disabled={defectiveLoading || (item.availableQuantity || 0) < 1}
                  className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-md hover:shadow-lg transition cursor-pointer disabled:opacity-50"
                >
                  {defectiveLoading ? 'Kaydediliyor...' : 'Arızalıya Ayır'}
                </button>
              </div>
            </form>
          )}

          {/* TAB 3: STOK GEÇMİŞİ */}
          {activeTab === 'history' && (
            <div className="space-y-4">
              {historyLoading ? (
                <div className="py-12 text-center text-slate-400 text-xs font-medium">
                  Stok geçmişi yükleniyor...
                </div>
              ) : historyError ? (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-medium">
                  {historyError}
                </div>
              ) : history.length === 0 ? (
                <div className="py-12 text-center text-slate-400 italic text-xs">
                  Bu aksesuar için henüz herhangi bir stok hareketi bulunmuyor.
                </div>
              ) : (
                <div className="relative border-l-2 border-slate-200 ml-3 space-y-6">
                  {history.map((m) => {
                    const info = getStockMovementInfo(m.type);
                    const formattedDate = new Date(m.createdAt).toLocaleString('tr-TR', {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                    });

                    return (
                      <div key={m.id} className="relative pl-6 group">
                        {/* Dot */}
                        <div className="absolute -left-[9px] top-0.5 w-4 h-4 rounded-full bg-white border-2 border-[#1E2534] group-hover:scale-110 transition shrink-0" />

                        <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 hover:bg-white hover:border-slate-300 hover:shadow-sm transition space-y-2">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className={`px-2.5 py-1 rounded-lg text-[11px] font-bold ${info.bgColor} ${info.textColor}`}>
                              {info.label}
                            </span>
                            <span className="text-[11px] text-slate-400 font-medium flex items-center gap-1">
                              <Calendar className="w-3.5 h-3.5" />
                              {formattedDate}
                            </span>
                          </div>

                          <div className="flex items-center justify-between pt-1">
                            <span className="text-xs font-bold text-[#1E2534]">
                              Miktar: {m.quantity} Adet
                            </span>
                            {m.createdByUser && (
                              <span className="text-[11px] text-slate-500 font-medium flex items-center gap-1">
                                <User className="w-3.5 h-3.5" />
                                {m.createdByUser.fullName}
                              </span>
                            )}
                          </div>

                          {m.employee && (
                            <div className="text-xs text-slate-600 bg-white p-2 rounded-xl border border-slate-100 flex items-center gap-1.5">
                              <User className="w-3.5 h-3.5 text-[#4F8FE0]" />
                              <span>Zimmetlenen Personel: <strong>{m.employee.fullName}</strong></span>
                            </div>
                          )}

                          {m.note && (
                            <p className="text-xs text-slate-500 italic bg-white/60 p-2 rounded-xl border border-slate-100">
                              "{m.note}"
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
