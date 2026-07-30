import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Package,
  UserCheck,
  CheckCircle2,
  AlertTriangle,
  Plus,
  RefreshCw,
  TrendingUp,
  History,
  Key,
  Clock,
  ArrowRight,
  Laptop,
} from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import useAuthStore from '../../../store/authStore';
import EmptyState from '../../../components/common/EmptyState';
import AddHardwareModal from '../../hardware/components/AddHardwareModal';

const STATUS_COLORS = {
  Hazır: '#10B981', // Yeşil
  Kullanımda: '#3B82F6', // Mavi
  Arızalı: '#EF4444', // Kırmızı
  Serviste: '#F59E0B', // Amber
  'Kullanım Dışı': '#64748B', // Slate
};

export default function DashboardPage() {
  const navigate = useNavigate();
  const token = useAuthStore((state) => state.accessToken);
  const user = useAuthStore((state) => state.user);

  const [stats, setStats] = useState(null);
  const [expiringSoftware, setExpiringSoftware] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const canAddHardware = user?.role === 'admin' || user?.role === 'it_staff';

  const fetchDashboardData = async () => {
    setLoading(true);
    setError('');
    try {
      const [statsRes, expiringRes] = await Promise.all([
        fetch('http://localhost:5000/api/reports/dashboard-stats', {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch('http://localhost:5000/api/software/expiring?days=15', {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      const statsData = await statsRes.json();
      const expiringData = await expiringRes.json();

      if (!statsRes.ok) {
        throw new Error(statsData.message || 'İstatistikler alınamadı.');
      }

      setStats(statsData.data);
      if (expiringRes.ok) {
        setExpiringSoftware(expiringData.data || []);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [token]);

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('tr-TR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-[#E2E8F0] shadow-sm">
        <div>
          <h1 className="font-heading text-2xl font-bold text-[#1E2534]">
            Genel Bakış & İstatistikler
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Demirbaş envanteri, zimmet durumları ve lisans süresi yaklaşan yazılımlar.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchDashboardData}
            className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl border border-[#E2E8F0] text-slate-700 bg-white hover:bg-slate-50 text-xs font-semibold transition-colors cursor-pointer"
            title="Verileri Yenile"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Yenile
          </button>

          {canAddHardware && (
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#4F8FE0] hover:bg-[#3D75C4] text-white text-xs font-bold shadow-sm transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              Yeni Ürün Ekle
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-medium">
          {error}
        </div>
      )}

      {/* 5 Özet Kart - Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Toplam Demirbaş */}
        <div className="bg-white p-5 rounded-2xl border border-[#E2E8F0] shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Toplam Demirbaş
            </span>
            <div className="text-2xl font-black font-heading text-[#1E2534] mt-1">
              {loading ? '...' : stats?.totalCount ?? 0}
            </div>
            <span className="text-[10px] font-medium text-slate-400 mt-1 block">
              Sistemdeki donanımlar
            </span>
          </div>
          <div className="w-11 h-11 rounded-xl bg-[#1E2534]/5 text-[#1E2534] flex items-center justify-center shrink-0">
            <Package className="w-5 h-5 stroke-[1.75]" />
          </div>
        </div>

        {/* Zimmetli */}
        <div className="bg-white p-5 rounded-2xl border border-[#E2E8F0] shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Zimmetli (Kullanımda)
            </span>
            <div className="text-2xl font-black font-heading text-blue-600 mt-1">
              {loading ? '...' : stats?.assignedCount ?? 0}
            </div>
            <span className="text-[10px] font-medium text-slate-400 mt-1 block">
              Personele tahsisli
            </span>
          </div>
          <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <UserCheck className="w-5 h-5 stroke-[1.75]" />
          </div>
        </div>

        {/* Hazır (Boşta) */}
        <div className="bg-white p-5 rounded-2xl border border-[#E2E8F0] shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Hazır (Boşta)
            </span>
            <div className="text-2xl font-black font-heading text-emerald-600 mt-1">
              {loading ? '...' : stats?.readyCount ?? 0}
            </div>
            <span className="text-[10px] font-medium text-slate-400 mt-1 block">
              Zimmene uygun
            </span>
          </div>
          <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-5 h-5 stroke-[1.75]" />
          </div>
        </div>

        {/* Arızalı / Serviste */}
        <div className="bg-white p-5 rounded-2xl border border-[#E2E8F0] shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Arızalı / Serviste
            </span>
            <div className="text-2xl font-black font-heading text-rose-600 mt-1">
              {loading ? '...' : stats?.faultyCount ?? 0}
            </div>
            <span className="text-[10px] font-medium text-slate-400 mt-1 block">
              Bakım gerektirenler
            </span>
          </div>
          <div className="w-11 h-11 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5 stroke-[1.75]" />
          </div>
        </div>

        {/* Lisans Süresi Yaklaşanlar */}
        <div
          onClick={() => navigate('/software')}
          className="bg-white p-5 rounded-2xl border border-[#E2E8F0] shadow-sm flex items-center justify-between cursor-pointer hover:border-[#4F8FE0] transition-colors group"
        >
          <div>
            <span className="text-[11px] font-bold text-amber-700 uppercase tracking-wider">
              Lisans Süresi Yaklaşanlar
            </span>
            <div className="text-2xl font-black font-heading text-amber-600 mt-1">
              {loading ? '...' : stats?.expiringSoftwareCount ?? 0}
            </div>
            <span className="text-[10px] font-medium text-amber-600/80 mt-1 block">
              15 gün içinde veya geçmiş
            </span>
          </div>
          <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 group-hover:bg-amber-100 transition-colors">
            <Key className="w-5 h-5 stroke-[1.75]" />
          </div>
        </div>
      </div>

      {/* Lisans Süresi Yaklaşanlar Liste Kutusu (Gerçek Veri) */}
      <div className="bg-white p-6 rounded-2xl border border-[#E2E8F0] shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-heading text-base font-bold text-[#1E2534]">
                Lisans Süresi Yaklaşan / Dolmuş Yazılımlar
              </h2>
              <p className="text-xs text-slate-400">15 gün içinde süresi dolacak veya süresi geçmiş lisanslar</p>
            </div>
          </div>

          <button
            onClick={() => navigate('/software')}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-[#4F8FE0] hover:text-[#3D75C4] transition-colors cursor-pointer"
          >
            Tüm Yazılımları Gör
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {loading ? (
          <div className="h-20 bg-slate-50 rounded-xl animate-pulse"></div>
        ) : expiringSoftware.length === 0 ? (
          <EmptyState
            icon={CheckCircle2}
            title="Süresi Yaklaşan Lisans Yok"
            description="Önümüzdeki 15 gün içinde süresi dolacak herhangi bir yazılım lisansı bulunmamaktadır."
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {expiringSoftware.slice(0, 6).map((sw) => {
              const isExpired = sw.daysRemaining < 0;
              const isToday = sw.daysRemaining === 0;

              return (
                <div
                  key={sw.id}
                  onClick={() => navigate('/software')}
                  className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white hover:border-[#4F8FE0] transition-all cursor-pointer space-y-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="font-bold text-xs text-[#1E2534] truncate">{sw.name}</h4>
                    {isExpired ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200 shrink-0">
                        {Math.abs(sw.daysRemaining)} gün önce doldu
                      </span>
                    ) : isToday ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 shrink-0">
                        Bugün bitiyor
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 shrink-0">
                        {sw.daysRemaining} gün kaldı
                      </span>
                    )}
                  </div>

                  <div className="font-mono text-[11px] text-slate-600 bg-white px-2 py-1 rounded border border-slate-200 truncate">
                    {sw.licenseKey}
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                    <span>Bitiş: {formatDate(sw.endDate)}</span>
                    {sw.assignedHardware ? (
                      <span className="flex items-center gap-1 font-medium text-slate-700 truncate max-w-[140px]">
                        <Laptop className="w-3 h-3 text-[#4F8FE0] shrink-0" />
                        {sw.assignedHardware.brand}
                      </span>
                    ) : (
                      <span className="text-slate-400">-</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Grafik Alanları - Responsive Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Durum Dağılımı (PieChart) */}
        <div className="bg-white p-6 rounded-2xl border border-[#E2E8F0] shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-heading text-base font-bold text-[#1E2534] flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-[#4F8FE0]" />
              Durum Dağılımı
            </h2>
            <span className="text-xs text-slate-400 font-medium">Envanter Durumları</span>
          </div>

          <div className="h-64 w-full flex items-center justify-center">
            {loading ? (
              <div className="text-xs text-slate-400 animate-pulse">Grafik yükleniyor...</div>
            ) : stats?.statusDistribution && stats.statusDistribution.some((s) => s.count > 0) ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stats.statusDistribution.filter((s) => s.count > 0)}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={85}
                    paddingAngle={4}
                    dataKey="count"
                    nameKey="status"
                  >
                    {stats.statusDistribution
                      .filter((s) => s.count > 0)
                      .map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={STATUS_COLORS[entry.status] || '#94A3B8'}
                        />
                      ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1E2534',
                      color: '#FFF',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                  />
                  <Legend
                    formatter={(value) => (
                      <span className="text-xs text-slate-600 font-medium">{value}</span>
                    )}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState
                title="Durum Verisi Yok"
                description="Henüz envanterde herhangi bir ürün kaydı bulunmamaktadır."
              />
            )}
          </div>
        </div>

        {/* Kategori Dağılımı (BarChart) */}
        <div className="bg-white p-6 rounded-2xl border border-[#E2E8F0] shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-heading text-base font-bold text-[#1E2534] flex items-center gap-2">
              <Package className="w-5 h-5 text-[#1E2534]" />
              Kategori Dağılımı
            </h2>
            <span className="text-xs text-slate-400 font-medium">Ürün Türüne Göre</span>
          </div>

          <div className="h-64 w-full flex items-center justify-center">
            {loading ? (
              <div className="text-xs text-slate-400 animate-pulse">Grafik yükleniyor...</div>
            ) : stats?.categoryDistribution && stats.categoryDistribution.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.categoryDistribution} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <XAxis dataKey="category" tick={{ fontSize: 11, fill: '#64748B' }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#64748B' }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1E2534',
                      color: '#FFF',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                  />
                  <Bar dataKey="count" name="Adet" fill="#1E2534" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState
                title="Kategori Verisi Yok"
                description="Kategorilere göre listelenecek donanım bulunamadı."
              />
            )}
          </div>
        </div>
      </div>

      {/* Son İşlemler Bölümü (Modüler EmptyState) */}
      <div className="bg-white p-6 rounded-2xl border border-[#E2E8F0] shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-heading text-base font-bold text-[#1E2534] flex items-center gap-2">
            <History className="w-5 h-5 text-[#4F8FE0]" />
            Son İşlemler
          </h2>
          <span className="text-xs text-slate-400 font-medium">Son Zimmet & İade Hareketleri</span>
        </div>

        <EmptyState
          icon={History}
          title="Henüz İşlem Yok"
          description="Sistemde henüz gerçekleştirilmiş bir zimmet teslim veya iade işlemi bulunmuyor."
        />
      </div>

      {/* Modal */}
      {isAddModalOpen && (
        <AddHardwareModal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          onSuccess={() => {
            fetchDashboardData();
            setIsAddModalOpen(false);
          }}
        />
      )}
    </div>
  );
}
