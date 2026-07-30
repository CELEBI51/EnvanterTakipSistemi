import React, { useEffect, useState } from 'react';
import {
  Package,
  Plus,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  Eye,
  Tag,
  Cpu,
  RefreshCw,
} from 'lucide-react';
import useAuthStore from '../../../store/authStore';
import EmptyState from '../../../components/common/EmptyState';
import AddHardwareModal from '../components/AddHardwareModal';
import HardwareDetailModal from '../components/HardwareDetailModal';

const CATEGORIES = [
  'Tümü',
  'Desktop',
  'Laptop',
  'Yazıcı',
  'Mouse',
  'Klavye',
  'Kulaklık',
  'Monitör',
  'Depolama Birimi',
  'Kamera',
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

  const canEdit = user?.role === 'admin' || user?.role === 'it_staff';

  const fetchHardware = async () => {
    setLoading(true);
    setError('');

    const params = new URLSearchParams();
    params.append('page', page);
    params.append('pageSize', '10');

    if (selectedCategory && selectedCategory !== 'Tümü') {
      params.append('category', selectedCategory);
    }
    if (selectedStatus) {
      params.append('status', selectedStatus);
    }
    if (searchQuery.trim()) {
      params.append('q', searchQuery.trim());
    }

    try {
      const res = await fetch(`http://localhost:5000/api/hardware?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Donanım verileri çekilemedi.');
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
    fetchHardware();
  }, [token, page, selectedCategory, selectedStatus]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchHardware();
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-[#E2E8F0] shadow-sm">
        <div>
          <h1 className="font-heading text-2xl font-bold text-[#1E2534]">Donanım Envanteri</h1>
          <p className="text-sm text-slate-500 mt-1">
            Toplam {totalCount} adet donanım kaydı bulunuyor.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchHardware}
            className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl border border-[#E2E8F0] text-slate-700 bg-white hover:bg-slate-50 text-xs font-semibold transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Yenile
          </button>

          {canEdit && (
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#4F8FE0] hover:bg-[#3D75C4] text-white text-xs font-bold shadow-sm transition-all"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              Yeni Ürün Ekle
            </button>
          )}
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-[#E2E8F0] shadow-sm space-y-3 sm:space-y-0 sm:flex sm:items-center sm:gap-4">
        {/* Search */}
        <form onSubmit={handleSearchSubmit} className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Marka, model, seri no veya demirbaş no ara..."
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-[#E2E8F0] text-xs text-[#1E2534] placeholder:text-slate-400 focus:outline-hidden focus:border-[#4F8FE0] focus:ring-1 focus:ring-[#4F8FE0]"
          />
        </form>

        {/* Category Filter */}
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400 hidden sm:block" />
          <select
            value={selectedCategory}
            onChange={(e) => {
              setSelectedCategory(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 rounded-xl border border-[#E2E8F0] text-xs font-medium text-[#1E2534] focus:outline-hidden focus:border-[#4F8FE0]"
          >
            {CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat === 'Tümü' ? 'Tüm Kategoriler' : cat}
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={selectedStatus}
            onChange={(e) => {
              setSelectedStatus(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 rounded-xl border border-[#E2E8F0] text-xs font-medium text-[#1E2534] focus:outline-hidden focus:border-[#4F8FE0]"
          >
            {STATUSES.map((st) => (
              <option key={st.value} value={st.value}>
                {st.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-medium">
          {error}
        </div>
      )}

      {/* Hardware Grid - Responsive Grid: Mobilde 1, tablette 2, masaüstünde 3-4 sütun */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="h-48 bg-white rounded-2xl border border-slate-200 animate-pulse p-4 space-y-3"
            >
              <div className="h-4 bg-slate-100 rounded-md w-2/3"></div>
              <div className="h-8 bg-slate-100 rounded-md"></div>
              <div className="h-4 bg-slate-100 rounded-md w-1/2"></div>
            </div>
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          icon={Package}
          title="Donanım Bulunamadı"
          description="Arama kıstaslarınıza uyan herhangi bir demirbaş kaydı bulunamadı."
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {items.map((hw) => {
            const badge = STATUS_BADGES[hw.status] || {
              label: hw.status,
              bg: 'bg-slate-100 text-slate-700 border-slate-200',
            };

            return (
              <div
                key={hw.id}
                onClick={() => {
                  setSelectedHardwareId(hw.id);
                  setIsDetailModalOpen(true);
                }}
                className="group relative bg-white rounded-2xl border border-[#E2E8F0] shadow-xs hover:shadow-md hover:border-[#4F8FE0]/50 transition-all cursor-pointer overflow-hidden flex flex-col justify-between"
              >
                {/* Asset Tag Visual Accent (Etiket Delik/Nokta Detayı) */}
                <div className="absolute top-0 left-0 bottom-0 w-2.5 bg-[#1E2534] group-hover:bg-[#4F8FE0] transition-colors flex items-center justify-center">
                  <div className="w-1.5 h-1.5 rounded-full bg-white/70"></div>
                </div>

                <div className="p-4 pl-5 space-y-3">
                  {/* Top: Demirbaş No & Badge */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="font-mono text-xs font-bold text-[#1E2534] tracking-wider block bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200/80">
                        {hw.demirbasNo}
                      </span>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mt-1">
                        {hw.category}
                      </span>
                    </div>

                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${badge.bg}`}
                    >
                      {badge.label}
                    </span>
                  </div>

                  {/* Brand & Model */}
                  <div>
                    <h3 className="font-heading text-sm font-bold text-[#1E2534] group-hover:text-[#4F8FE0] transition-colors">
                      {hw.brand} {hw.model}
                    </h3>
                    {hw.serialNo && (
                      <p className="text-[11px] font-mono text-slate-400 mt-0.5 truncate">
                        S/N: {hw.serialNo}
                      </p>
                    )}
                  </div>

                  {/* Specs Quick Info (If Available) */}
                  {hw.specs && (hw.specs.cpu || hw.specs.ram) && (
                    <div className="flex items-center gap-2 pt-1 text-[11px] text-slate-500 font-medium border-t border-slate-100">
                      <Cpu className="w-3.5 h-3.5 text-[#4F8FE0] shrink-0" />
                      <span className="truncate">
                        {[hw.specs.cpu, hw.specs.ram].filter(Boolean).join(' • ')}
                      </span>
                    </div>
                  )}
                </div>

                {/* Card Footer Action */}
                <div className="px-4 pl-5 py-2.5 bg-[#F0F4F8]/50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                  <span className="text-[11px] text-slate-400">Detayları Gör</span>
                  <Eye className="w-3.5 h-3.5 text-slate-400 group-hover:text-[#1E2534] transition-colors" />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination Controls - Sabit 10 Kayıt / Sayfa */}
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
        <AddHardwareModal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          onSuccess={() => {
            setIsAddModalOpen(false);
            setPage(1);
            fetchHardware();
          }}
        />
      )}

      {isDetailModalOpen && (
        <HardwareDetailModal
          hardwareId={selectedHardwareId}
          isOpen={isDetailModalOpen}
          onClose={() => setIsDetailModalOpen(false)}
          onUpdate={() => {
            fetchHardware();
          }}
          onDelete={() => {
            fetchHardware();
          }}
        />
      )}
    </div>
  );
}
