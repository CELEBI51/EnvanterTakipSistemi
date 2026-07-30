import React, { useEffect, useState } from 'react';
import {
  Key,
  Plus,
  Search,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Edit2,
  Trash2,
  AlertTriangle,
  Calendar,
  Laptop,
  CheckCircle2,
  Clock,
  Filter,
} from 'lucide-react';
import useAuthStore from '../../../store/authStore';
import EmptyState from '../../../components/common/EmptyState';
import ConfirmModal from '../../../components/common/ConfirmModal';
import AddSoftwareModal from '../components/AddSoftwareModal';
import EditSoftwareModal from '../components/EditSoftwareModal';

export default function SoftwareList() {
  const token = useAuthStore((state) => state.accessToken);
  const user = useAuthStore((state) => state.user);

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [expiringOnly, setExpiringOnly] = useState(false);

  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingSoftware, setEditingSoftware] = useState(null);
  const [deletingSoftwareId, setDeletingSoftwareId] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const canManage = user?.role === 'admin' || user?.role === 'it_staff';

  const fetchSoftware = async () => {
    setLoading(true);
    setError('');

    const params = new URLSearchParams();
    params.append('page', page);
    params.append('pageSize', '10');

    if (searchQuery.trim()) {
      params.append('q', searchQuery.trim());
    }
    if (expiringOnly) {
      params.append('expiring', 'true');
    }

    try {
      const res = await fetch(`http://localhost:5000/api/software?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Yazılım lisans verileri çekilemedi.');
      }

      setItems(data.data.items || []);
      setTotalPages(data.data.totalPages || 1);
      setTotalCount(data.data.totalCount || 0);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSoftware();
  }, [token, page, expiringOnly]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchSoftware();
  };

  const handleDeleteConfirm = async () => {
    if (!deletingSoftwareId) return;

    setIsDeleting(true);
    try {
      const res = await fetch(`http://localhost:5000/api/software/${deletingSoftwareId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Yazılım silinirken bir hata oluştu.');
      }

      setDeletingSoftwareId(null);
      fetchSoftware();
    } catch (err) {
      alert(err.message);
    } finally {
      setIsDeleting(false);
    }
  };

  // 7 gün içinde dolacak veya dolmuş lisans sayısı (sayfa üstü şerit için)
  const urgentCount = items.filter((item) => item.daysRemaining <= 7).length;

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('tr-TR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const getRemainingDaysBadge = (days) => {
    if (days < 0) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200 shrink-0">
          <Clock className="w-3 h-3 text-rose-600" />
          Süresi Doldu ({Math.abs(days)} gün önce)
        </span>
      );
    }
    if (days === 0) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200 shrink-0">
          <AlertTriangle className="w-3 h-3 text-amber-600" />
          Bugün Bitiyor
        </span>
      );
    }
    if (days <= 15) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200 shrink-0">
          <Clock className="w-3 h-3 text-amber-600" />
          {days} gün kaldı
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
        {days} gün kaldı
      </span>
    );
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Sayfa Üstü Uyarı Şeridi (7 gün ve altı lisans varsa) */}
      {urgentCount > 0 && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-center justify-between gap-3 text-amber-800 text-xs sm:text-sm font-semibold shadow-xs animate-in fade-in">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <span className="font-bold">Lisans Uyarı Şeridi: </span>
              {urgentCount} adet lisansın süresi 7 gün içinde doluyor veya dolmuş durumda!
            </div>
          </div>
          <button
            onClick={() => setExpiringOnly(true)}
            className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition-colors cursor-pointer shrink-0"
          >
            Filtrele
          </button>
        </div>
      )}

      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-[#E2E8F0] shadow-sm">
        <div>
          <h1 className="font-heading text-2xl font-bold text-[#1E2534]">Yazılım Envanteri & Lisanslar</h1>
          <p className="text-sm text-slate-500 mt-1">
            Toplam {totalCount} adet lisans kaydı bulunuyor.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchSoftware}
            className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl border border-[#E2E8F0] text-slate-700 bg-white hover:bg-slate-50 text-xs font-semibold transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Yenile
          </button>

          {canManage && (
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#4F8FE0] hover:bg-[#3D75C4] active:bg-[#3566AD] text-white text-xs font-bold shadow-sm transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              Yeni Yazılım Ekle
            </button>
          )}
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-[#E2E8F0] shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Search */}
        <form onSubmit={handleSearchSubmit} className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Yazılım adı veya lisans key ara..."
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-[#E2E8F0] text-xs text-[#1E2534] placeholder:text-slate-400 focus:outline-hidden focus:border-[#4F8FE0] focus:ring-1 focus:ring-[#4F8FE0]"
          />
        </form>

        {/* Toggle Filter: Sadece Yakında Bitecekler */}
        <div className="flex items-center gap-3">
          <label className="inline-flex items-center gap-2 cursor-pointer select-none text-xs font-semibold text-[#1E2534]">
            <input
              type="checkbox"
              checked={expiringOnly}
              onChange={(e) => {
                setExpiringOnly(e.target.checked);
                setPage(1);
              }}
              className="w-4 h-4 rounded border-slate-300 text-[#4F8FE0] focus:ring-[#4F8FE0] accent-[#4F8FE0]"
            />
            <Filter className="w-3.5 h-3.5 text-[#4F8FE0]" />
            Sadece Yakında Bitecekler (15 Gün)
          </label>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-medium">
          {error}
        </div>
      )}

      {/* Main Content Area */}
      {loading ? (
        <div className="bg-white p-6 rounded-2xl border border-[#E2E8F0] shadow-sm space-y-4 animate-pulse">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-10 bg-slate-100 rounded-xl"></div>
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          icon={Key}
          title="Yazılım Bulunamadı"
          description="Arama kriterlerinize uyan herhangi bir lisans kaydı bulunamadı."
        />
      ) : (
        <>
          {/* Masaüstü Tablo Görünümü (Hidden on small screens) */}
          <div className="hidden md:block bg-white rounded-2xl border border-[#E2E8F0] shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-[#1E2534]/5 text-[#1E2534] font-bold border-b border-[#E2E8F0]">
                    <th className="py-3.5 px-4">Yazılım Adı</th>
                    <th className="py-3.5 px-4">Lisans Key</th>
                    <th className="py-3.5 px-4">Başlangıç</th>
                    <th className="py-3.5 px-4">Bitiş</th>
                    <th className="py-3.5 px-4">Atanan Cihaz</th>
                    <th className="py-3.5 px-4">Kalan Gün</th>
                    {canManage && <th className="py-3.5 px-4 text-right">İşlemler</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {items.map((sw) => (
                    <tr key={sw.id} className="hover:bg-slate-50/80 transition-colors">
                      {/* Yazılım Adı */}
                      <td className="py-3.5 px-4 font-bold text-[#1E2534]">
                        {sw.name}
                        {sw.notes && (
                          <span className="block text-[11px] font-normal text-slate-400 truncate max-w-xs mt-0.5">
                            {sw.notes}
                          </span>
                        )}
                      </td>

                      {/* Lisans Key */}
                      <td className="py-3.5 px-4">
                        <code className="font-mono text-[11px] font-bold text-slate-700 bg-slate-100 px-2 py-1 rounded border border-slate-200/70 select-all inline-block">
                          {sw.licenseKey}
                        </code>
                      </td>

                      {/* Başlangıç */}
                      <td className="py-3.5 px-4 text-slate-600 font-medium whitespace-nowrap">
                        {formatDate(sw.startDate)}
                      </td>

                      {/* Bitiş */}
                      <td className="py-3.5 px-4 text-slate-600 font-medium whitespace-nowrap">
                        {formatDate(sw.endDate)}
                      </td>

                      {/* Atanan Cihaz */}
                      <td className="py-3.5 px-4">
                        {sw.assignedHardware ? (
                          <div className="flex items-center gap-1.5 text-[#1E2534] font-semibold">
                            <Laptop className="w-3.5 h-3.5 text-[#4F8FE0] shrink-0" />
                            <span>
                              {sw.assignedHardware.brand} {sw.assignedHardware.model}{' '}
                              <span className="text-slate-400 font-mono text-[11px]">
                                ({sw.assignedHardware.demirbasNo})
                              </span>
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-400 font-medium">-</span>
                        )}
                      </td>

                      {/* Kalan Gün Rozeti */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {getRemainingDaysBadge(sw.daysRemaining)}
                      </td>

                      {/* İşlemler */}
                      {canManage && (
                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => setEditingSoftware(sw)}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-[#4F8FE0] hover:bg-[#EAF2FC] transition-colors cursor-pointer"
                              title="Düzenle"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setDeletingSoftwareId(sw.id)}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                              title="Sil"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobil Kart Görünümü (Visible only on small screens) */}
          <div className="block md:hidden space-y-4">
            {items.map((sw) => (
              <div
                key={sw.id}
                className="bg-white p-4 rounded-2xl border border-[#E2E8F0] shadow-xs space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-heading text-sm font-bold text-[#1E2534]">{sw.name}</h3>
                    {sw.notes && <p className="text-xs text-slate-400 mt-0.5">{sw.notes}</p>}
                  </div>
                  {getRemainingDaysBadge(sw.daysRemaining)}
                </div>

                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/60 font-mono text-xs text-slate-700 select-all break-all">
                  {sw.licenseKey}
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 border-t border-slate-100 pt-2.5">
                  <div>
                    <span className="text-[10px] text-slate-400 block font-bold uppercase">Başlangıç</span>
                    {formatDate(sw.startDate)}
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block font-bold uppercase">Bitiş</span>
                    {formatDate(sw.endDate)}
                  </div>
                </div>

                {sw.assignedHardware && (
                  <div className="text-xs text-slate-600 flex items-center gap-1.5 bg-blue-50/50 p-2 rounded-xl border border-blue-100">
                    <Laptop className="w-3.5 h-3.5 text-[#4F8FE0] shrink-0" />
                    <span>
                      {sw.assignedHardware.brand} {sw.assignedHardware.model}{' '}
                      <span className="font-mono text-slate-500">({sw.assignedHardware.demirbasNo})</span>
                    </span>
                  </div>
                )}

                {canManage && (
                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                    <button
                      onClick={() => setEditingSoftware(sw)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-[#4F8FE0] bg-blue-50 hover:bg-blue-100 transition-colors"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      Düzenle
                    </button>
                    <button
                      onClick={() => setDeletingSoftwareId(sw.id)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Sil
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between bg-white px-4 py-3 rounded-2xl border border-[#E2E8F0] shadow-sm text-xs font-semibold">
          <div className="text-slate-500">
            Sayfa <span className="text-[#1E2534] font-bold">{page}</span> / {totalPages} (Toplam{' '}
            {totalCount} kayıt)
          </div>

          <div className="flex items-center gap-2">
            <button
              disabled={page === 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
              Önceki
            </button>
            <button
              disabled={page === totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Sonraki
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Modals */}
      {isAddModalOpen && (
        <AddSoftwareModal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          onSuccess={() => {
            setIsAddModalOpen(false);
            setPage(1);
            fetchSoftware();
          }}
        />
      )}

      {editingSoftware && (
        <EditSoftwareModal
          isOpen={!!editingSoftware}
          software={editingSoftware}
          onClose={() => setEditingSoftware(null)}
          onSuccess={() => {
            setEditingSoftware(null);
            fetchSoftware();
          }}
        />
      )}

      {deletingSoftwareId && (
        <ConfirmModal
          isOpen={!!deletingSoftwareId}
          onClose={() => setDeletingSoftwareId(null)}
          onConfirm={handleDeleteConfirm}
          title="Yazılım Lisansını Sil"
          message="Bu yazılım lisans kaydını silmek istediğinizden emin misiniz? Bu işlem geri alınamaz."
          confirmText="Evet, Sil"
          isDanger={true}
          isLoading={isDeleting}
        />
      )}
    </div>
  );
}
