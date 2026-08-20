import React, { useEffect, useState } from 'react';
import { X, History } from 'lucide-react';
import useAuthStore from '../../../store/authStore';
import { API_BASE_URL } from '../../../config';
import EmptyState from '../../../components/common/EmptyState';
import AttachmentList from '../../../components/common/AttachmentList';
import { getStockMovementInfo } from '../../../utils/stockMovementLabels';

export default function ComponentHistoryModal({ isOpen, onClose, componentId, componentName }) {
  const token = useAuthStore((state) => state.accessToken);

  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen || !componentId) return;

    const fetchHistory = async () => {
      setLoading(true);
      setError('');
      try {
        const res = await fetch(`${API_BASE_URL}/components/${componentId}/history`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Stok geçmişi alınamadı.');
        setHistory(data.data || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [isOpen, componentId, token]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-[#1E2534] text-white">
          <div>
            <h2 className="font-heading text-base font-bold">Stok Hareket Geçmişi</h2>
            <p className="text-xs text-slate-300 truncate max-w-[260px]">
              {componentName || 'Bileşen'}
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
          {/* Fatura Belgeleri */}
          <div className="p-4 bg-white rounded-xl border border-slate-200 space-y-2">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">
              Fatura Belgesi / Ek Belgeler
            </span>
            <AttachmentList entityType="component" entityId={componentId} canDelete={false} />
          </div>

          <div className="border-t border-slate-100 pt-3 space-y-3">
            <span className="text-xs font-bold text-[#1E2534]">Hareket Kayıtları</span>
            {loading ? (
              <div className="py-8 text-center text-xs text-slate-400 font-medium">
                Stok hareketleri yükleniyor...
              </div>
            ) : error ? (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs">
                {error}
              </div>
            ) : history.length === 0 ? (
              <EmptyState
                title="Stok Hareketi Bulunamadı"
                description="Bu bileşene ait herhangi bir stok hareketi bulunmuyor."
              />
            ) : (
              <div className="space-y-2.5">
                {history.map((item) => {
                  const info = getStockMovementInfo(item.type, item.quantity);

                  return (
                    <div
                      key={item.id}
                      className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs flex items-center justify-between gap-3"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className={`px-2.5 py-0.5 rounded text-[10px] font-bold border ${info.badgeClass}`}>
                            {info.label}
                          </span>
                          <span className="font-mono font-bold text-[#1E2534]">
                            {info.formattedQuantity}
                          </span>
                        </div>

                        {item.note && <p className="text-slate-600 font-medium text-[11px]">{item.note}</p>}

                        <div className="flex items-center gap-3 text-[10px] text-slate-400 pt-0.5">
                          <span>{new Date(item.createdAt).toLocaleString('tr-TR')}</span>
                          <span>{item.createdBy?.fullName || '-'}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
