import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Plus,
  Search,
  History,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Download,
  FileSpreadsheet,
  Edit,
} from 'lucide-react';
import useAuthStore from '../../../store/authStore';
import { hasPermission } from '../../../utils/permissions';
import EmptyState from '../../../components/common/EmptyState';
import ConfirmModal from '../../../components/common/ConfirmModal';
import AddAccessoryModal from '../components/AddAccessoryModal';
import EditAccessoryModal from '../components/EditAccessoryModal';
import AccessoryDetailManageModal from '../components/AccessoryDetailManageModal';
import ExcelImportModal from '../../../components/common/ExcelImportModal';
import ExcelExportButton from '../../../components/common/ExcelExportButton';
import { API_BASE_URL } from '../../../config';


export default function AccessoryList() {
  const [searchParams] = useSearchParams();
  const accessoryIdParam = searchParams.get('accessoryId') || searchParams.get('id');

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
  const [editingAccessory, setEditingAccessory] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedAccessory, setSelectedAccessory] = useState(null);
  const [isManageModalOpen, setIsManageModalOpen] = useState(false);
  const [manageModalInitialTab, setManageModalInitialTab] = useState('restock');
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  const [stats, setStats] = useState({ totalProducts: 0, outOfStock: 0, totalAssignedQuantity: 0 });

  const canEdit = hasPermission(user, 'accessories:manage');
  const canExcel = hasPermission(user, 'excel:view');

  useEffect(() => {
    fetchCategories();
    fetchStats();
  }, []);

  useEffect(() => {
    if (accessoryIdParam && token) {
      const fetchTarget = async () => {
        try {
          const res = await fetch(`${API_BASE_URL}/accessories/${accessoryIdParam}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          const data = await res.json();
          if (res.ok && data.data) {
            setSelectedAccessory(data.data);
            setManageModalInitialTab('restock');
            setIsManageModalOpen(true);
          }
        } catch (err) {
          console.error('Aksesuar detayı alınamadı:', err);
        }
      };
      fetchTarget();
    }
  }, [accessoryIdParam, token]);

  const fetchStats = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/accessories/stats`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok && data.data) {
        setStats(data.data);
      }
    } catch (err) {
      console.error('Aksesuar istatistikleri alınamadı:', err);
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/categories?parentType=Aksesuar`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok && data.data) {
        const catNames = data.data.map((c) => c.name);
        setCategories(['Tümü', ...catNames]);
      }
    } catch (err) {
      console.error('Aksesuar kategorileri alınamadı:', err);
    }
  };

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

      const res = await fetch(`${API_BASE_URL}/accessories?${params.toString()}`, {
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
      const res = await fetch(`${API_BASE_URL}/accessories/${selectedAccessory.id}`, {
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
      setIsDeleteConfirmOpen(false);
      setSelectedAccessory(null);
    } finally {
      setDeleting(false);
    }
  };

  const exportToCSV = () => {
    if (!items.length) return;
    const headers = [
      'Ürün Adı',
      'Kategori',
      'Marka',
      'Tedarikçi',
      'Toplam Stok',
      'Hazır Stok',
      'Zimmetli',
      'Kullanım Dışı',
    ];
    const rows = items.map((i) => [
      i.name,
      i.category,
      i.brand || '',
      i.supplier || '',
      i.totalQuantity,
      i.availableQuantity,
      i.assignedQuantity,
      i.outOfUseQuantity,
    ]);
    const csvContent =
      'data:text/csv;charset=utf-8,\uFEFF' +
      [headers.join(','), ...rows.map((e) => e.map((x) => `"${x}"`).join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `DITAS_Aksesuar_Stok_${new Date().toISOString().slice(0, 10)}.csv`);
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
            Aksesuar Yönetimi
          </span>
          <h1 className="text-2xl font-bold font-heading text-[#1E2534]">
            Aksesuar Stok Listesi
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Mouse, klavye, kulaklık ve diğer çevre birimlerinin miktar bazlı stok takibi.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <ExcelExportButton
            modulePath="accessories"
            queryParams={{
              category: selectedCategory,
              q: searchQuery,
            }}
            fileNamePrefix="aksesuar"
          />

          {canExcel && (
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
              Yeni Aksesuar Ekle
            </button>
          )}
        </div>

      </div>

      {/* Accessory Statistics Summary Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Toplam Ürün Çeşidi */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 border-l-4 border-l-[#4C82F7] shadow-xs flex flex-col justify-between">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">
            Toplam Ürün Çeşidi
          </span>
          <div className="text-2xl font-bold font-heading text-[#1E2534]">
            {stats.totalProducts}
          </div>
        </div>

        {/* Stokta Tükenen */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 border-l-4 border-l-[#F59E0B] shadow-xs flex flex-col justify-between">
          <span className="text-xs font-bold text-[#F59E0B] uppercase tracking-wider block mb-1">
            Stokta Tükenen
          </span>
          <div className="text-2xl font-bold font-heading text-[#F59E0B]">
            {stats.outOfStock}
          </div>
        </div>

        {/* Toplam Zimmetli Adet */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 border-l-4 border-l-[#4C82F7] shadow-xs flex flex-col justify-between">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">
            Toplam Zimmetli Adet
          </span>
          <div className="text-2xl font-bold font-heading text-[#4C82F7]">
            {stats.totalAssignedQuantity}
          </div>
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
              placeholder="Aksesuar ürün adı veya marka ara..."
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
            title="Kayıtlı Aksesuar Bulunamadı"
            description="Seçilen kriterlere uygun aksesuar stoğu bulunamadı."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3.5 px-4">Aksesuar Ürün Adı</th>
                  <th className="py-3.5 px-4">Kategori</th>
                  <th className="py-3.5 px-4">Marka</th>
                  <th className="py-3.5 px-4 text-center">Toplam Stok</th>
                  <th className="py-3.5 px-4 text-center">Hazır Stok</th>
                  <th className="py-3.5 px-4 text-center">Zimmetli</th>
                  <th className="py-3.5 px-4 text-center">Kullanım Dışı</th>
                  <th className="py-3.5 px-4 text-right">İşlemler</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {items.map((item) => {
                  const isLowStock =
                    item.minThreshold !== null &&
                    item.minThreshold !== undefined &&
                    item.availableQuantity <= item.minThreshold;

                  const isDeletable =
                    canEdit && item.assignedQuantity === 0 && item.outOfUseQuantity === 0;

                  return (
                    <tr key={item.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-3 px-4">
                        <div className="font-bold text-[#1E2534]">{item.name}</div>
                        {isLowStock && (
                          <div className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-600 mt-0.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                            Kritik Stok Uyarısı (&le; {item.minThreshold})
                          </div>
                        )}
                        {item.notes && (
                          <div className="text-[11px] text-slate-500 italic mt-0.5 truncate max-w-[200px]" title={item.notes}>
                            Not: {item.notes}
                          </div>
                        )}
                      </td>

                      <td className="py-3 px-4">
                        <span className="inline-block px-2.5 py-1 rounded bg-slate-100 text-slate-700 font-medium">
                          {item.category}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-slate-700">{item.brand || '-'}</td>

                      <td className="py-3 px-4 text-center font-mono font-bold text-[#1E2534]">
                        {item.totalQuantity}
                      </td>

                      <td className="py-3 px-4 text-center">
                        <span className="font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                          {item.availableQuantity}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-center font-mono text-slate-600">
                        {item.assignedQuantity}
                      </td>

                      <td className="py-3 px-4 text-center font-mono text-slate-500">
                        {item.outOfUseQuantity}
                      </td>

                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="inline-flex items-center justify-end gap-1">
                          {canEdit && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingAccessory(item);
                                setIsEditModalOpen(true);
                              }}
                              className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-slate-100 rounded transition cursor-pointer"
                              title="Düzenle"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedAccessory(item);
                              setManageModalInitialTab('history');
                              setIsManageModalOpen(true);
                            }}
                            className="p-1.5 text-slate-400 hover:text-[#4F8FE0] hover:bg-slate-100 rounded transition cursor-pointer"
                            title="Yönetim & Hareket Geçmişi"
                          >
                            <History className="w-4 h-4" />
                          </button>

                          {canEdit && (
                            <button
                              type="button"
                              disabled={!isDeletable}
                              onClick={() => {
                                if (!isDeletable) return;
                                setSelectedAccessory(item);
                                setIsDeleteConfirmOpen(true);
                              }}
                              className={`p-1.5 rounded transition ${
                                isDeletable
                                  ? 'text-slate-400 hover:text-rose-600 hover:bg-slate-100 cursor-pointer'
                                  : 'text-slate-200 cursor-not-allowed'
                              }`}
                              title={
                                isDeletable
                                  ? 'Aksesuarı Sil'
                                  : 'Zimmetli veya kullanım dışı stoğu bulunan aksesuar silinemez'
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
      <AddAccessoryModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={() => {
          setIsAddModalOpen(false);
          fetchAccessories();
          fetchStats();
        }}
      />

      {selectedAccessory && (
        <>
          <AccessoryDetailManageModal
            isOpen={isManageModalOpen}
            onClose={() => {
              setIsManageModalOpen(false);
              setSelectedAccessory(null);
            }}
            accessory={selectedAccessory}
            initialTab={manageModalInitialTab}
            onSuccess={() => {
              fetchAccessories();
              fetchStats();
            }}
          />

          <ConfirmModal
            isOpen={isDeleteConfirmOpen}
            title="Aksesuarı Sil"
            message={`"${selectedAccessory.name}" aksesuar türünü silmek istediğinize emin misiniz?`}
            confirmText={deleting ? 'Siliniyor...' : 'Evet, Sil'}
            confirmVariant="danger"
            onConfirm={handleDeleteConfirmed}
            onCancel={() => {
              setIsDeleteConfirmOpen(false);
              setSelectedAccessory(null);
            }}
          />
        </>
      )}

      <ExcelImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        moduleKey="accessory"
        moduleTitle="Aksesuarlar"
        onSuccess={fetchAccessories}
      />

      <EditAccessoryModal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setEditingAccessory(null);
        }}
        accessory={editingAccessory}
        onSuccess={() => {
          fetchAccessories();
          fetchStats();
        }}
      />
    </div>
  );
}
