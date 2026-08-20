import React, { useState, useEffect } from 'react';
import { X, Plus, CheckCircle2 } from 'lucide-react';
import useAuthStore from '../../../store/authStore';
import { API_BASE_URL } from '../../../config';
import EmptyState from '../../../components/common/EmptyState';
import AddComponentToMaintenanceModal from './AddComponentToMaintenanceModal';
import CompleteMaintenanceModal from './CompleteMaintenanceModal';

export default function MaintenanceDetailModal({ isOpen, onClose, maintenanceId, onUpdate }) {
  const token = useAuthStore((state) => state.accessToken);
  const user = useAuthStore((state) => state.user);

  const [maintenance, setMaintenance] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [isAddComponentOpen, setIsAddComponentOpen] = useState(false);
  const [isCompleteModalOpen, setIsCompleteModalOpen] = useState(false);

  const canEdit = user?.role === 'admin' || user?.role === 'it_staff';

  const fetchDetail = async () => {
    if (!maintenanceId) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE_URL}/maintenance/${maintenanceId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Bakım detayı alınamadı.');
      setMaintenance(data.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) fetchDetail();
  }, [isOpen, maintenanceId]);

  if (!isOpen) return null;

  const isOngoing = maintenance && maintenance.status === 'Devam Ediyor';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-[#1E2534] text-white">
          <div>
            <h2 className="font-heading text-base font-bold">Bakım Kaydı Detayı</h2>
            <p className="text-xs text-slate-300 truncate max-w-[280px]">
              {maintenance?.hardware?.brand} {maintenance?.hardware?.model} ({maintenance?.hardware?.demirbasNo})
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 flex items-center justify-center transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {loading ? (
            <div className="py-12 text-center text-xs text-slate-400">Yükleniyor...</div>
          ) : error ? (
            <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs">
              {error}
            </div>
          ) : maintenance ? (
            <>
              {/* Bakım Bilgi Kartı */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-[#1E2534] text-sm">{maintenance.name}</h3>
                  <span
                    className={`px-2.5 py-1 rounded text-xs font-bold border ${
                      isOngoing
                        ? 'bg-blue-50 text-blue-700 border-blue-200'
                        : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    }`}
                  >
                    {maintenance.status}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-slate-500 block">Bakım Türü:</span>
                    <span className="font-semibold text-[#1E2534]">
                      {maintenance.maintenanceType}
                      {maintenance.customTypeNote ? ` (${maintenance.customTypeNote})` : ''}
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-500 block">Maliyet:</span>
                    <span className="font-mono font-bold text-[#1E2534]">
                      {maintenance.cost ? `${Number(maintenance.cost).toLocaleString('tr-TR')} ₺` : '-'}
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-500 block">Başlangıç Tarihi:</span>
                    <span className="font-medium text-[#1E2534]">
                      {new Date(maintenance.startDate).toLocaleDateString('tr-TR')}
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-500 block">Bitiş Tarihi:</span>
                    <span className="font-medium text-[#1E2534]">
                      {maintenance.endDate ? new Date(maintenance.endDate).toLocaleDateString('tr-TR') : 'Devam Ediyor'}
                    </span>
                  </div>
                </div>

                {/* Tamamlandıysa Sonuç Bilgisi */}
                {!isOngoing && maintenance.appliedResultStatus && (
                  <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-900 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Bakım tamamlandı. Varlık durumu <strong>"{maintenance.appliedResultStatus}"</strong> olarak güncellendi.</span>
                  </div>
                )}

                {maintenance.notes && (
                  <div className="pt-2 border-t border-slate-200 text-xs">
                    <span className="text-slate-500 block font-medium mb-0.5">Notlar:</span>
                    <p className="text-slate-700">{maintenance.notes}</p>
                  </div>
                )}
              </div>

              {/* Kullanılan Bileşenler Bölümü */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-[#1E2534] text-xs uppercase tracking-wider">
                    Kullanılan Donanım Bileşenleri
                  </h4>

                  {canEdit && isOngoing && (
                    <button
                      onClick={() => setIsAddComponentOpen(true)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#4F8FE0] hover:bg-[#3D75C4] text-white text-xs font-bold transition cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Bileşen Ekle
                    </button>
                  )}
                </div>

                {!maintenance.components || maintenance.components.length === 0 ? (
                  <EmptyState
                    title="Henüz Bileşen Eklenmedi"
                    description="Bu bakım işleminde herhangi bir yedek parça / bileşen kullanılmadı."
                  />
                ) : (
                  <div className="space-y-2">
                    {maintenance.components.map((c) => (
                      <div
                        key={c.id}
                        className="p-3 bg-white rounded-xl border border-slate-200 text-xs flex items-center justify-between gap-3 shadow-2xs"
                      >
                        <div>
                          <span className="font-bold text-[#1E2534] block">{c.component?.name}</span>
                          <span className="text-[11px] text-slate-500">
                            {c.component?.brand} {c.component?.model}
                          </span>
                        </div>
                        <span className="font-mono font-bold text-slate-700 bg-slate-100 px-2.5 py-1 rounded border border-slate-200">
                          {c.quantityUsed} adet
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Devam Ediyorsa Tamamlama Butonu */}
              {canEdit && isOngoing && (
                <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                  <button
                    onClick={() => setIsCompleteModalOpen(true)}
                    className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition cursor-pointer"
                  >
                    Bakımı Tamamla
                  </button>
                </div>
              )}
            </>
          ) : null}
        </div>
      </div>

      {/* Sub-Modals */}
      {maintenance && (
        <>
          <AddComponentToMaintenanceModal
            isOpen={isAddComponentOpen}
            onClose={() => setIsAddComponentOpen(false)}
            maintenanceId={maintenance.id}
            onSuccess={() => {
              setIsAddComponentOpen(false);
              fetchDetail();
              if (onUpdate) onUpdate();
            }}
          />

          <CompleteMaintenanceModal
            isOpen={isCompleteModalOpen}
            onClose={() => setIsCompleteModalOpen(false)}
            maintenance={maintenance}
            onSuccess={() => {
              setIsCompleteModalOpen(false);
              fetchDetail();
              if (onUpdate) onUpdate();
            }}
          />
        </>
      )}
    </div>
  );
}
