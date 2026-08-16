import React, { useEffect, useState } from 'react';
import {
  FolderTree,
  Plus,
  Edit2,
  Trash2,
  Monitor,
  Headphones,
  Package,
  Cpu,
  Key,
  ChevronRight,
  ChevronDown,
  Layers,
  AlertCircle,
  CheckCircle2,
  X,
} from 'lucide-react';
import useAuthStore from '../../../store/authStore';
import EmptyState from '../../../components/common/EmptyState';
import ConfirmModal from '../../../components/common/ConfirmModal';

const PARENT_TYPES = [
  {
    id: 'Varlık',
    label: 'Varlık (Hardware)',
    icon: Monitor,
    color: 'text-blue-600 bg-blue-50 border-blue-200',
    description: 'Bilgisayar, sunucu, monitör, yazıcı vb. donanım varlık kategorileri.',
  },
  {
    id: 'Aksesuar',
    label: 'Aksesuar',
    icon: Headphones,
    color: 'text-purple-600 bg-purple-50 border-purple-200',
    description: 'Mouse, klavye, kulaklık, adaptör vb. çevre birimi kategorileri.',
  },
  {
    id: 'Sarf Malzeme',
    label: 'Sarf Malzeme',
    icon: Package,
    color: 'text-emerald-600 bg-emerald-50 border-emerald-200',
    description: 'Toner, kartuş, kağıt, kablo bağı vb. sarf malzeme kategorileri.',
  },
  {
    id: 'Bileşen',
    label: 'Donanım Bileşeni',
    icon: Cpu,
    color: 'text-amber-600 bg-amber-50 border-amber-200',
    description: 'RAM, SSD, HDD, ekran kartı vb. parça/bileşen kategorileri.',
  },
  {
    id: 'Lisans',
    label: 'Yazılım & Lisans',
    icon: Key,
    color: 'text-rose-600 bg-rose-50 border-rose-200',
    description: 'İşletim sistemi, ofis yazılımları, tasarım araçları vb. lisans kategorileri.',
  },
];

export default function CategorySettingsTab() {
  const token = useAuthStore((state) => state.accessToken);
  const user = useAuthStore((state) => state.user);

  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeParentType, setActiveParentType] = useState('Varlık');

  // Modal states for Create / Edit
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('create'); // 'create' | 'edit'
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [categoryNameInput, setCategoryNameInput] = useState('');
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState('');

  // Delete Confirm Modal states
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  const canEdit = user?.role === 'admin';

  const fetchCategories = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('http://localhost:5000/api/categories', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Kategoriler alınamadı.');
      setCategories(data.data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, [token]);

  // Open Create Modal
  const handleOpenCreateModal = (parentTypeId) => {
    setActiveParentType(parentTypeId);
    setModalMode('create');
    setSelectedCategory(null);
    setCategoryNameInput('');
    setModalError('');
    setIsModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEditModal = (cat) => {
    setModalMode('edit');
    setSelectedCategory(cat);
    setCategoryNameInput(cat.name);
    setModalError('');
    setIsModalOpen(true);
  };

  // Handle Form Submit (Create or Edit)
  const handleModalSubmit = async (e) => {
    e.preventDefault();
    if (!categoryNameInput.trim()) {
      setModalError('Lütfen kategori adı giriniz.');
      return;
    }

    setModalLoading(true);
    setModalError('');

    try {
      if (modalMode === 'create') {
        const res = await fetch('http://localhost:5000/api/categories', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            parentType: activeParentType,
            name: categoryNameInput.trim(),
          }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Kategori eklenemedi.');
      } else {
        const res = await fetch(`http://localhost:5000/api/categories/${selectedCategory.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            name: categoryNameInput.trim(),
          }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Kategori güncellenemedi.');
      }

      setIsModalOpen(false);
      setCategoryNameInput('');
      setSelectedCategory(null);
      fetchCategories();
    } catch (err) {
      setModalError(err.message);
    } finally {
      setModalLoading(false);
    }
  };

  // Open Delete Modal
  const handleOpenDeleteModal = (cat) => {
    setCategoryToDelete(cat);
    setDeleteError('');
    setIsDeleteOpen(true);
  };

  // Confirm Delete
  const handleConfirmDelete = async () => {
    if (!categoryToDelete) return;
    setDeleteLoading(true);
    setDeleteError('');

    try {
      const res = await fetch(`http://localhost:5000/api/categories/${categoryToDelete.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Kategori silinemedi.');
      }

      setIsDeleteOpen(false);
      setCategoryToDelete(null);
      fetchCategories();
    } catch (err) {
      setDeleteError(err.message);
    } finally {
      setDeleteLoading(false);
    }
  };

  const getFilteredCategories = (parentTypeId) => {
    return categories.filter((c) => c.parentType === parentTypeId);
  };

  return (
    <div className="space-y-6">
      {/* Header card inside settings */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold font-heading text-[#1E2534] flex items-center gap-2">
            <FolderTree className="w-5 h-5 text-[#4F8FE0]" />
            Kategori Yönetimi
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            5 ana varlık türünün alt kategorilerini ekleyin, güncelleyin veya silin.
          </p>
        </div>

        {canEdit && (
          <button
            type="button"
            onClick={() => handleOpenCreateModal(activeParentType)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#4F8FE0] hover:bg-[#3D75C4] text-white text-xs font-bold transition shadow-xs cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" />
            Yeni Alt Kategori Ekle
          </button>
        )}
      </div>

      {/* Global error banner if fetch failed */}
      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-700 font-medium flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
          {error}
        </div>
      )}

      {/* Main Tabs / Accordion for the 5 Parent Types */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
        {PARENT_TYPES.map((pt) => {
          const Icon = pt.icon;
          const isSelected = activeParentType === pt.id;
          const count = getFilteredCategories(pt.id).length;

          return (
            <button
              key={pt.id}
              type="button"
              onClick={() => setActiveParentType(pt.id)}
              className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                isSelected
                  ? 'bg-white border-[#4F8FE0] shadow-sm ring-2 ring-[#4F8FE0]/20'
                  : 'bg-white/80 border-slate-200 hover:border-slate-300 hover:bg-white'
              }`}
            >
              <div className="flex items-center justify-between gap-2 mb-2">
                <div
                  className={`w-8 h-8 rounded-xl flex items-center justify-center border ${pt.color}`}
                >
                  <Icon className="w-4 h-4" />
                </div>
                <span
                  className={`font-mono text-xs font-bold px-2 py-0.5 rounded-full ${
                    isSelected
                      ? 'bg-[#4F8FE0] text-white'
                      : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {count}
                </span>
              </div>
              <div>
                <div className="text-xs font-bold text-[#1E2534] leading-snug">
                  {pt.id}
                </div>
                <div className="text-[10px] text-slate-400 truncate">
                  Alt Kategoriler
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Selected Parent Type Category List Container */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        {/* Container Header */}
        <div className="px-6 py-4 bg-[#F5F4EF] border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Seçili Ana Tip:
            </span>
            <span className="text-xs font-extrabold text-[#1E2534] bg-white px-2.5 py-1 rounded-lg border border-slate-200 font-heading">
              {activeParentType}
            </span>
          </div>

          <span className="text-xs text-slate-500 font-medium">
            Toplam <strong>{getFilteredCategories(activeParentType).length}</strong> alt kategori
          </span>
        </div>

        {/* Categories Table / List */}
        {loading ? (
          <div className="py-16 text-center text-xs text-slate-400 font-medium">
            Kategoriler yükleniyor...
          </div>
        ) : getFilteredCategories(activeParentType).length === 0 ? (
          <div className="p-8">
            <EmptyState
              title={`Henüz ${activeParentType} Kategorisi Yok`}
              description={`Bu ana tipe ait alt kategori bulunamadı. "Yeni Alt Kategori Ekle" butonunu kullanarak ekleyebilirsiniz.`}
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3.5 px-6">Alt Kategori Adı</th>
                  <th className="py-3.5 px-6">Ana Tip</th>
                  <th className="py-3.5 px-6">Oluşturulma Tarihi</th>
                  <th className="py-3.5 px-6 text-right">İşlemler</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {getFilteredCategories(activeParentType).map((cat) => (
                  <tr
                    key={cat.id}
                    className="hover:bg-slate-50/80 transition group"
                  >
                    <td className="py-3.5 px-6 font-bold text-[#1E2534]">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-[#4F8FE0]"></span>
                        <span>{cat.name}</span>
                      </div>
                    </td>

                    <td className="py-3.5 px-6">
                      <span className="inline-block px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-700 font-medium text-[11px]">
                        {cat.parentType}
                      </span>
                    </td>

                    <td className="py-3.5 px-6 text-slate-500 font-mono text-[11px]">
                      {cat.createdAt
                        ? new Date(cat.createdAt).toLocaleDateString('tr-TR', {
                            dateStyle: 'medium',
                          })
                        : '-'}
                    </td>

                    <td className="py-3.5 px-6 text-right whitespace-nowrap">
                      {canEdit ? (
                        <div className="inline-flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(cat)}
                            className="p-1.5 text-slate-400 hover:text-[#4F8FE0] hover:bg-blue-50 rounded-lg transition cursor-pointer"
                            title="Kategoriyi Düzenle"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleOpenDeleteModal(cat)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                            title="Kategoriyi Sil"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <span className="text-slate-300 text-[11px] italic">
                          Yetki yok
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* CREATE / EDIT CATEGORY MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-md overflow-hidden flex flex-col">
            {/* Header */}
            <div className="p-6 bg-[#1E2534] text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#4F8FE0]/20 text-[#4F8FE0] flex items-center justify-center font-bold">
                  <FolderTree className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-heading text-base font-bold tracking-tight text-white leading-tight">
                    {modalMode === 'create'
                      ? 'Yeni Alt Kategori Ekle'
                      : 'Kategoriyi Düzenle'}
                  </h3>
                  <p className="text-xs text-slate-300">
                    Ana Tip: <strong>{activeParentType}</strong>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-700/60 rounded-xl transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleModalSubmit} className="p-6 space-y-4">
              {modalError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-medium flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>{modalError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Kategori Adı <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={categoryNameInput}
                  onChange={(e) => setCategoryNameInput(e.target.value)}
                  placeholder="Örn: Laptop, Monitör, Yazıcı..."
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-[#1E2534] focus:outline-hidden focus:border-[#4F8FE0]"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  disabled={modalLoading}
                  className="px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                >
                  İptal
                </button>

                <button
                  type="submit"
                  disabled={modalLoading}
                  className="px-5 py-2.5 bg-[#4F8FE0] hover:bg-[#3D75C4] text-white font-bold text-xs rounded-xl shadow-md hover:shadow-lg transition cursor-pointer disabled:opacity-50"
                >
                  {modalLoading
                    ? 'Kaydediliyor...'
                    : modalMode === 'create'
                    ? 'Kategori Ekle'
                    : 'Değişiklikleri Kaydet'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRM MODAL */}
      {isDeleteOpen && categoryToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-md p-6 relative">
            <button
              onClick={() => {
                setIsDeleteOpen(false);
                setCategoryToDelete(null);
                setDeleteError('');
              }}
              disabled={deleteLoading}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-start gap-4">
              <div className="w-11 h-11 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>

              <div className="flex-1">
                <h3 className="font-heading text-base font-bold text-[#1E2534]">
                  Kategoriyi Sil
                </h3>
                <p className="mt-1 text-xs text-slate-600 leading-relaxed">
                  "<strong>{categoryToDelete.name}</strong>" alt kategorisini silmek istediğinize emin misiniz?
                </p>

                {deleteError && (
                  <div className="mt-3 p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-semibold flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
                    <span>{deleteError}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-2.5 border-t border-slate-100 pt-3">
              <button
                type="button"
                onClick={() => {
                  setIsDeleteOpen(false);
                  setCategoryToDelete(null);
                  setDeleteError('');
                }}
                disabled={deleteLoading}
                className="px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
              >
                İptal
              </button>

              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={deleteLoading}
                className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-md hover:shadow-lg transition cursor-pointer disabled:opacity-50"
              >
                {deleteLoading ? 'Siliniyor...' : 'Evet, Sil'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
