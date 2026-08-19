import React, { useEffect, useState } from 'react';
import {
  FileText,
  Filter,
  RefreshCw,
  Download,
  Calendar,
  Search,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
  User,
  Clock,
  Activity,
  Layers,
} from 'lucide-react';
import useAuthStore from '../../../store/authStore';

const MODULE_OPTIONS = [
  { value: '', label: 'Tüm Modüller' },
  { value: 'hardware', label: 'Varlık (Hardware)' },
  { value: 'assignment', label: 'Zimmet (Assignment)' },
  { value: 'return', label: 'İade (Return)' },
  { value: 'employee', label: 'Personel (Employee)' },
  { value: 'user', label: 'Kullanıcı (User)' },
  { value: 'auth', label: 'Oturum / Kimlik (Auth)' },
  { value: 'settings', label: 'Ayarlar (Settings)' },
  { value: 'backup', label: 'Yedekleme & Geri Yükle' },
  { value: 'maintenance', label: 'Bakım (Maintenance)' },
  { value: 'accessories', label: 'Aksesuar' },
  { value: 'consumables', label: 'Sarf Malzeme' },
  { value: 'components', label: 'Bileşen' },
  { value: 'licenses', label: 'Lisans' },
];

const ACTION_OPTIONS = [
  { value: '', label: 'Tüm İşlemler' },
  { value: 'CREATE', label: 'Oluşturma (CREATE)' },
  { value: 'UPDATE', label: 'Güncelleme (UPDATE)' },
  { value: 'DELETE', label: 'Silme (DELETE)' },
  { value: 'LOGIN', label: 'Sisteme Giriş (LOGIN)' },
  { value: 'LOGOUT', label: 'Sistemden Çıkış (LOGOUT)' },
  { value: 'EXPORT', label: 'Dışa Aktar (EXPORT)' },
  { value: 'RESTORE', label: 'Geri Yükle (RESTORE)' },
];

export default function LogsSettingsTab() {
  const token = useAuthStore((state) => state.accessToken);
  const currentUser = useAuthStore((state) => state.user);

  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [exportLoading, setExportLoading] = useState(false);
  const [error, setError] = useState('');

  // Filters
  const [selectedModule, setSelectedModule] = useState('');
  const [selectedAction, setSelectedAction] = useState('');
  const [userEmailSearch, setUserEmailSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const canView = currentUser?.role === 'admin';

  const fetchLogs = async () => {
    setLoading(true);
    setError('');
    try {
      const queryParams = new URLSearchParams();
      if (selectedModule) queryParams.append('module', selectedModule);
      if (selectedAction) queryParams.append('action', selectedAction);
      if (userEmailSearch.trim()) queryParams.append('userEmail', userEmailSearch.trim());
      if (dateFrom) queryParams.append('dateFrom', dateFrom);
      if (dateTo) queryParams.append('dateTo', dateTo);
      queryParams.append('page', page);
      queryParams.append('limit', 50);

      const res = await fetch(`http://localhost:4001/api/settings/logs?${queryParams.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Sistem logları yüklenemedi.');

      setLogs(data.data || []);
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
    fetchLogs();
  }, [token, selectedModule, selectedAction, page]);

  const handleApplyFilter = (e) => {
    e.preventDefault();
    setPage(1);
    fetchLogs();
  };

  const handleClearFilters = () => {
    setSelectedModule('');
    setSelectedAction('');
    setUserEmailSearch('');
    setDateFrom('');
    setDateTo('');
    setPage(1);
  };

  const handleExportExcel = async () => {
    setExportLoading(true);
    try {
      const queryParams = new URLSearchParams();
      if (selectedModule) queryParams.append('module', selectedModule);
      if (selectedAction) queryParams.append('action', selectedAction);
      if (userEmailSearch.trim()) queryParams.append('userEmail', userEmailSearch.trim());
      if (dateFrom) queryParams.append('dateFrom', dateFrom);
      if (dateTo) queryParams.append('dateTo', dateTo);

      const res = await fetch(`http://localhost:4001/api/settings/logs/export?${queryParams.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error('Excel indirme başarısız oldu.');

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `sistem-loglari-${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
    } catch (err) {
      alert(err.message);
    } finally {
      setExportLoading(false);
    }
  };

  const getActionBadgeStyle = (action) => {
    switch (action) {
      case 'CREATE':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'UPDATE':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'DELETE':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'LOGIN':
      case 'LOGOUT':
        return 'bg-slate-100 text-slate-700 border-slate-200';
      case 'EXPORT':
      case 'RESTORE':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      default:
        return 'bg-slate-50 text-slate-600 border-slate-200';
    }
  };

  if (!canView) {
    return (
      <div className="bg-rose-50 border border-rose-200 rounded-2xl p-8 text-center text-xs text-rose-700 font-bold">
        <ShieldAlert className="w-8 h-8 mx-auto mb-2 text-rose-600" />
        Sistem loglarını görüntülemek için Yönetici (Admin) yetkisine sahip olmalısınız.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold font-heading text-[#1E2534] flex items-center gap-2" style={{ color: 'var(--theme-text-primary)' }}>
            <Activity className="w-5 h-5" style={{ color: 'var(--theme-accent)' }} />
            Sistem Denetim & Aktivite Logları
          </h2>
          <p className="text-xs mt-1" style={{ color: 'var(--theme-text-secondary)' }}>
            Kullanıcı işlemleri, oturum hareketleri ve veri değişiklikleri kayıt altında tutulur.
          </p>
        </div>

        <button
          type="button"
          onClick={handleExportExcel}
          disabled={exportLoading || logs.length === 0}
          className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition cursor-pointer disabled:opacity-50"
        >
          <Download className="w-4 h-4" />
          {exportLoading ? 'Hazırlanıyor...' : 'Excel\'e Aktar'}
        </button>
      </div>

      {/* Filters Card */}
      <form onSubmit={handleApplyFilter} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Module Filter */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">Modül</label>
            <select
              value={selectedModule}
              onChange={(e) => {
                setSelectedModule(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-[#1E2534] focus:outline-hidden focus:border-[#4F8FE0]"
            >
              {MODULE_OPTIONS.map((m) => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          </div>

          {/* Action Filter */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">İşlem Türü</label>
            <select
              value={selectedAction}
              onChange={(e) => {
                setSelectedAction(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-[#1E2534] focus:outline-hidden focus:border-[#4F8FE0]"
            >
              {ACTION_OPTIONS.map((a) => (
                <option key={a.value} value={a.value}>{a.label}</option>
              ))}
            </select>
          </div>

          {/* Date Range From */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">Başlangıç Tarihi</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-[#1E2534] focus:outline-hidden focus:border-[#4F8FE0]"
            />
          </div>

          {/* Date Range To */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">Bitiş Tarihi</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-[#1E2534] focus:outline-hidden focus:border-[#4F8FE0]"
            />
          </div>
        </div>

        {/* Bottom Row: User Search + Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t border-slate-100">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Kullanıcı e-posta ile ara..."
              value={userEmailSearch}
              onChange={(e) => setUserEmailSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-[#1E2534] focus:outline-hidden focus:border-[#4F8FE0]"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={handleClearFilters}
              className="px-3.5 py-1.5 border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl text-xs font-semibold cursor-pointer"
            >
              Filtreleri Temizle
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 bg-[#1E2534] hover:bg-[#2B354B] text-white rounded-xl text-xs font-bold shadow-xs transition cursor-pointer"
            >
              Filtrele
            </button>
          </div>
        </div>
      </form>

      {/* Logs Table Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-xs text-slate-400 font-medium">
            Sistem logları yükleniyor...
          </div>
        ) : error ? (
          <div className="p-8 text-center text-xs text-rose-600 font-medium">
            {error}
          </div>
        ) : logs.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-400 font-medium space-y-2">
            <FileText className="w-8 h-8 mx-auto text-slate-300" />
            <p>Seçilen filtrelere uygun sistem logu bulunamadı.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-4">Tarih / Saat</th>
                  <th className="py-3 px-4">Kullanıcı</th>
                  <th className="py-3 px-4">İşlem</th>
                  <th className="py-3 px-4">Modül</th>
                  <th className="py-3 px-4">Açıklama</th>
                  <th className="py-3 px-4">IP Adresi</th>
                  <th className="py-3 px-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-[#1E2534]">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/60 transition">
                    {/* Date */}
                    <td className="py-3 px-4 font-mono text-[11px] whitespace-nowrap text-slate-500">
                      {new Date(log.createdAt).toLocaleString('tr-TR')}
                    </td>

                    {/* User */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="font-semibold text-[#1E2534]">
                        {log.user?.fullName || log.userEmail || 'Sistem / Anonim'}
                      </div>
                      {log.userEmail && (
                        <div className="text-[10px] text-slate-400 font-mono">
                          {log.userEmail}
                        </div>
                      )}
                    </td>

                    {/* Action Badge */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${getActionBadgeStyle(log.action)}`}>
                        {log.action}
                      </span>
                    </td>

                    {/* Module */}
                    <td className="py-3 px-4 whitespace-nowrap font-medium text-slate-600">
                      <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md text-[11px] font-semibold border border-slate-200">
                        {log.module}
                      </span>
                    </td>

                    {/* Description */}
                    <td className="py-3 px-4 max-w-md font-medium text-slate-800 break-words">
                      {log.description}
                    </td>

                    {/* IP Address */}
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                      {log.ipAddress || '-'}
                    </td>

                    {/* Status Code */}
                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold font-mono ${log.statusCode >= 200 && log.statusCode < 300 ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'}`}>
                        {log.statusCode || 200}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Footer Pagination */}
        {!loading && logs.length > 0 && (
          <div className="p-4 bg-slate-50/70 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
            <div>
              Toplam <span className="font-bold text-[#1E2534]">{totalCount}</span> log kaydından {((page - 1) * 50) + 1} - {Math.min(page * 50, totalCount)} arası gösteriliyor.
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="p-1.5 rounded-lg border border-slate-200 hover:bg-white disabled:opacity-40 cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="font-bold text-[#1E2534] px-2">
                {page} / {totalPages}
              </span>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="p-1.5 rounded-lg border border-slate-200 hover:bg-white disabled:opacity-40 cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
