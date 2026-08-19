import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  RefreshCw,
  ChevronRight,
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
  Hazır: '#34D399',
  Kullanımda: '#4C82F7',
  Arızalı: '#F87171',
  Serviste: '#F59E0B',
  'Kullanım Dışı': '#64748B',
};

export default function DashboardPage() {
  const navigate = useNavigate();
  const token = useAuthStore((state) => state.accessToken);
  const user = useAuthStore((state) => state.user);

  const [stats, setStats] = useState(null);
  const [expiringLicenses, setExpiringLicenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const canAddHardware = user?.role === 'admin' || user?.role === 'it_staff';

  const fetchDashboardData = async () => {
    setLoading(true);
    setError('');
    try {
      const [statsRes, expiringRes] = await Promise.all([
        fetch('http://localhost:4001/api/reports/dashboard-stats', {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch('http://localhost:4001/api/licenses/expiring?days=15', {
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
        setExpiringLicenses(expiringData.data || []);
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
      {/* 1. Header */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">
            DİTAŞ Otomotiv • Kurumsal Envanter Portalı
          </span>
          <h1 className="font-heading text-2xl font-bold text-[#1E2534]">
            Sistem Genel Bakış & KPI Göstergeleri
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Fabrika donanım varlıkları, zimmet takibi ve aktif lisans durumları.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchDashboardData}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-slate-300 text-slate-700 bg-white hover:bg-slate-50 text-xs font-medium transition cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Yenile
          </button>
        </div>

      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-medium">
          {error}
        </div>
      )}

      {/* 2. KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Toplam Varlık */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 border-l-4 border-l-[#4C82F7] space-y-3 shadow-xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
            Toplam Varlık
          </span>
          <div>
            <div className="text-3xl font-bold font-heading text-[#1E2534]">
              {loading ? '...' : stats?.totalCount ?? 0}
            </div>
            <span className="text-[11px] text-slate-500 mt-1 block">Kayıtlı donanım envanteri</span>
          </div>
        </div>

        {/* Zimmetli */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 border-l-4 border-l-[#4C82F7] space-y-3 shadow-xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
            Zimmetli Varlık
          </span>
          <div>
            <div className="text-3xl font-bold font-heading text-[#4C82F7]">
              {loading ? '...' : stats?.assignedCount ?? 0}
            </div>
            <span className="text-[11px] text-slate-500 mt-1 block">Personelde zimmetli</span>
          </div>
        </div>

        {/* Hazır Stok */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 border-l-4 border-l-[#34D399] space-y-3 shadow-xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
            Hazır Stok
          </span>
          <div>
            <div className="text-3xl font-bold font-heading text-[#34D399]">
              {loading ? '...' : stats?.readyCount ?? 0}
            </div>
            <span className="text-[11px] text-slate-500 mt-1 block">Boşta hazır stok</span>
          </div>
        </div>

        {/* Arızalı / Bakım */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 border-l-4 border-l-[#F87171] space-y-3 shadow-xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
            Bakım / Arızalı
          </span>
          <div>
            <div className="text-3xl font-bold font-heading text-[#F87171]">
              {loading ? '...' : stats?.faultyCount ?? 0}
            </div>
            <span className="text-[11px] text-slate-500 mt-1 block">Arızalı veya serviste</span>
          </div>
        </div>

        {/* Bitişi Yaklaşan Lisans */}
        <div
          onClick={() => navigate('/licenses')}
          className="bg-white p-5 rounded-xl border border-slate-200 border-l-4 border-l-[#F59E0B] space-y-3 cursor-pointer hover:border-[#4C82F7] transition group shadow-xs"
        >
          <span className="text-[11px] font-bold text-[#F59E0B] uppercase tracking-wider block">
            Bitişi Yaklaşan Lisans
          </span>
          <div>
            <div className="text-3xl font-bold font-heading text-[#F59E0B]">
              {loading ? '...' : (stats?.expiringLicenseCount ?? stats?.expiringSoftwareCount ?? 0)}
            </div>
            <span className="text-[11px] text-[#F59E0B] font-medium mt-1 block">
              15 gün içinde dolacak
            </span>
          </div>
        </div>
      </div>

      {/* 3. Lisans Süresi Yaklaşanlar */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div>
            <h2 className="font-heading text-base font-bold text-[#1E2534]">
              Lisans Süresi Yaklaşan / Dolmuş Lisanslar
            </h2>
            <p className="text-xs text-slate-500">Önümüzdeki 15 gün içinde yenilenmesi gereken yazılım lisansları</p>
          </div>

          <button
            onClick={() => navigate('/licenses')}
            className="inline-flex items-center gap-1 text-xs font-semibold text-[#4F8FE0] hover:text-[#3D75C4] transition cursor-pointer"
          >
            Tüm Lisanslar <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {loading ? (
          <div className="h-20 bg-slate-50 rounded-xl animate-pulse"></div>
        ) : expiringLicenses.length === 0 ? (
          <EmptyState
            title="Süresi Yaklaşan Lisans Yok"
            description="Önümüzdeki 15 gün içinde süresi dolacak aktif bir yazılım lisansı bulunmuyor."
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {expiringLicenses.slice(0, 6).map((lic) => {
              const isExpired = lic.daysRemaining < 0;
              const isToday = lic.daysRemaining === 0;
              const title = lic.brand && lic.productInfo ? `${lic.brand} - ${lic.productInfo}` : lic.name || lic.productInfo || lic.brand || 'Lisans';

              return (
                <div
                  key={lic.id}
                  onClick={() => navigate('/licenses')}
                  className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white hover:border-[#4F8FE0] transition cursor-pointer space-y-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="font-bold text-xs text-[#1E2534] truncate" title={title}>{title}</h4>
                    {isExpired ? (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200 shrink-0">
                        {Math.abs(lic.daysRemaining)} gün önce doldu
                      </span>
                    ) : isToday ? (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 shrink-0">
                        Bugün bitiyor
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 shrink-0">
                        {lic.daysRemaining} gün kaldı
                      </span>
                    )}
                  </div>

                  <div className="font-mono text-[11px] text-[#1E2534] bg-white px-2.5 py-1 rounded border border-slate-200 truncate">
                    {lic.licenseKey || 'Lisans Anahtarı Yok'}
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                    <span>Bitiş: {formatDate(lic.endDate)}</span>
                    <span className="font-semibold text-slate-700">{lic.unit?.name || lic.unitName || '-'}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 4. Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Durum Dağılımı */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h2 className="font-heading text-base font-bold text-[#1E2534]">Durum Dağılımı</h2>
          </div>

          <div className="h-64 w-full flex items-center justify-center">
            {loading ? (
              <div className="text-xs text-slate-400">Grafik yükleniyor...</div>
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
                          fill={STATUS_COLORS[entry.status] || '#6B7280'}
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
                      <span className="text-xs text-[#1E2534] font-medium">{value}</span>
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

        {/* Kategori Dağılımı */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h2 className="font-heading text-base font-bold text-[#1E2534]">Kategori Dağılımı</h2>
          </div>

          <div className="h-64 w-full flex items-center justify-center">
            {loading ? (
              <div className="text-xs text-slate-400">Grafik yükleniyor...</div>
            ) : stats?.categoryDistribution && stats.categoryDistribution.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.categoryDistribution} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <XAxis dataKey="category" tick={{ fontSize: 11, fill: '#6B7280' }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#6B7280' }} />
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
    </div>
  );
}

