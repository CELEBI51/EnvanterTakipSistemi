import React, { useEffect, useState } from 'react';
import {
  Plus,
  Search,
  ChevronLeft,
  ChevronRight,
  Eye,
  Barcode,
  Download,
  Wrench,
  FileSpreadsheet,
} from 'lucide-react';
import useAuthStore from '../../../store/authStore';
import { hasPermission } from '../../../utils/permissions';
import EmptyState from '../../../components/common/EmptyState';
import AddHardwareModal from '../components/AddHardwareModal';
import HardwareDetailModal from '../components/HardwareDetailModal';
import BarcodePrintModal from '../../../components/common/BarcodePrintModal';
import AddMaintenanceModal from '../components/AddMaintenanceModal';
import ExcelImportModal from '../../../components/common/ExcelImportModal';
import ExcelExportButton from '../../../components/common/ExcelExportButton';


const STATUSES = [
  { label: 'Tüm Durumlar', value: '' },
  { label: 'Hazır (Boşta)', value: 'Hazir' },
  { label: 'Kullanımda', value: 'Kullanimda' },
  { label: 'Arızalı', value: 'Arizali' },
  { label: 'Serviste', value: 'Serviste' },
  { label: 'Kullanım Dışı', value: 'KullanimDisi' },
];

const STATUS_BADGES = {
  Hazir: { label: 'Hazır', bg: 'bg-emerald-50 text-[#16A34A] border-emerald-200' },
  Kullanimda: { label: 'Kullanımda', bg: 'bg-blue-50 text-[#2F6BFF] border-blue-200' },
  Arizali: { label: 'Arızalı', bg: 'bg-rose-50 text-[#DC2626] border-rose-200' },
  Serviste: { label: 'Serviste', bg: 'bg-amber-50 text-[#F59E0B] border-amber-200' },
  KullanimDisi: { label: 'Kullanım Dışı', bg: 'bg-slate-100 text-[#6B7280] border-slate-200' },
};

export default function HardwareList() {
  const token = useAuthStore((state) => state.accessToken);
  const user = useAuthStore((state) => state.user);

  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState(['Tümü']);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Tümü');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedHardwareId, setSelectedHardwareId] = useState(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  const [isBarcodeModalOpen, setIsBarcodeModalOpen] = useState(false);
  const [barcodeModalData, setBarcodeModalData] = useState(null);

  const [isAddMaintenanceOpen, setIsAddMaintenanceOpen] = useState(false);
  const [maintenanceHardwareId, setMaintenanceHardwareId] = useState(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  const [stats, setStats] = useState({ total: 0, inUse: 0, ready: 0, needsAttention: 0 });

  const canCreate = hasPermission(user, 'hardware:create');
  const canMaintain = hasPermission(user, 'hardware:maintenance');
  const canExcel = hasPermission(user, 'excel:view');

  useEffect(() => {
    fetchCategories();
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/hardware/stats', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok && data.data) {
        setStats(data.data);
      }
    } catch (err) {
      console.error('Varlık istatistikleri alınamadı:', err);
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/categories?parentType=Varlık', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok && data.data) {
        const catNames = data.data.map((c) => c.name);
        setCategories(['Tümü', ...catNames]);
      }
    } catch (err) {
      console.error('Kategoriler alınamadı:', err);
    }
  };

  const fetchHardwareList = async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      params.append('page', page);

      if (selectedCategory !== 'Tümü') {
        params.append('category', selectedCategory);
      }
      if (selectedStatus) {
        params.append('status', selectedStatus);
      }
      if (searchQuery.trim()) {
        params.append('q', searchQuery.trim());
      }

      const res = await fetch(`http://localhost:5000/api/hardware?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Ürün listesi alınamadı.');
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
    fetchHardwareList();
  }, [page, selectedCategory, selectedStatus]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchHardwareList();
  };

  const openBarcodeModal = (e, hw) => {
    e.stopPropagation();
    setBarcodeModalData({
      demirbasNo: hw.demirbasNo,
      brand: hw.brand,
      model: hw.model,
    });
    setIsBarcodeModalOpen(true);
  };

  const openAddMaintenanceModal = (e, hwId) => {
    e.stopPropagation();
    setMaintenanceHardwareId(hwId);
    setIsAddMaintenanceOpen(true);
  };

  const exportToCSV = () => {
    if (!items.length) return;
    const headers = ['Demirbaş No', 'Kategori', 'Marka', 'Model', 'Seri No', 'Lokasyon', 'Tedarikçi', 'Durum'];
    const rows = items.map((i) => [
      i.demirbasNo,
      i.category,
      i.brand,
      i.model || '',
      i.serialNo || '',
      i.location || '',
      i.supplier || '',
      i.status,
    ]);
    const csvContent =
      'data:text/csv;charset=utf-8,\uFEFF' +
      [headers.join(','), ...rows.map((e) => e.map((x) => `"${x}"`).join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `DITAS_Donanim_Envanteri_${new Date().toISOString().slice(0, 10)}.csv`);
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
            DİTAŞ Otomotiv • Bilgisayar & Ekipman Yönetimi
          </span>
          <h1 className="text-2xl font-bold font-heading text-[#1E2534]">
            Bilgisayar & Ekipman Envanteri
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Masaüstü, laptop, monitör ve diğer varlık donanımlarının detaylı takibi.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <ExcelExportButton
            modulePath="hardware"
            queryParams={{
              category: selectedCategory,
              status: selectedStatus,
              q: searchQuery,
            }}
            fileNamePrefix="varlik"
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

          {canCreate && (
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#4F8FE0] hover:bg-[#3D75C4] text-white text-xs font-bold transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Yeni Ürün Ekle
            </button>
          )}
        </div>

      </div>

      {/* Hardware Statistics Summary Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Toplam */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">
            Toplam
          </span>
          <div className="text-2xl font-bold font-heading text-[#1E2534]">
            {stats.total}
          </div>
        </div>

        {/* Kullanımda */}
        <div className="bg-blue-50/50 p-5 rounded-2xl border border-blue-200 shadow-xs flex flex-col justify-between">
          <span className="text-xs font-bold text-[#2F6BFF] uppercase tracking-wider block mb-1">
            Kullanımda
          </span>
          <div className="text-2xl font-bold font-heading text-blue-950">
            {stats.inUse}
          </div>
        </div>

        {/* Hazır */}
        <div className="bg-emerald-50/50 p-5 rounded-2xl border border-emerald-200 shadow-xs flex flex-col justify-between">
          <span className="text-xs font-bold text-[#16A34A] uppercase tracking-wider block mb-1">
            Hazır
          </span>
          <div className="text-2xl font-bold font-heading text-emerald-950">
            {stats.ready}
          </div>
        </div>

        {/* Arızalı/Serviste/Hurda */}
        <div className="bg-amber-50/60 p-5 rounded-2xl border border-amber-200 shadow-xs flex flex-col justify-between">
          <span className="text-xs font-bold text-amber-800 uppercase tracking-wider block mb-1">
            Arızalı/Serviste/Hurda
          </span>
          <div className="text-2xl font-bold font-heading text-amber-900">
            {stats.needsAttention}
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
              placeholder="Marka, model, seri no veya demirbaş no ara..."
              className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 text-xs text-[#1E2534] placeholder-slate-400 focus:border-[#4F8FE0]"
            />
          </div>

          <select
            value={selectedStatus}
            onChange={(e) => {
              setSelectedStatus(e.target.value);
              setPage(1);
            }}
            className="px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-medium text-[#1E2534] bg-white cursor-pointer"
          >
            {STATUSES.map((st) => (
              <option key={st.value} value={st.value}>
                {st.label}
              </option>
            ))}
          </select>

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
            title="Kayıtlı Donanım Bulunamadı"
            description="Arama kriterlerinize uygun herhangi bir bilgisayar veya donanım kaydı mevcut değil."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3.5 px-4">Demirbaş No</th>
                  <th className="py-3.5 px-4">Ürün Adı / Marka & Model</th>
                  <th className="py-3.5 px-4">Kategori</th>
                  <th className="py-3.5 px-4">Seri No</th>
                  <th className="py-3.5 px-4">Lokasyon</th>
                  <th className="py-3.5 px-4">Durum</th>
                  <th className="py-3.5 px-4 text-right">İşlemler</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {items.map((item) => {
                  const statusInfo = STATUS_BADGES[item.status] || {
                    label: item.status,
                    bg: 'bg-slate-100 text-slate-700 border-slate-200',
                  };

                  return (
                    <tr
                      key={item.id}
                      onClick={() => {
                        setSelectedHardwareId(item.id);
                        setIsDetailModalOpen(true);
                      }}
                      className="hover:bg-slate-50/80 transition cursor-pointer"
                    >
                      <td className="py-3 px-4 font-mono font-bold text-[#1E2534] whitespace-nowrap">
                        {item.demirbasNo}
                      </td>

                      <td className="py-3 px-4">
                        <div className="font-bold text-[#1E2534]">
                          {item.brand} {item.model || ''}
                        </div>
                        {item.specs && (
                          <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                            {[item.specs.cpu, item.specs.ram, item.specs.gpu].filter(Boolean).join(' • ')}
                          </div>
                        )}
                      </td>

                      <td className="py-3 px-4">
                        <span className="inline-block px-2.5 py-1 rounded bg-slate-100 text-slate-700 font-medium">
                          {item.category}
                        </span>
                      </td>

                      <td className="py-3 px-4 font-mono text-slate-600">
                        {item.serialNo || '-'}
                      </td>

                      <td className="py-3 px-4 text-slate-600">
                        {item.location || '-'}
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded text-[11px] font-bold border ${statusInfo.bg}`}
                        >
                          {statusInfo.label}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="inline-flex items-center justify-end gap-1">
                          {canMaintain && !item.hasActiveMaintenance && (
                            <button
                              type="button"
                              onClick={(e) => openAddMaintenanceModal(e, item.id)}
                              className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-slate-100 rounded transition cursor-pointer"
                              title="Bakım İşlemi Oluştur"
                            >
                              <Wrench className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={(e) => openBarcodeModal(e, item)}
                            className="p-1.5 text-slate-400 hover:text-[#4F8FE0] hover:bg-slate-100 rounded transition cursor-pointer"
                            title="Barkod Yazdır"
                          >
                            <Barcode className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedHardwareId(item.id);
                              setIsDetailModalOpen(true);
                            }}
                            className="p-1.5 text-slate-400 hover:text-[#1E2534] hover:bg-slate-100 rounded transition cursor-pointer"
                            title="Detay Görüntüle"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
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
      <AddHardwareModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={() => {
          setIsAddModalOpen(false);
          fetchHardwareList();
          fetchStats();
        }}
      />

      <HardwareDetailModal
        hardwareId={selectedHardwareId}
        isOpen={isDetailModalOpen}
        onClose={() => {
          setIsDetailModalOpen(false);
          setSelectedHardwareId(null);
        }}
        onUpdate={() => {
          fetchHardwareList();
          fetchStats();
        }}
        onDelete={() => {
          fetchHardwareList();
          fetchStats();
        }}
      />

      {barcodeModalData && (
        <BarcodePrintModal
          isOpen={isBarcodeModalOpen}
          onClose={() => {
            setIsBarcodeModalOpen(false);
            setBarcodeModalData(null);
          }}
          demirbasNo={barcodeModalData.demirbasNo}
          brand={barcodeModalData.brand}
          model={barcodeModalData.model}
        />
      )}

      {maintenanceHardwareId && (
        <AddMaintenanceModal
          isOpen={isAddMaintenanceOpen}
          onClose={() => {
            setIsAddMaintenanceOpen(false);
            setMaintenanceHardwareId(null);
          }}
          hardwareId={maintenanceHardwareId}
          onSuccess={fetchHardwareList}
        />
      )}

      <ExcelImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        moduleKey="hardware"
        moduleTitle="Varlık Donanımları"
        onSuccess={fetchHardwareList}
      />
    </div>
  );
}
