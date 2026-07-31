import React, { useEffect, useState } from 'react';
import {
  Package,
  Plus,
  Search,
  PlusCircle,
  AlertTriangle,
  History,
  Trash2,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  TrendingDown,
} from 'lucide-react';
import useAuthStore from '../../../store/authStore';
import EmptyState from '../../../components/common/EmptyState';
import ConfirmModal from '../../../components/common/ConfirmModal';
import AddAccessoryModal from '../components/AddAccessoryModal';
import RestockAccessoryModal from '../components/RestockAccessoryModal';
import MarkDefectiveModal from '../components/MarkDefectiveModal';
import AccessoryHistoryModal from '../components/AccessoryHistoryModal';

const CATEGORIES = [
  'Tümü',
  'Mouse',
  'Klavye',
  'Kulaklık',
  'Kamera',
  'Depolama Birimi',
  'Diğer',
];

export default function AccessoryList() {
  const token = useAuthStore((state) => state.accessToken);
  const user = useAuthStore((state) => state.user);

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filtering & Pagination States
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Tümü');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedAccessory, setSelectedAccessory] = useState(null);
  const [isRestockModalOpen, setIsRestockModalOpen] = useState(false);
  const [isMarkDefectiveModalOpen, setIsMarkDefectiveModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const canEdit = user?.role === 'admin' || user?.role === 'it_staff';

  const fetchAccessories = async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      params.append('page', page);

      if (selectedCategory !== 'Tümü') {
        params.append('category', selectedCategory);
      }
      if (searchQuery.trim()) {
        params.append('q', searchQuery.trim());
      }

      const res = await fetch(`http://localhost:5000/api/accessories?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.message || 'Aksesuarlar listelenirken hata oluştu.');

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
    fetchAccessories();
  }, [page, selectedCategory]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchAccessories();
  };

  const handleDeleteConfirmed = async () => {
    if (!canEdit || !selectedAccessory) return;
    setDeleting(true);
    try {
      const res = await fetch(`http://localhost:5000/api/accessories/${selectedAccessory.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Aksesuar silinemedi.');

      setIsDeleteConfirmOpen(false);
      setSelectedAccessory(null);
      fetchAccessories();
    } catch (err) {
      alert(err.message);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-xl sm:text-2xl font-bold text-[#1E2534] tracking-tight">
            Aksesuar Stok Yönetimi
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Mouse, klavye, kulaklık ve diğer çevre birimlerinin adetli stok takibi.
          </p>
        </div>

        {canEdit && (
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#4F8FE0] hover:bg-[#3D75C4] active:bg-[#3566AD] text-white text-xs sm:text-sm font-bold shadow-xs transition-all cursor-pointer shrink-0 self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            Yeni Aksesuar Ekle
          </button>
        )}
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-[#E2E8F0] shadow-sm space-y-3">
        <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Aksesuar adı veya marka ara..."
              className="w-full pl-10 pr-4 py-2 rounded-xl border border-[#E2E8F0] text-xs font-medium text-[#1E2534] placeholder-slate-400 focus:outline-hidden focus:border-[#4F8FE0] focus:ring-1 focus:ring-[#4F8FE0]"
            />
          </div>

          <button
            type="submit"
            className="px-4 py-2 rounded-xl bg-[#1E2534] hover:bg-slate-800 text-white text-xs font-bold transition-colors cursor-pointer"
          >
            Ara
          </button>
        </form>

        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs no-scrollbar">
          {CATEGORIES.map((cat) => {
            const isActive = selectedCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => {
                  setSelectedCategory(cat);
                  setPage(1);
                }}
                className={`px-3 py-1.5 rounded-lg font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  isActive
                    ? 'bg-[#4F8FE0] text-white shadow-2xs'
                    : 'bg-[#F0F4F8] text-slate-600 hover:text-slate-900 hover:bg-slate-200/70'
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Table Content */}
      {loading ? (
        <div className="py-20 text-center text-xs text-slate-400 font-medium">
          Aksesuar stoku yükleniyor...
        </div>
      ) : error ? (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-medium">
          {error}
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          icon={Package}
          title="Aksesuar Bulunamadı"
          description="Aradığınız kriterlere uygun aksesuar kaydı bulunmamaktadır."
        />
      ) : (
        <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#1E2534] text-white text-xs uppercase tracking-wider font-heading">
                  <th className="py-3.5 px-4 font-bold">Aksesuar / Ürün Adı</th>
                  <th className="py-3.5 px-4 font-bold">Kategori</th>
                  <th className="py-3.5 px-4 font-bold">Marka</th>
                  <th className="py-3.5 px-4 font-bold text-center">Hazır Stok</th>
                  <th className="py-3.5 px-4 font-bold text-center">Zimmetli</th>
                  <th className="py-3.5 px-4 font-bold text-center">Kullanım Dışı</th>
                  <th className="py-3.5 px-4 font-bold text-center">Toplam</th>
                  <th className="py-3.5 px-4 font-bold text-right">İşlemler</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {items.map((acc) => {
                  const isLowStock =
                    acc.minThreshold !== null &&
                    acc.minThreshold !== undefined &&
                    acc.availableQuantity <= acc.minThreshold;

                  const isDeletable = acc.assignedQuantity === 0 && acc.outOfUseQuantity === 0;

                  return (
                    <tr key={acc.id} className="hover:bg-slate-50/80 transition-colors">
                      {/* Ürün Adı & Düşük Stok Uyarısı */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-[#1E2534]">{acc.name}</span>
                          {isLowStock && (
                            <span
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 shrink-0"
                              title={`Hazır stok (${acc.availableQuantity}) minimum eşik değerinin (${acc.minThreshold}) altında!`}
                            >
                              <TrendingDown className="w-3 h-3 text-amber-600" />
                              Stok Azaldı
                            </span>
                          )}
                        </div>
                        {acc.notes && <p className="text-[11px] text-slate-400 truncate max-w-xs mt-0.5">{acc.notes}</p>}
                      </td>

                      {/* Kategori */}
                      <td className="py-3.5 px-4 text-slate-600 font-medium">{acc.category}</td>

                      {/* Marka */}
                      <td className="py-3.5 px-4 font-semibold text-slate-700">{acc.brand || '-'}</td>

                      {/* Hazır Stok (Yeşil Rozet) */}
                      <td className="py-3.5 px-4 text-center">
                        <span className="inline-flex items-center justify-center min-w-8 px-2 py-0.5 rounded-full text-xs font-mono font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          {acc.availableQuantity}
                        </span>
                      </td>

                      {/* Zimmetli (Mavi Rozet) */}
                      <td className="py-3.5 px-4 text-center">
                        <span className="inline-flex items-center justify-center min-w-8 px-2 py-0.5 rounded-full text-xs font-mono font-bold bg-blue-50 text-blue-700 border border-blue-200">
                          {acc.assignedQuantity}
                        </span>
                      </td>

                      {/* Kullanım Dışı (Turuncu Rozet) */}
                      <td className="py-3.5 px-4 text-center">
                        <span className="inline-flex items-center justify-center min-w-8 px-2 py-0.5 rounded-full text-xs font-mono font-bold bg-amber-50 text-amber-700 border border-amber-200">
                          {acc.outOfUseQuantity}
                        </span>
                      </td>

                      {/* Toplam Stok */}
                      <td className="py-3.5 px-4 text-center font-mono font-bold text-[#1E2534]">
                        {acc.totalQuantity}
                      </td>

                      {/* İşlem Butonları */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {canEdit && (
                            <>
                              {/* Stok Ekle */}
                              <button
                                onClick={() => {
                                  setSelectedAccessory(acc);
                                  setIsRestockModalOpen(true);
                                }}
                                className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 transition-colors cursor-pointer"
                                title="Stok Ekle (+)"
                              >
                                <PlusCircle className="w-4 h-4" />
                              </button>

                              {/* Arızalı Ayır */}
                              <button
                                onClick={() => {
                                  setSelectedAccessory(acc);
                                  setIsMarkDefectiveModalOpen(true);
                                }}
                                className="p-1.5 rounded-lg text-amber-600 hover:bg-amber-50 transition-colors cursor-pointer"
                                title="Arızalı / Kullanım Dışı Ayır"
                              >
                                <AlertTriangle className="w-4 h-4" />
                              </button>
                            </>
                          )}

                          {/* Stok Geçmişi (Tüm Roller) */}
                          <button
                            onClick={() => {
                              setSelectedAccessory(acc);
                              setIsHistoryModalOpen(true);
                            }}
                            className="p-1.5 rounded-lg text-[#4F8FE0] hover:bg-[#EAF2FC] transition-colors cursor-pointer"
                            title="Stok Hareket Geçmişi"
                          >
                            <History className="w-4 h-4" />
                          </button>

                          {/* Silme (Admin & IT Staff - Sadece Zimmetsiz ve Arızasız) */}
                          {canEdit && (
                            <button
                              disabled={!isDeletable}
                              onClick={() => {
                                setSelectedAccessory(acc);
                                setIsDeleteConfirmOpen(true);
                              }}
                              className={`p-1.5 rounded-lg transition-colors ${
                                isDeletable
                                  ? 'text-rose-600 hover:bg-rose-50 cursor-pointer'
                                  : 'text-slate-300 cursor-not-allowed'
                              }`}
                              title={
                                isDeletable
                                  ? 'Aksesuar Türünü Sil'
                                  : 'Zimmetli veya arızalı adeti bulunan aksesuar silinemez'
                              }
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between bg-white px-4 py-3 rounded-2xl border border-[#E2E8F0] shadow-sm text-xs font-semibold">
          <div className="text-slate-500">
            Sayfa <span className="text-[#1E2534] font-bold">{page}</span> / {totalPages} (Toplam{' '}
            {totalCount} aksesuar türü)
          </div>

          <div className="flex items-center gap-2">
            <button
              disabled={page === 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" /> Önceki
            </button>

            <button
              disabled={page === totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              Sonraki <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Add Accessory Modal */}
      <AddAccessoryModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={() => {
          setIsAddModalOpen(false);
          fetchAccessories();
        }}
      />

      {/* Restock Modal */}
      <RestockAccessoryModal
        isOpen={isRestockModalOpen}
        onClose={() => {
          setIsRestockModalOpen(false);
          setSelectedAccessory(null);
        }}
        accessory={selectedAccessory}
        onSuccess={() => {
          setIsRestockModalOpen(false);
          setSelectedAccessory(null);
          fetchAccessories();
        }}
      />

      {/* Mark Defective Modal */}
      <MarkDefectiveModal
        isOpen={isMarkDefectiveModalOpen}
        onClose={() => {
          setIsMarkDefectiveModalOpen(false);
          setSelectedAccessory(null);
        }}
        accessory={selectedAccessory}
        onSuccess={() => {
          setIsMarkDefectiveModalOpen(false);
          setSelectedAccessory(null);
          fetchAccessories();
        }}
      />

      {/* History Modal */}
      <AccessoryHistoryModal
        isOpen={isHistoryModalOpen}
        onClose={() => {
          setIsHistoryModalOpen(false);
          setSelectedAccessory(null);
        }}
        accessoryId={selectedAccessory?.id}
        accessoryName={selectedAccessory?.name}
      />

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={isDeleteConfirmOpen}
        title="Aksesuar Türünü Sil"
        message={`"${selectedAccessory?.name}" adlı aksesuar kaydını tamamen silmek istediğinize emin misiniz? Bu işlem geri alanamaz.`}
        confirmText={deleting ? 'Siliniyor...' : 'Evet, Sil'}
        confirmVariant="danger"
        onConfirm={handleDeleteConfirmed}
        onCancel={() => {
          setIsDeleteConfirmOpen(false);
          setSelectedAccessory(null);
        }}
      />
    </div>
  );
}
