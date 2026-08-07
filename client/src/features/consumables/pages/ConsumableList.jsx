import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Plus,
  Search,
  PlusCircle,
  History,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Download,
  FileSpreadsheet,
} from 'lucide-react';
import useAuthStore from '../../../store/authStore';
import EmptyState from '../../../components/common/EmptyState';
import ConfirmModal from '../../../components/common/ConfirmModal';
import AddConsumableModal from '../components/AddConsumableModal';
import RestockConsumableModal from '../components/RestockConsumableModal';
import ConsumableHistoryModal from '../components/ConsumableHistoryModal';
import ExcelImportModal from '../../../components/common/ExcelImportModal';

export default function ConsumableList() {
  const [searchParams] = useSearchParams();
  const consumableIdParam = searchParams.get('consumableId') || searchParams.get('id');

  const token = useAuthStore((state) => state.accessToken);
  const user = useAuthStore((state) => state.user);

  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState(['Tümü']);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Tümü');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedConsumable, setSelectedConsumable] = useState(null);
  const [isRestockModalOpen, setIsRestockModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  const canEdit = user?.role === 'admin' || user?.role === 'it_staff';

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    if (consumableIdParam && token) {
      const fetchTarget = async () => {
        try {
          const res = await fetch(`http://localhost:5000/api/consumables/${consumableIdParam}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          const data = await res.json();
          if (res.ok && data.data) {
            setSelectedConsumable(data.data);
            setIsRestockModalOpen(true);
          }
        } catch (err) {
          console.error('Sarf malzeme detayı alınamadı:', err);
        }
      };
      fetchTarget();
    }
  }, [consumableIdParam, token]);

  const fetchCategories = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/categories?parentType=Sarf Malzeme', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok && data.data) {
        const catNames = data.data.map((c) => c.name);
        setCategories(['Tümü', ...catNames]);
      }
    } catch (err) {
      console.error('Sarf malzeme kategorileri alınamadı:', err);
    }
  };

  const fetchConsumables = async () => {
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

      const res = await fetch(`http://localhost:5000/api/consumables?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.message || 'Sarf malzemeler listelenirken hata oluştu.');

      setItems(data.data || []);
      if (data.pagination) {
        setTotalPages(data.pagination.totalPages || 1);
        setTotalCount(data.pagination.totalCount || 0);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConsumables();
  }, [page, selectedCategory]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchConsumables();
  };

  const handleDeleteConfirmed = async () => {
    if (!canEdit || !selectedConsumable) return;
    setDeleting(true);
    try {
      const res = await fetch(`http://localhost:5000/api/consumables/${selectedConsumable.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Sarf malzeme silinemedi.');

      setIsDeleteConfirmOpen(false);
      setSelectedConsumable(null);
      fetchConsumables();
    } catch (err) {
      alert(err.message);
    } finally {
      setDeleting(false);
    }
  };

  const exportToCSV = () => {
    if (!items.length) return;
    const headers = [
      'Sarf Malzeme Adı',
      'Kategori',
      'Üretici',
      'Tedarikçi',
      'Lokasyon',
      'Hazır Stok',
      'Tüketilen Miktar',
      'Toplam Stok',
    ];
    const rows = items.map((i) => [
      i.name,
      i.category,
      i.manufacturer || '',
      i.supplier || '',
      i.location || '',
      i.availableQuantity,
      i.consumedQuantity,
      i.totalQuantity,
    ]);
    const csvContent =
      'data:text/csv;charset=utf-8,\uFEFF' +
      [headers.join(','), ...rows.map((e) => e.map((x) => `"${x}"`).join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `DITAS_Sarf_Malzeme_Stok_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">
            DİTAŞ Otomotiv • Sarf Malzeme Yönetimi
          </span>
          <h1 className="text-2xl font-bold font-heading text-[#1E2534]">
            Sarf Malzeme Stok Listesi
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Kağıt, toner, kablo ve fabrika genelinde kullanılan sarf malzemelerin stok takibi.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={exportToCSV}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-slate-300 text-slate-700 bg-white hover:bg-slate-50 text-xs font-medium transition cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            Dışa Aktar (CSV)
          </button>

          {canEdit && (
            <button
              onClick={() => setIsImportModalOpen(true)}
              className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl border border-emerald-500 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-xs font-bold transition cursor-pointer shadow-xs"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              Excel'den Aktar
            </button>
          )}

          {canEdit && (
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#4F8FE0] hover:bg-[#3D75C4] text-white text-xs font-bold transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Yeni Sarf Malzeme Ekle
            </button>
          )}
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-3">
        <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Sarf malzeme adı veya üretici ara..."
              className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 text-xs text-[#1E2534] focus:border-[#4F8FE0]"
            />
          </div>

          <button
            type="submit"
            className="px-4 py-2 rounded-xl bg-[#1E2534] hover:bg-slate-800 text-white text-xs font-bold transition cursor-pointer"
          >
            Filtrele
          </button>
        </form>

        {/* Dynamic Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs no-scrollbar">
          {categories.map((cat) => {
            const isActive = selectedCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => {
                  setSelectedCategory(cat);
                  setPage(1);
                }}
                className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition cursor-pointer ${
                  isActive
                    ? 'bg-[#4F8FE0] text-white font-bold'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>
      </div>

      {/* Table Section */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-xs text-slate-400">Yükleniyor...</div>
        ) : error ? (
          <div className="p-4 text-xs text-rose-600 font-medium">{error}</div>
        ) : items.length === 0 ? (
          <EmptyState
            title="Kayıtlı Sarf Malzeme Bulunamadı"
            description="Seçilen kriterlere uygun sarf malzeme stoğu bulunamadı."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3.5 px-4">Ürün Adı</th>
                  <th className="py-3.5 px-4">Kategori</th>
                  <th className="py-3.5 px-4">Üretici</th>
                  <th className="py-3.5 px-4">Tedarikçi</th>
                  <th className="py-3.5 px-4">Lokasyon</th>
                  <th className="py-3.5 px-4 text-center">Hazır Stok</th>
                  <th className="py-3.5 px-4 text-center">Tüketilen</th>
                  <th className="py-3.5 px-4 text-center">Toplam</th>
                  <th className="py-3.5 px-4 text-right">İşlemler</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {items.map((item) => {
                  const isDeletable = canEdit && item.consumedQuantity === 0;

                  return (
                    <tr key={item.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-3 px-4">
                        <div className="font-bold text-[#1E2534]">{item.name}</div>
                      </td>

                      <td className="py-3 px-4">
                        <span className="inline-block px-2.5 py-1 rounded bg-slate-100 text-slate-700 font-medium">
                          {item.category}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-slate-700">{item.manufacturer || '-'}</td>
                      <td className="py-3 px-4 text-slate-700">{item.supplier || '-'}</td>
                      <td className="py-3 px-4 text-slate-700">{item.location || '-'}</td>

                      <td className="py-3 px-4 text-center">
                        <span className="font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                          {item.availableQuantity}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-center">
                        <span className="font-mono font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                          {item.consumedQuantity}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-center font-mono font-bold text-[#1E2534]">
                        {item.totalQuantity}
                      </td>

                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="inline-flex items-center justify-end gap-1">
                          {canEdit && (
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedConsumable(item);
                                setIsRestockModalOpen(true);
                              }}
                              className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-slate-100 rounded transition cursor-pointer"
                              title="Stok Ekle"
                            >
                              <PlusCircle className="w-4 h-4" />
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => {
                              setSelectedConsumable(item);
                              setIsHistoryModalOpen(true);
                            }}
                            className="p-1.5 text-slate-400 hover:text-[#4F8FE0] hover:bg-slate-100 rounded transition cursor-pointer"
                            title="Hareket Geçmişi"
                          >
                            <History className="w-4 h-4" />
                          </button>

                          {canEdit && (
                            <button
                              type="button"
                              disabled={!isDeletable}
                              onClick={() => {
                                if (!isDeletable) return;
                                setSelectedConsumable(item);
                                setIsDeleteConfirmOpen(true);
                              }}
                              className={`p-1.5 rounded transition ${
                                isDeletable
                                  ? 'text-slate-400 hover:text-rose-600 hover:bg-slate-100 cursor-pointer'
                                  : 'text-slate-200 cursor-not-allowed'
                              }`}
                              title={
                                isDeletable
                                  ? 'Sarf Malzemeyi Sil'
                                  : 'Tüketilmiş stoğu bulunan malzeme silinemez'
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
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-slate-200 flex items-center justify-between text-xs">
            <span className="text-slate-500">
              Toplam {totalCount} kayıttan {((page - 1) * 10) + 1} - {Math.min(page * 10, totalCount)} arası gösteriliyor
            </span>

            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="p-1.5 rounded-lg border border-slate-200 disabled:opacity-40 hover:bg-slate-50 transition cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4 text-slate-600" />
              </button>
              <span className="font-semibold text-slate-700">
                Sayfa {page} / {totalPages}
              </span>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="p-1.5 rounded-lg border border-slate-200 disabled:opacity-40 hover:bg-slate-50 transition cursor-pointer"
              >
                <ChevronRight className="w-4 h-4 text-slate-600" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      <AddConsumableModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={() => {
          setIsAddModalOpen(false);
          fetchConsumables();
        }}
      />

      {selectedConsumable && (
        <>
          <RestockConsumableModal
            isOpen={isRestockModalOpen}
            onClose={() => {
              setIsRestockModalOpen(false);
              setSelectedConsumable(null);
            }}
            consumable={selectedConsumable}
            onSuccess={fetchConsumables}
          />

          <ConsumableHistoryModal
            isOpen={isHistoryModalOpen}
            onClose={() => {
              setIsHistoryModalOpen(false);
              setSelectedConsumable(null);
            }}
            consumableId={selectedConsumable.id}
            consumableName={selectedConsumable.name}
          />

          <ConfirmModal
            isOpen={isDeleteConfirmOpen}
            title="Sarf Malzemeyi Sil"
            message={`"${selectedConsumable.name}" kaydını silmek istediğinize emin misiniz?`}
            confirmText={deleting ? 'Siliniyor...' : 'Evet, Sil'}
            confirmVariant="danger"
            onConfirm={handleDeleteConfirmed}
            onCancel={() => {
              setIsDeleteConfirmOpen(false);
              setSelectedConsumable(null);
            }}
          />
        </>
      )}

      <ExcelImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        moduleKey="consumable"
        moduleTitle="Sarf Malzemeler"
        onSuccess={fetchConsumables}
      />
    </div>
  );
}
