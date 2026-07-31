import React, { useEffect, useState } from 'react';
import { X, History, PlusCircle, AlertTriangle, User, Calendar } from 'lucide-react';
import useAuthStore from '../../../store/authStore';
import EmptyState from '../../../components/common/EmptyState';

export default function AccessoryHistoryModal({ isOpen, onClose, accessoryId, accessoryName }) {
  const token = useAuthStore((state) => state.accessToken);

  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen || !accessoryId) return;

    const fetchHistory = async () => {
      setLoading(true);
      setError('');
      try {
        const res = await fetch(`http://localhost:5000/api/accessories/${accessoryId}/history`, {
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
  }, [isOpen, accessoryId, token]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
      <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-2xl w-full max-w-xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-[#1E2534] text-white">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center text-[#4F8FE0]">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-heading text-base font-bold">Stok Hareket Geçmişi</h2>
              <p className="text-xs text-slate-300 truncate max-w-[260px]">
                {accessoryName || 'Aksesuar Geçmişi'}
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

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          {loading ? (
            <div className="py-12 text-center text-xs text-slate-400 font-medium">
              Stok hareketleri yükleniyor...
            </div>
          ) : error ? (
            <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs">
              {error}
            </div>
          ) : history.length === 0 ? (
            <EmptyState
              icon={History}
              title="Stok Hareketi Bulunamadı"
              description="Bu aksesuara ait herhangi bir stok girişi veya işlem kaydı yok."
            />
          ) : (
            <div className="space-y-3">
              {history.map((item) => {
                const isRestock = item.type === 'restock';
                return (
                  <div
                    key={item.id}
                    className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-2xs text-xs flex items-center justify-between gap-3"
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`w-8 h-8 rounded-lg shrink-0 flex items-center justify-center font-bold ${
                          isRestock ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' : 'bg-amber-50 text-amber-600 border border-amber-200'
                        }`}
                      >
                        {isRestock ? <PlusCircle className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${
                              isRestock ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'
                            }`}
                          >
                            {isRestock ? 'Stok Takviyesi' : 'Arızalı Ayrıldı'}
                          </span>
                          <span className="font-mono font-bold text-[#1E2534]">
                            {isRestock ? `+${item.quantity}` : `-${item.quantity}`} adet
                          </span>
                        </div>

                        {item.note && <p className="text-slate-600 font-medium text-[11px]">{item.note}</p>}

                        <div className="flex items-center gap-3 text-[10px] text-slate-400 pt-0.5">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-slate-400" />
                            {new Date(item.createdAt).toLocaleString('tr-TR')}
                          </span>
                          <span className="flex items-center gap-1">
                            <User className="w-3 h-3 text-slate-400" />
                            {item.createdBy?.fullName || '-'}
                          </span>
                        </div>
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
  );
}
