import React, { useEffect, useState } from 'react';
import {
  Package,
  Plus,
  Search,
  ChevronLeft,
  ChevronRight,
  Eye,
  Cpu,
  Barcode,
} from 'lucide-react';
import useAuthStore from '../../../store/authStore';
import EmptyState from '../../../components/common/EmptyState';
import AddHardwareModal from '../components/AddHardwareModal';
import HardwareDetailModal from '../components/HardwareDetailModal';
import BarcodePrintModal from '../../../components/common/BarcodePrintModal';

const CATEGORIES = [
  'Tümü',
  'Desktop',
  'Laptop',
  'Monitör',
  'Yazıcı',
  'Diğer',
];

const STATUSES = [
  { label: 'Tüm Durumlar', value: '' },
  { label: 'Hazır (Boşta)', value: 'Hazir' },
  { label: 'Kullanımda', value: 'Kullanimda' },
  { label: 'Arızalı', value: 'Arizali' },
  { label: 'Serviste', value: 'Serviste' },
  { label: 'Kullanım Dışı', value: 'KullanimDisi' },
];

const STATUS_BADGES = {
  Hazir: { label: 'Hazır', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  Kullanimda: { label: 'Kullanımda', bg: 'bg-blue-50 text-blue-700 border-blue-200' },
  Arizali: { label: 'Arızalı', bg: 'bg-rose-50 text-rose-700 border-rose-200' },
  Serviste: { label: 'Serviste', bg: 'bg-amber-50 text-amber-700 border-amber-200' },
  KullanimDisi: { label: 'Kullanım Dışı', bg: 'bg-slate-100 text-slate-700 border-slate-200' },
};

export default function HardwareList() {
  const token = useAuthStore((state) => state.accessToken);
  const user = useAuthStore((state) => state.user);

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filtering & Pagination States
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Tümü');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedHardwareId, setSelectedHardwareId] = useState(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  // Barcode Print Modal
  const [isBarcodeModalOpen, setIsBarcodeModalOpen] = useState(false);
  const [barcodeModalData, setBarcodeModalData] = useState(null);

  const canAdd = user?.role === 'admin' || user?.role === 'it_staff';

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

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-xl sm:text-2xl font-bold text-[#1E2534] tracking-tight">
            Bilgisayar & Ekipman Envanteri
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Şirket bünyesindeki masaüstü, laptop, monitör ve yazıcı donanımlarını yönetin.
          </p>
        </div>

        {canAdd && (
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#4F8FE0] hover:bg-[#3D75C4] active:bg-[#3566AD] text-white text-xs sm:text-sm font-bold shadow-xs transition-all cursor-pointer shrink-0 self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            Yeni Ürün Ekle
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
              placeholder="Marka, model, seri no veya demirbaş no ara..."
              className="w-full pl-10 pr-4 py-2 rounded-xl border border-[#E2E8F0] text-xs font-medium text-[#1E2534] placeholder-slate-400 focus:outline-hidden focus:border-[#4F8FE0] focus:ring-1 focus:ring-[#4F8FE0]"
            />
          </div>

          {/* Status Filter */}
          <select
            value={selectedStatus}
            onChange={(e) => {
              setSelectedStatus(e.target.value);
              setPage(1);
            }}
            className="px-3.5 py-2 rounded-xl border border-[#E2E8F0] text-xs font-medium text-[#1E2534] focus:outline-hidden focus:border-[#4F8FE0] focus:ring-1 focus:ring-[#4F8FE0] bg-white cursor-pointer"
          >
            {STATUSES.map((st) => (
              <option key={st.value} value={st.value}>
                {st.label}
              </option>
            ))}
          </select>

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
          Donanım envanteri yükleniyor...
        </div>
      ) : error ? (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-medium">
          {error}
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          icon={Package}
          title="Ürün Bulunamadı"
          description="Aradığınız kriterlere uygun donanım kaydı bulunmamaktadır."
        />
      ) : (
        <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#1E2534] text-white text-xs uppercase tracking-wider font-heading">
                  <th className="py-3.5 px-4 font-bold">Demirbaş No</th>
                  <th className="py-3.5 px-4 font-bold">Kategori</th>
                  <th className="py-3.5 px-4 font-bold">Marka / Model</th>
                  <th className="py-3.5 px-4 font-bold">Seri No</th>
                  <th className="py-3.5 px-4 font-bold">Özellikler (Specs)</th>
                  <th className="py-3.5 px-4 font-bold text-center">Durum</th>
                  <th className="py-3.5 px-4 font-bold text-right">İşlemler</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {items.map((hw) => {
                  const badge = STATUS_BADGES[hw.status] || {
                    label: hw.status,
                    bg: 'bg-slate-100 text-slate-700 border-slate-200',
                  };

                  const specsText = hw.specs
                    ? [hw.specs.cpu, hw.specs.ram, hw.specs.gpu].filter(Boolean).join(' • ')
                    : null;

                  return (
                    <tr
                      key={hw.id}
                      onClick={() => {
                        setSelectedHardwareId(hw.id);
                        setIsDetailModalOpen(true);
                      }}
                      className="hover:bg-slate-50/80 transition-colors cursor-pointer"
                    >
                      {/* Demirbaş No */}
                      <td className="py-3.5 px-4">
                        <span className="font-mono text-xs font-bold text-[#1E2534] bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200/80">
                          {hw.demirbasNo}
                        </span>
                      </td>

                      {/* Kategori */}
                      <td className="py-3.5 px-4 text-slate-600 font-semibold">{hw.category}</td>

                      {/* Marka / Model */}
                      <td className="py-3.5 px-4">
                        <span className="font-bold text-[#1E2534]">
                          {hw.brand}{hw.model ? ` ${hw.model}` : ''}
                        </span>
                      </td>

                      {/* Seri No */}
                      <td className="py-3.5 px-4 font-mono text-slate-500">
                        {hw.serialNo || '-'}
                      </td>

                      {/* Specs */}
                      <td className="py-3.5 px-4 text-slate-600">
                        {specsText ? (
                          <span className="inline-flex items-center gap-1 text-[11px] text-slate-600 bg-slate-100/70 px-2 py-0.5 rounded-md font-medium">
                            <Cpu className="w-3 h-3 text-[#4F8FE0] shrink-0" />
                            {specsText}
                          </span>
                        ) : (
                          <span className="text-slate-400 font-mono text-[11px]">-</span>
                        )}
                      </td>

                      {/* Durum Rozeti */}
                      <td className="py-3.5 px-4 text-center">
                        <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold border ${badge.bg}`}>
                          {badge.label}
                        </span>
                      </td>

                      {/* İşlemler */}
                      <td className="py-3.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={(e) => openBarcodeModal(e, hw)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-700 hover:text-[#4F8FE0] hover:border-[#4F8FE0] text-[11px] font-bold shadow-2xs transition-colors cursor-pointer"
                            title="Barkod Etiketi Yazdır"
                          >
                            <Barcode className="w-3.5 h-3.5 text-[#4F8FE0]" />
                            <span>Barkod</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setSelectedHardwareId(hw.id);
                              setIsDetailModalOpen(true);
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-[#1E2534] hover:text-white text-slate-700 text-[11px] font-semibold transition-colors cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Detay</span>
                          </button>
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
            {totalCount} kayıt)
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

      {/* Add Hardware Modal */}
      <AddHardwareModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={() => {
          setIsAddModalOpen(false);
          fetchHardwareList();
        }}
      />

      {/* Detail Modal */}
      <HardwareDetailModal
        hardwareId={selectedHardwareId}
        isOpen={isDetailModalOpen}
        onClose={() => {
          setIsDetailModalOpen(false);
          setSelectedHardwareId(null);
        }}
        onUpdate={fetchHardwareList}
        onDelete={fetchHardwareList}
      />

      {/* Barcode Print Modal */}
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
    </div>
  );
}
