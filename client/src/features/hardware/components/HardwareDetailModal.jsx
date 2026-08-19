import React, { useEffect, useState } from 'react';
import { X, Trash2, Barcode, Wrench, Plus, ChevronRight } from 'lucide-react';
import useAuthStore from '../../../store/authStore';
import { hasPermission } from '../../../utils/permissions';
import EmptyState from '../../../components/common/EmptyState';
import ConfirmModal from '../../../components/common/ConfirmModal';
import BarcodePrintModal from '../../../components/common/BarcodePrintModal';
import AttachmentList from '../../../components/common/AttachmentList';
import AddMaintenanceModal from './AddMaintenanceModal';
import MaintenanceDetailModal from './MaintenanceDetailModal';

const STATUS_OPTIONS = [
  { label: 'Hazır (Boşta)', value: 'Hazir' },
  { label: 'Kullanımda (Zimmetli)', value: 'Kullanimda' },
  { label: 'Arızalı', value: 'Arizali' },
  { label: 'Serviste', value: 'Serviste' },
  { label: 'Kullanım Dışı', value: 'KullanimDisi' },
];

export default function HardwareDetailModal({ hardwareId, isOpen, onClose, onUpdate, onDelete }) {
  const token = useAuthStore((state) => state.accessToken);
  const user = useAuthStore((state) => state.user);

  const [hardware, setHardware] = useState(null);
  const [history, setHistory] = useState([]);
  const [maintenances, setMaintenances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [isBarcodePrintModalOpen, setIsBarcodePrintModalOpen] = useState(false);
  const [isAddMaintenanceOpen, setIsAddMaintenanceOpen] = useState(false);
  const [selectedMaintenanceId, setSelectedMaintenanceId] = useState(null);
  const [isMaintenanceDetailOpen, setIsMaintenanceDetailOpen] = useState(false);

  const canEdit = user?.role === 'admin' || user?.role === 'it_staff';

  const fetchData = async () => {
    if (!hardwareId) return;
    setLoading(true);
    setError('');
    try {
      const [resHw, resHist, resMaint] = await Promise.all([
        fetch(`http://localhost:4001/api/hardware/${hardwareId}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`http://localhost:4001/api/hardware/${hardwareId}/history`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`http://localhost:4001/api/maintenance?hardwareId=${hardwareId}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      const dataHw = await resHw.json();
      const dataHist = await resHist.json();
      const dataMaint = await resMaint.json();

      if (!resHw.ok) throw new Error(dataHw.message || 'Ürün bilgisi alınamadı.');
      setHardware(dataHw.data);
      if (resHist.ok) setHistory(dataHist.data || []);
      if (resMaint.ok) setMaintenances(dataMaint.data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) fetchData();
  }, [hardwareId, isOpen]);

  if (!isOpen) return null;

  const handleStatusChange = async (newStatus) => {
    if (!canEdit || !hardware) return;
    setUpdatingStatus(true);
    try {
      const res = await fetch(`http://localhost:4001/api/hardware/${hardware.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Durum güncellenemedi.');
      setHardware(data.data);
      if (onUpdate) onUpdate();
    } catch (err) {
      alert(err.message);
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleDeleteConfirmed = async () => {
    if (!canEdit || !hardware) return;
    setDeleting(true);
    try {
      const res = await fetch(`http://localhost:4001/api/hardware/${hardware.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Ürün silinemedi.');
      setShowConfirmDelete(false);
      if (onDelete) onDelete();
    } catch (err) {
      alert(err.message);
    } finally {
      setDeleting(false);
    }
  };

  const isWarrantyExpired =
    hardware?.warrantyEndDate && new Date(hardware.warrantyEndDate) < new Date();

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 bg-[#1E2534] text-white">
            <div className="flex items-center gap-3">
              <div>
                <span className="text-[10px] font-bold text-[#4F8FE0] uppercase tracking-wider block">
                  Demirbaş No: {hardware?.demirbasNo || '-'}
                </span>
                <h2 className="text-lg font-bold font-heading">
                  {hardware ? `${hardware.brand} ${hardware.model || ''}` : 'Ürün Detayı'}
                </h2>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {hardware && (
                <button
                  onClick={() => setIsBarcodePrintModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-semibold text-white transition cursor-pointer"
                  title="Barkod Yazdır"
                >
                  <Barcode className="w-4 h-4" />
                  Barkod
                </button>
              )}

              <button
                onClick={onClose}
                className="w-8 h-8 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 flex items-center justify-center transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto space-y-6 flex-1">
            {loading ? (
              <div className="py-12 text-center text-xs text-slate-400">Yükleniyor...</div>
            ) : error ? (
              <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-medium">
                {error}
              </div>
            ) : (
              hardware && (
                <>
                  {/* General Info Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                      <span className="text-xs font-bold text-[#1E2534] block">Temel Bilgiler</span>
                      <div className="space-y-2 text-xs">
                        <div className="flex justify-between">
                          <span className="text-slate-500">Kategori:</span>
                          <span className="font-semibold text-slate-700">{hardware.category?.name || '-'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Marka:</span>
                          <span className="font-semibold text-slate-700">{hardware.brand}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Model:</span>
                          <span className="font-semibold text-slate-700">{hardware.model || '-'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Seri No:</span>
                          <span className="font-mono font-semibold text-slate-700">{hardware.serialNo || '-'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Wifi MAC:</span>
                          <span className="font-mono font-semibold text-slate-700">{hardware.wifiMacAddress || '-'}</span>
                        </div>
                      </div>
                    </div>

                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-[#1E2534]">Durum & Tedarik</span>
                        {canEdit ? (
                          <div className="flex items-center gap-1.5">
                            <select
                              disabled={updatingStatus}
                              value={hardware.status}
                              onChange={(e) => handleStatusChange(e.target.value)}
                              className="px-2.5 py-1 rounded text-xs font-bold bg-white border border-slate-300 text-[#1E2534] focus:border-[#4F8FE0]"
                            >
                              {/* Sistem tarafından otomatik yönetilen durumlar (Kullanımda, Hazır, Serviste) */}
                              {hardware.status === 'Hazir' && (
                                <option value="Hazir">Hazır (Boşta)</option>
                              )}
                              {hardware.status === 'Kullanimda' && (
                                <option value="Kullanimda">Kullanımda (Zimmetli)</option>
                              )}
                              {hardware.status === 'Serviste' && (
                                <option value="Serviste">Serviste (Bakımda)</option>
                              )}

                              {/* Elle değiştirilebilen durumlar */}
                              <option value="Arizali">Arızalı</option>
                              <option value="KullanimDisi">Kullanım Dışı</option>
                            </select>
                          </div>
                        ) : (
                          <span className="px-2.5 py-1 rounded text-xs font-bold bg-slate-200 text-slate-800">
                            {hardware.status}
                          </span>
                        )}
                      </div>


                      <div className="space-y-2 text-xs pt-1">
                        <div className="flex justify-between">
                          <span className="text-slate-500">Lokasyon:</span>
                          <span className="font-semibold text-slate-700">{hardware.location || '-'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Tedarikçi:</span>
                          <span className="font-semibold text-slate-700">{hardware.supplier || '-'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Fatura No:</span>
                          <span className="font-semibold text-slate-700">{hardware.invoiceNo || '-'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Satın Alma Tarihi:</span>
                          <span className="text-slate-600">
                            {hardware.purchaseDate
                              ? new Date(hardware.purchaseDate).toLocaleDateString('tr-TR')
                              : '-'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Satın Alma Tutarı:</span>
                          <span className="font-semibold text-slate-700">
                            {hardware.purchaseAmount !== null && hardware.purchaseAmount !== undefined
                              ? `${Number(hardware.purchaseAmount).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺`
                              : '-'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Fatura / Ek Belgeler */}
                  <div className="p-4 bg-white rounded-xl border border-slate-200 space-y-2">
                    <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                      Fatura Belgesi / Dosya Ekleri
                    </div>
                    <AttachmentList entityType="hardware" entityId={hardware.id} canDelete={canEdit} />
                  </div>

                  {/* Garanti Bilgisi */}
                  <div className="p-4 bg-white rounded-xl border border-slate-200 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[#1E2534]">Garanti Bilgisi</span>
                      {hardware.warrantyEndDate && (
                        <span
                          className={`px-2.5 py-0.5 rounded text-[10px] font-bold ${
                            isWarrantyExpired
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          }`}
                        >
                          {isWarrantyExpired ? 'Garanti Süresi Doldu' : 'Garanti Devam Ediyor'}
                        </span>
                      )}
                    </div>

                    {!hardware.warrantyStartDate && !hardware.warrantyEndDate ? (
                      <p className="text-xs text-slate-400 italic">Garanti bilgisi girilmemiş.</p>
                    ) : (
                      <div className="grid grid-cols-2 gap-3 text-xs pt-1 border-t border-slate-100">
                        <div>
                          <span className="text-slate-400 block text-[10px] font-bold uppercase">Başlangıç Tarihi</span>
                          <span className="font-semibold text-slate-700">
                            {hardware.warrantyStartDate
                              ? new Date(hardware.warrantyStartDate).toLocaleDateString('tr-TR')
                              : '-'}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[10px] font-bold uppercase">Bitiş Tarihi</span>
                          <span className="font-semibold text-slate-700">
                            {hardware.warrantyEndDate
                              ? new Date(hardware.warrantyEndDate).toLocaleDateString('tr-TR')
                              : '-'}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Specs */}
                  {hardware.specs && (
                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                      <span className="text-xs font-bold text-[#1E2534]">Donanım Özellikleri (Specs)</span>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
                        <div className="bg-white p-2 rounded-lg border border-slate-200 text-center">
                          <span className="text-[10px] text-slate-400 font-bold block">CPU</span>
                          <span className="text-xs font-bold text-[#1E2534]">{hardware.specs.cpu || '-'}</span>
                        </div>
                        <div className="bg-white p-2 rounded-lg border border-slate-200 text-center">
                          <span className="text-[10px] text-slate-400 font-bold block">RAM</span>
                          <span className="text-xs font-bold text-[#1E2534]">{hardware.specs.ram || '-'}</span>
                        </div>
                        <div className="bg-white p-2 rounded-lg border border-slate-200 text-center">
                          <span className="text-[10px] text-slate-400 font-bold block">GPU</span>
                          <span className="text-xs font-bold text-[#1E2534]">{hardware.specs.gpu || '-'}</span>
                        </div>
                        <div className="bg-white p-2 rounded-lg border border-slate-200 text-center">
                          <span className="text-[10px] text-slate-400 font-bold block">DVD</span>
                          <span className="text-xs font-bold text-[#1E2534]">{hardware.specs.dvd ? 'Var' : 'Yok'}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Bakım Geçmişi Bölümü (Faz 3) */}
                  <div className="space-y-3 pt-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Wrench className="w-4 h-4 text-[#4F8FE0]" />
                        <h3 className="text-sm font-bold text-[#1E2534]">Bakım Geçmişi</h3>
                      </div>

                      {hasPermission(user, 'hardware:maintenance') && !hardware?.hasActiveMaintenance && (
                        <button
                          type="button"
                          onClick={() => setIsAddMaintenanceOpen(true)}
                          className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-[#4F8FE0] hover:bg-[#3D75C4] text-white text-xs font-bold transition cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          Yeni Bakım Kaydı Oluştur
                        </button>
                      )}
                    </div>

                    {maintenances.length === 0 ? (
                      <EmptyState
                        title="Henüz Bakım Kaydı Yok"
                        description="Bu varlığa ait herhangi bir bakım kaydı bulunmuyor."
                      />
                    ) : (
                      <div className="space-y-2">
                        {maintenances.map((m) => (
                          <div
                            key={m.id}
                            onClick={() => {
                              setSelectedMaintenanceId(m.id);
                              setIsMaintenanceDetailOpen(true);
                            }}
                            className="p-3 bg-white rounded-xl border border-slate-200 hover:border-[#4F8FE0] text-xs flex items-center justify-between cursor-pointer transition shadow-2xs"
                          >
                            <div className="space-y-0.5">
                              <span className="font-bold text-[#1E2534] block">{m.name}</span>
                              <div className="flex items-center gap-2 text-[11px] text-slate-500">
                                <span>{m.maintenanceType}</span>
                                <span>•</span>
                                <span>{new Date(m.startDate).toLocaleDateString('tr-TR')}</span>
                                {m.cost && (
                                  <>
                                    <span>•</span>
                                    <span className="font-mono font-semibold text-[#1E2534]">
                                      {Number(m.cost).toLocaleString('tr-TR')} ₺
                                    </span>
                                  </>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              <span
                                className={`px-2.5 py-0.5 rounded text-[10px] font-bold border ${
                                  m.status === 'Devam Ediyor'
                                    ? 'bg-blue-50 text-blue-700 border-blue-200'
                                    : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                }`}
                              >
                                {m.status}
                              </span>
                              <ChevronRight className="w-4 h-4 text-slate-400" />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Zimmet Geçmişi */}
                  <div className="space-y-3 pt-2">
                    <h3 className="text-sm font-bold text-[#1E2534]">Zimmet Geçmişi</h3>

                    {history.length > 0 ? (
                      <div className="relative border-l-2 border-slate-200 ml-3 space-y-4">
                        {history.map((h) => {
                          const isActive = !h.returned;
                          const teslimDate = new Date(h.teslimTarihi).toLocaleDateString('tr-TR', {
                            day: '2-digit',
                            month: 'long',
                            year: 'numeric',
                          });

                          return (
                            <div key={h.id} className="relative pl-6">
                              {/* Timeline dot */}
                              <div
                                className={`absolute -left-[9px] top-1 w-4 h-4 rounded-full border-2 shrink-0 ${
                                  isActive
                                    ? 'bg-[#4F8FE0]/20 border-[#4F8FE0]'
                                    : 'bg-emerald-50 border-emerald-400'
                                }`}
                              />

                              <div className={`bg-white rounded-xl border p-3.5 transition space-y-2.5 ${
                                isActive ? 'border-[#4F8FE0]/30 shadow-sm' : 'border-slate-200'
                              }`}>
                                {/* Row 1: Employee + Status badge */}
                                <div className="flex items-center justify-between gap-2">
                                  <div className="flex items-center gap-2 min-w-0">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                                      isActive
                                        ? 'bg-[#4F8FE0] text-white'
                                        : 'bg-slate-200 text-slate-600'
                                    }`}>
                                      {h.employeeName ? h.employeeName.substring(0, 2).toUpperCase() : '?'}
                                    </div>
                                    <div className="min-w-0">
                                      <p className="text-xs font-bold text-[#1E2534] truncate">
                                        {h.employeeName}
                                      </p>
                                      {h.employeeUnit && (
                                        <p className="text-[11px] text-slate-500 truncate">
                                          {h.employeeUnit}
                                        </p>
                                      )}
                                    </div>
                                  </div>

                                  <span
                                    className={`px-2.5 py-1 rounded-lg text-[10px] font-bold shrink-0 ${
                                      isActive
                                        ? 'bg-[#4F8FE0]/10 text-[#4F8FE0] border border-[#4F8FE0]/30'
                                        : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                    }`}
                                  >
                                    {isActive ? 'Aktif' : 'İade Edildi'}
                                  </span>
                                </div>

                                {/* Row 2: Dates */}
                                <div className="grid grid-cols-2 gap-3 text-[11px] pt-1 border-t border-slate-100">
                                  <div>
                                    <span className="text-slate-400 block text-[10px] font-bold uppercase">Zimmet Tarihi</span>
                                    <span className="font-semibold text-slate-700">{teslimDate}</span>
                                  </div>
                                  {h.returned && h.returnDate && (
                                    <div>
                                      <span className="text-slate-400 block text-[10px] font-bold uppercase">İade Tarihi</span>
                                      <span className="font-semibold text-slate-700">
                                        {new Date(h.returnDate).toLocaleDateString('tr-TR', {
                                          day: '2-digit',
                                          month: 'long',
                                          year: 'numeric',
                                        })}
                                      </span>
                                    </div>
                                  )}
                                </div>

                                {/* Row 3: Extra info */}
                                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-500">
                                  <span>Teslim Eden: <strong className="text-slate-700">{h.teslimEden}</strong></span>
                                  {h.returned && h.teslimAlanIc && (
                                    <span>Teslim Alan: <strong className="text-slate-700">{h.teslimAlanIc}</strong></span>
                                  )}
                                  {h.returned && h.resultStatus && (
                                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                                      Sonuç: {h.resultStatus}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <EmptyState
                        title="Zimmet Geçmişi Yok"
                        description="Bu ürün henüz herhangi bir personele zimmetlenmemiş."
                      />
                    )}
                  </div>
                </>
              )
            )}
          </div>
        </div>
      </div>

      <ConfirmModal
        isOpen={showConfirmDelete}
        title="Ürünü Sil"
        message={`"${hardware?.brand} ${hardware?.model || ''}" (${hardware?.demirbasNo}) adlı demirbaşı silmek istediğinize emin misiniz?`}
        confirmText={deleting ? 'Siliniyor...' : 'Evet, Sil'}
        confirmVariant="danger"
        onConfirm={handleDeleteConfirmed}
        onCancel={() => setShowConfirmDelete(false)}
      />

      {hardware && (
        <>
          <BarcodePrintModal
            isOpen={isBarcodePrintModalOpen}
            onClose={() => setIsBarcodePrintModalOpen(false)}
            demirbasNo={hardware.demirbasNo}
            brand={hardware.brand}
            model={hardware.model}
          />

          <AddMaintenanceModal
            isOpen={isAddMaintenanceOpen}
            onClose={() => setIsAddMaintenanceOpen(false)}
            hardwareId={hardware.id}
            onSuccess={() => {
              setIsAddMaintenanceOpen(false);
              fetchData();
              if (onUpdate) onUpdate();
            }}
          />

          <MaintenanceDetailModal
            isOpen={isMaintenanceDetailOpen}
            onClose={() => {
              setIsMaintenanceDetailOpen(false);
              setSelectedMaintenanceId(null);
            }}
            maintenanceId={selectedMaintenanceId}
            onUpdate={() => {
              fetchData();
              if (onUpdate) onUpdate();
            }}
          />
        </>
      )}
    </>
  );
}
