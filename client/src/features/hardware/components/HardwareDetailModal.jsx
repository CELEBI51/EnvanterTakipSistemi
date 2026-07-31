import React, { useEffect, useState } from 'react';
import {
  X,
  Tag,
  Cpu,
  History,
  Trash2,
  Calendar,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Barcode,
} from 'lucide-react';
import useAuthStore from '../../../store/authStore';
import EmptyState from '../../../components/common/EmptyState';
import ConfirmModal from '../../../components/common/ConfirmModal';
import BarcodePrintModal from '../../../components/common/BarcodePrintModal';

const STATUS_OPTIONS = [
  { label: 'Hazır (Boşta)', value: 'Hazir', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  { label: 'Kullanımda (Zimmetli)', value: 'Kullanimda', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  { label: 'Arızalı', value: 'Arizali', color: 'bg-rose-50 text-rose-700 border-rose-200' },
  { label: 'Serviste', value: 'Serviste', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  { label: 'Kullanım Dışı', value: 'KullanimDisi', color: 'bg-slate-100 text-slate-700 border-slate-200' },
];

export default function HardwareDetailModal({ hardwareId, isOpen, onClose, onUpdate, onDelete }) {
  const token = useAuthStore((state) => state.accessToken);
  const user = useAuthStore((state) => state.user);

  const [hardware, setHardware] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Barcode Print Modal State
  const [isBarcodePrintModalOpen, setIsBarcodePrintModalOpen] = useState(false);

  const canEdit = user?.role === 'admin' || user?.role === 'it_staff';

  const fetchData = async () => {
    if (!hardwareId) return;
    setLoading(true);
    setError('');
    try {
      const [resHw, resHist] = await Promise.all([
        fetch(`http://localhost:5000/api/hardware/${hardwareId}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`http://localhost:5000/api/hardware/${hardwareId}/history`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      const dataHw = await resHw.json();
      const dataHist = await resHist.json();

      if (!resHw.ok) throw new Error(dataHw.message || 'Ürün bilgisi alınamadı.');
      setHardware(dataHw.data);
      if (resHist.ok) setHistory(dataHist.data || []);
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
      const res = await fetch(`http://localhost:5000/api/hardware/${hardware.id}`, {
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
      onUpdate();
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
      const res = await fetch(`http://localhost:5000/api/hardware/${hardware.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Ürün silinemedi.');
      setShowConfirmDelete(false);
      onDelete();
      onClose();
    } catch (err) {
      alert(err.message);
    } finally {
      setDeleting(false);
    }
  };

  const isWarrantyExpired = hardware?.warrantyEndDate
    ? new Date(hardware.warrantyEndDate) < new Date(new Date().setHours(0, 0, 0, 0))
    : false;

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
        <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-[#1E2534] text-white">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center text-[#4F8FE0]">
                <Tag className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-mono text-base font-bold tracking-wide">
                    {hardware?.demirbasNo || 'Detaylar'}
                  </h2>
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-white/20 text-white">
                    {hardware?.category}
                  </span>
                </div>
                <p className="text-xs text-slate-300">
                  {hardware?.brand} {hardware?.model ? hardware.model : '-'}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 flex items-center justify-center transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="p-6 overflow-y-auto space-y-6 flex-1">
            {loading ? (
              <div className="py-12 text-center text-xs text-slate-400 font-medium">
                Ürün detayları yükleniyor...
              </div>
            ) : error ? (
              <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs">
                {error}
              </div>
            ) : (
              hardware && (
                <>
                  {/* Top Bar: Durum Seçimi, Barkod Butonu & Sil Butonu */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-[#F0F4F8] rounded-xl border border-slate-200">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-700">Güncel Durum:</span>
                      {canEdit ? (
                        <select
                          disabled={updatingStatus}
                          value={hardware.status}
                          onChange={(e) => handleStatusChange(e.target.value)}
                          className="px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-bold bg-white text-[#1E2534] focus:outline-hidden focus:border-[#4F8FE0]"
                        >
                          {STATUS_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-white border border-slate-200 text-[#1E2534]">
                          {STATUS_OPTIONS.find((opt) => opt.value === hardware.status)?.label ||
                            hardware.status}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Barkod Yazdır (Tüm Roller Erişebilir) */}
                      <button
                        type="button"
                        onClick={() => setIsBarcodePrintModalOpen(true)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-[#1E2534] bg-white hover:bg-slate-100 border border-slate-300 transition-colors shadow-2xs cursor-pointer"
                      >
                        <Barcode className="w-4 h-4 text-[#4F8FE0]" />
                        Barkod Yazdır
                      </button>

                      {canEdit && (
                        <button
                          onClick={() => setShowConfirmDelete(true)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-rose-600 hover:bg-rose-50 border border-rose-200 transition-colors self-start sm:self-auto cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                          Ürünü Sil
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Genel Bilgiler Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="p-4 bg-white rounded-xl border border-[#E2E8F0] space-y-2">
                      <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                        Ürün Bilgileri
                      </div>
                      <div className="text-xs space-y-1.5">
                        <div className="flex justify-between">
                          <span className="text-slate-500">Demirbaş No:</span>
                          <span className="font-mono font-bold text-[#1E2534]">
                            {hardware.demirbasNo}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Kategori:</span>
                          <span className="font-semibold text-slate-700">{hardware.category}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Marka / Model:</span>
                          <span className="font-semibold text-slate-700">
                            {hardware.brand} {hardware.model ? hardware.model : 'Belirtilmemiş'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Seri No:</span>
                          <span className="font-mono text-slate-700 font-medium">
                            {hardware.serialNo || '-'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="p-4 bg-white rounded-xl border border-[#E2E8F0] space-y-2">
                      <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                        Sistem Kayıt Bilgisi
                      </div>
                      <div className="text-xs space-y-1.5">
                        <div className="flex justify-between">
                          <span className="text-slate-500">Ekleyen Kullanıcı:</span>
                          <span className="font-semibold text-slate-700">
                            {hardware.createdBy?.fullName || '-'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">E-Posta:</span>
                          <span className="text-slate-600">
                            {hardware.createdBy?.email || '-'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Kayıt Tarihi:</span>
                          <span className="text-slate-600">
                            {new Date(hardware.createdAt).toLocaleDateString('tr-TR')}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Garanti Bilgisi Bölümü */}
                  <div className="p-4 bg-white rounded-xl border border-[#E2E8F0] space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-[#1E2534]">
                        <ShieldCheck className="w-4 h-4 text-[#4F8FE0]" />
                        <span>Garanti Bilgisi</span>
                      </div>

                      {hardware.warrantyEndDate ? (
                        isWarrantyExpired ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] sm:text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                            <Clock className="w-3 h-3 text-amber-600" />
                            Garanti Süresi Doldu
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] sm:text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            Garanti Devam Ediyor
                          </span>
                        )
                      ) : null}
                    </div>

                    {!hardware.warrantyStartDate && !hardware.warrantyEndDate ? (
                      <p className="text-xs text-slate-400 font-medium italic pt-1">
                        Garanti bilgisi girilmemiş.
                      </p>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-1 border-t border-slate-100">
                        <div>
                          <span className="text-slate-400 block text-[10px] font-bold uppercase">
                            Garanti Başlangıç Tarihi
                          </span>
                          <span className="font-semibold text-slate-700 flex items-center gap-1 mt-0.5">
                            <Calendar className="w-3.5 h-3.5 text-[#4F8FE0]" />
                            {hardware.warrantyStartDate
                              ? new Date(hardware.warrantyStartDate).toLocaleDateString('tr-TR')
                              : '-'}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[10px] font-bold uppercase">
                            Garanti Bitiş Tarihi
                          </span>
                          <span className="font-semibold text-slate-700 flex items-center gap-1 mt-0.5">
                            <Calendar className="w-3.5 h-3.5 text-amber-500" />
                            {hardware.warrantyEndDate
                              ? new Date(hardware.warrantyEndDate).toLocaleDateString('tr-TR')
                              : '-'}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Specs Bilgisi (Desktop / Laptop ise) */}
                  {hardware.specs && (
                    <div className="p-4 bg-[#F0F4F8] rounded-xl border border-slate-200 space-y-2">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-[#1E2534]">
                        <Cpu className="w-4 h-4 text-[#4F8FE0]" />
                        Donanım Özellikleri (Specs)
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
                        <div className="bg-white p-2.5 rounded-lg border border-slate-200 text-center">
                          <span className="text-[10px] text-slate-400 font-bold block uppercase">
                            CPU
                          </span>
                          <span className="text-xs font-bold text-[#1E2534]">
                            {hardware.specs.cpu || '-'}
                          </span>
                        </div>
                        <div className="bg-white p-2.5 rounded-lg border border-slate-200 text-center">
                          <span className="text-[10px] text-slate-400 font-bold block uppercase">
                            RAM
                          </span>
                          <span className="text-xs font-bold text-[#1E2534]">
                            {hardware.specs.ram || '-'}
                          </span>
                        </div>
                        <div className="bg-white p-2.5 rounded-lg border border-slate-200 text-center">
                          <span className="text-[10px] text-slate-400 font-bold block uppercase">
                            GPU
                          </span>
                          <span className="text-xs font-bold text-[#1E2534]">
                            {hardware.specs.gpu || '-'}
                          </span>
                        </div>
                        <div className="bg-white p-2.5 rounded-lg border border-slate-200 text-center">
                          <span className="text-[10px] text-slate-400 font-bold block uppercase">
                            DVD
                          </span>
                          <span className="text-xs font-bold text-[#1E2534]">
                            {hardware.specs.dvd ? 'Var' : 'Yok'}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Zimmet / İade Geçmişi Sekmesi */}
                  <div className="space-y-3 pt-2">
                    <h3 className="font-heading text-sm font-bold text-[#1E2534] flex items-center gap-2">
                      <History className="w-4 h-4 text-[#4F8FE0]" />
                      Zimmet & İade Geçmişi
                    </h3>

                    {history.length > 0 ? (
                      <div className="space-y-2">
                        {history.map((h) => (
                          <div
                            key={h.id}
                            className="p-3 bg-white rounded-xl border border-slate-200 text-xs flex justify-between items-center"
                          >
                            <div>
                              <span className="font-bold text-[#1E2534]">
                                {h.type === 'assignment' ? `Zimmet: ${h.employeeName}` : 'İade'}
                              </span>
                              <span className="text-slate-400 block text-[11px]">
                                {new Date(h.date).toLocaleDateString('tr-TR')}
                              </span>
                            </div>
                            <span className="px-2 py-1 bg-slate-100 rounded-md text-[11px] font-semibold text-slate-700">
                              {h.status || h.resultStatus || 'Tamamlandı'}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <EmptyState
                        icon={History}
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

      {/* Confirm Modal for Delete */}
      <ConfirmModal
        isOpen={showConfirmDelete}
        title="Ürünü Sil"
        message={`"${hardware?.brand} ${hardware?.model || ''}" (${hardware?.demirbasNo}) adlı demirbaşı silmek istediğinize emin misiniz? Bu işlem geri alınamaz.`}
        confirmText={deleting ? 'Siliniyor...' : 'Evet, Sil'}
        confirmVariant="danger"
        onConfirm={handleDeleteConfirmed}
        onCancel={() => setShowConfirmDelete(false)}
      />

      {/* Barcode Print Modal */}
      {hardware && (
        <BarcodePrintModal
          isOpen={isBarcodePrintModalOpen}
          onClose={() => setIsBarcodePrintModalOpen(false)}
          demirbasNo={hardware.demirbasNo}
          brand={hardware.brand}
          model={hardware.model}
        />
      )}
    </>
  );
}
