import React, { useEffect, useState } from 'react';
import {
  X,
  PlusCircle,
  History,
  Package,
  CheckCircle,
  User,
  Calendar,
  Send,
} from 'lucide-react';
import useAuthStore from '../../../store/authStore';
import AttachmentList from '../../../components/common/AttachmentList';
import { getStockMovementInfo } from '../../../utils/stockMovementLabels';

export default function ConsumableDetailManageModal({
  isOpen,
  onClose,
  consumable,
  initialTab = 'history',
  onSuccess,
}) {
  const token = useAuthStore((state) => state.accessToken);
  const user = useAuthStore((state) => state.user);

  const [activeTab, setActiveTab] = useState(initialTab);

  // Current consumable details state (updated after actions)
  const [currentConsumable, setCurrentConsumable] = useState(consumable);

  // Restock form state
  const [restockQty, setRestockQty] = useState(10);
  const [restockNote, setRestockNote] = useState('');
  const [restockLoading, setRestockLoading] = useState(false);
  const [restockError, setRestockError] = useState('');
  const [restockSuccess, setRestockSuccess] = useState('');

  // Direct Issue (Doğrudan Düşüm) form state
  const [issueQty, setIssueQty] = useState(1);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [selectedUnitId, setSelectedUnitId] = useState('');
  const [issueNote, setIssueNote] = useState('');
  const [issueLoading, setIssueLoading] = useState(false);
  const [issueError, setIssueError] = useState('');
  const [issueSuccess, setIssueSuccess] = useState('');

  // Units and Employees list for dropdowns
  const [units, setUnits] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loadingUnits, setLoadingUnits] = useState(false);

  // History state
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState('');

  const canEdit = user?.role === 'admin' || user?.role === 'it_staff';

  useEffect(() => {
    if (isOpen && consumable) {
      setCurrentConsumable(consumable);
      setActiveTab(initialTab);
      setRestockQty(10);
      setRestockNote('');
      setRestockError('');
      setRestockSuccess('');
      setIssueQty(1);
      setSelectedEmployeeId('');
      setSelectedUnitId('');
      setIssueNote('');
      setIssueError('');
      setIssueSuccess('');
      fetchLatestConsumable();
      fetchHistory();
      fetchUnits();
      fetchEmployees();
    }
  }, [isOpen, consumable, initialTab]);

  const fetchLatestConsumable = async () => {
    if (!consumable?.id || !token) return;
    try {
      const res = await fetch(`http://localhost:4001/api/consumables/${consumable.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok && data.data) {
        setCurrentConsumable(data.data);
      }
    } catch (err) {
      console.error('Sarf malzeme bilgisi güncellenemedi:', err);
    }
  };

  const fetchUnits = async () => {
    if (!token) return;
    setLoadingUnits(true);
    try {
      const res = await fetch('http://localhost:4001/api/units', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok && data.data) {
        setUnits(data.data || []);
      }
    } catch (err) {
      console.error('Birimler yüklenemedi:', err);
    } finally {
      setLoadingUnits(false);
    }
  };

  const fetchEmployees = async () => {
    if (!token) return;
    try {
      const res = await fetch('http://localhost:4001/api/employees?isActive=true&pageSize=100', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok && data.data) {
        setEmployees(data.data || []);
      }
    } catch (err) {
      console.error('Personeller yüklenemedi:', err);
    }
  };

  const fetchHistory = async () => {
    if (!consumable?.id || !token) return;
    setHistoryLoading(true);
    setHistoryError('');
    try {
      const res = await fetch(`http://localhost:4001/api/consumables/${consumable.id}/history`, {
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

  if (!isOpen || !consumable) return null;

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
      const res = await fetch(`http://localhost:4001/api/consumables/${consumable.id}/restock`, {
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
      fetchLatestConsumable();
      fetchHistory();
      if (onSuccess) onSuccess();
    } catch (err) {
      setRestockError(err.message);
    } finally {
      setRestockLoading(false);
    }
  };

  const handleIssueSubmit = async (e) => {
    e.preventDefault();
    setIssueError('');
    setIssueSuccess('');

    const qtyNum = parseInt(issueQty, 10);
    if (isNaN(qtyNum) || qtyNum < 1) {
      setIssueError('Düşülecek miktar 1 veya daha büyük olmalıdır.');
      return;
    }

    const available = currentConsumable?.availableQuantity ?? 0;
    if (qtyNum > available) {
      setIssueError(
        `Düşülecek miktar (${qtyNum}), mevcut hazır stoktan (${available}) fazla olamaz.`
      );
      return;
    }

    if (!selectedUnitId) {
      setIssueError('Lütfen birim seçiniz.');
      return;
    }

    const selectedUnitObj = units.find((u) => u.id === selectedUnitId);
    const unitNameText = selectedUnitObj ? selectedUnitObj.name : '';

    let combinedNote = issueNote.trim();
    if (unitNameText) {
      combinedNote = combinedNote
        ? `[Birim: ${unitNameText}] ${combinedNote}`
        : `[Birim: ${unitNameText}] Doğrudan birime düşüm yapıldı`;
    }

    setIssueLoading(true);
    try {
      const res = await fetch(`http://localhost:4001/api/consumables/${consumable.id}/issue`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          quantity: qtyNum,
          employeeId: selectedEmployeeId || undefined,
          note: combinedNote || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Düşüm yapılırken bir hata oluştu.');

      setIssueSuccess(`${qtyNum} adet sarf malzeme başarıyla düşüldü.`);
      setIssueNote('');
      setSelectedEmployeeId('');
      setSelectedUnitId('');
      fetchLatestConsumable();
      fetchHistory();
      if (onSuccess) onSuccess();
    } catch (err) {
      setIssueError(err.message);
    } finally {
      setIssueLoading(false);
    }
  };

  const item = currentConsumable || consumable;

  const filteredEmployees = selectedUnitId
    ? employees.filter((emp) => emp.unitId === selectedUnitId || emp.unit?.id === selectedUnitId)
    : [];

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
                {item.manufacturer ? `${item.manufacturer} • ` : ''}
                {typeof item.category === 'object' ? item.category?.name : item.category || 'Sarf Malzeme Yönetim Paneli'}
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

        {/* Consumable Stats Quick Summary Bar */}
        <div className="grid grid-cols-3 gap-2 p-4 bg-[#F5F4EF] border-b border-slate-200 shrink-0 text-center">
          <div className="p-2.5 rounded-xl bg-white border border-slate-200 shadow-2xs">
            <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Kullanılabilir Stok
            </span>
            <span className="text-base font-extrabold text-emerald-600 font-mono">
              {item.availableQuantity ?? 0}
            </span>
          </div>
          <div className="p-2.5 rounded-xl bg-white border border-slate-200 shadow-2xs">
            <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Tüketilen Miktar
            </span>
            <span className="text-base font-extrabold text-[#4F8FE0] font-mono">
              {item.consumedQuantity ?? 0}
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
                onClick={() => setActiveTab('issue')}
                className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition cursor-pointer ${
                  activeTab === 'issue'
                    ? 'border-purple-600 text-purple-600 bg-purple-50/50 rounded-t-xl'
                    : 'border-transparent text-slate-500 hover:text-[#1E2534]'
                }`}
              >
                <Send className="w-4 h-4" />
                Doğrudan Düşüm
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
                  Mevcut Hazır Stok: {item.availableQuantity ?? 0} Adet
                </p>
                <p>Eklediğiniz stok miktarı doğrudan hazır stoğa eklenecektir.</p>
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
                  placeholder="Örn: 10"
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
                  placeholder="Örn: 10 paket A4 kağıdı depoya teslim alındı."
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

          {/* TAB 2: DOĞRUDAN DÜŞÜM */}
          {activeTab === 'issue' && canEdit && (
            <form onSubmit={handleIssueSubmit} className="space-y-4 max-w-lg mx-auto">
              <div className="bg-purple-50/60 border border-purple-200 rounded-2xl p-4 text-xs text-purple-800 space-y-1">
                <p className="font-bold flex items-center gap-1.5 text-purple-900">
                  <Send className="w-4 h-4 text-purple-600" />
                  Kullanılabilir Stok: {item.availableQuantity ?? 0} Adet
                </p>
                <p>
                  Belirttiğiniz miktar hazır stoktan düşülecek ve "Tüketilen" stoğa eklenecektir.
                </p>
              </div>

              {issueError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-medium">
                  {issueError}
                </div>
              )}

              {issueSuccess && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-700 font-semibold flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                  {issueSuccess}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Düşülecek Miktar *
                </label>
                <input
                  type="number"
                  min="1"
                  max={item.availableQuantity || 1}
                  required
                  value={issueQty}
                  onChange={(e) => setIssueQty(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-hidden focus:border-purple-500 font-semibold text-[#1E2534]"
                  placeholder="Örn: 1"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Birim Seçimi *
                </label>
                <select
                  required
                  value={selectedUnitId}
                  onChange={(e) => {
                    setSelectedUnitId(e.target.value);
                    setSelectedEmployeeId('');
                  }}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-[#1E2534] focus:outline-hidden focus:border-purple-500"
                >
                  <option value="">-- Birim Seçiniz --</option>
                  {units.map((unit) => (
                    <option key={unit.id} value={unit.id}>
                      {unit.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Personel Seçimi (İsteğe Bağlı)
                </label>
                <select
                  value={selectedEmployeeId}
                  onChange={(e) => setSelectedEmployeeId(e.target.value)}
                  disabled={!selectedUnitId}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-[#1E2534] focus:outline-hidden focus:border-purple-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <option value="">
                    {!selectedUnitId
                      ? '-- Önce Birim Seçiniz --'
                      : filteredEmployees.length === 0
                      ? '-- Bu Birimde Kayıtlı Personel Yok --'
                      : '-- Personel Seçiniz (Opsiyonel) --'}
                  </option>
                  {filteredEmployees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.fullName}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Açıklama (İsteğe Bağlı)
                </label>
                <textarea
                  rows="2"
                  value={issueNote}
                  onChange={(e) => setIssueNote(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-hidden focus:border-purple-500"
                  placeholder="Örn: Muhasebe departmanı yazıcısına toner takıldı."
                />
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  disabled={issueLoading || (item.availableQuantity || 0) < 1}
                  className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl shadow-md hover:shadow-lg transition cursor-pointer disabled:opacity-50"
                >
                  {issueLoading ? 'Kaydediliyor...' : 'Doğrudan Düşüm Yap'}
                </button>
              </div>
            </form>
          )}

          {/* TAB 3: STOK GEÇMİŞİ */}
          {activeTab === 'history' && (
            <div className="space-y-4">
              {/* Fatura Belgeleri */}
              <div className="p-4 bg-white rounded-2xl border border-slate-200 space-y-2">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Fatura Belgesi / Ek Belgeler
                </span>
                <AttachmentList entityType="consumable" entityId={item.id} canDelete={false} />
              </div>

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
                  Bu sarf malzeme için henüz herhangi bir stok hareketi bulunmuyor.
                </div>
              ) : (
                <div className="relative border-l-2 border-slate-200 ml-3 space-y-6">
                  {history.map((m) => {
                    const info = getStockMovementInfo(m.type, m.quantity);
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
                            <span className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border ${info.badgeClass}`}>
                              {info.label}
                            </span>
                            <span className="text-[11px] text-slate-400 font-medium flex items-center gap-1">
                              <Calendar className="w-3.5 h-3.5" />
                              {formattedDate}
                            </span>
                          </div>

                          <div className="flex items-center justify-between pt-1">
                            <span className="text-xs font-bold text-[#1E2534] font-mono">
                              {info.formattedQuantity}
                            </span>
                            {m.createdBy && (
                              <span className="text-[11px] text-slate-500 font-medium flex items-center gap-1">
                                <User className="w-3.5 h-3.5" />
                                {m.createdBy.fullName}
                              </span>
                            )}
                          </div>

                          {m.issuedToEmployee && (
                            <div className="text-xs text-slate-600 bg-white p-2 rounded-xl border border-slate-100 flex items-center gap-1.5">
                              <User className="w-3.5 h-3.5 text-[#4F8FE0]" />
                              <span>Teslim Alan: <strong>{m.issuedToEmployee.fullName}</strong></span>
                              {m.issuedToEmployee.unit && (
                                <span className="text-slate-400">({m.issuedToEmployee.unit.name})</span>
                              )}
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
