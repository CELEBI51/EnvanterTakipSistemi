import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, FileText, Download, Eye, Calendar, Building2, Filter, RotateCcw } from 'lucide-react';

import useAuthStore from '../../../store/authStore';
import { hasPermission } from '../../../utils/permissions';
import ExcelExportButton from '../../../components/common/ExcelExportButton';

import AssignmentDetailModal from '../components/AssignmentDetailModal';

export default function AssignmentList() {
  const navigate = useNavigate();
  const token = useAuthStore((state) => state.accessToken);
  const currentUser = useAuthStore((state) => state.user);
  const userRole = currentUser?.role?.toLowerCase();


  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Stats
  const [stats, setStats] = useState({ total: 0, active: 0, partiallyReturned: 0, fullyReturned: 0 });

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [unitIdFilter, setUnitIdFilter] = useState('');
  const [units, setUnits] = useState([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Detail Modal
  const [selectedAssignmentId, setSelectedAssignmentId] = useState(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  // Debounce search input (350ms)
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 350);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  useEffect(() => {
    const fetchUnits = async () => {
      try {
        const res = await fetch('http://localhost:5000/api/units', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (res.ok && data.data) setUnits(data.data);
      } catch (err) {
        console.error('Birimler yüklenemedi:', err);
      }
    };
    if (token) {
      fetchUnits();
      fetchStats();
    }
  }, [token]);

  const fetchStats = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/assignments/stats', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok && data.data) {
        setStats(data.data);
      }
    } catch (err) {
      console.error('Zimmet istatistikleri alınamadı:', err);
    }
  };

  useEffect(() => {
    fetchAssignments();
  }, [unitIdFilter, statusFilter, dateFrom, dateTo, debouncedSearch, currentPage, token]);

  const fetchAssignments = async () => {
    setLoading(true);
    setError('');

    try {
      let query = `?page=${currentPage}&pageSize=10`;
      if (unitIdFilter) query += `&unitId=${encodeURIComponent(unitIdFilter)}`;
      if (statusFilter) query += `&status=${encodeURIComponent(statusFilter)}`;
      if (dateFrom) query += `&dateFrom=${encodeURIComponent(dateFrom)}`;
      if (dateTo) query += `&dateTo=${encodeURIComponent(dateTo)}`;
      if (debouncedSearch.trim()) query += `&q=${encodeURIComponent(debouncedSearch.trim())}`;

      const res = await fetch(`http://localhost:5000/api/assignments${query}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();
      if (res.ok && data.data) {
        setAssignments(data.data);
        if (data.pagination) {
          setTotalPages(data.pagination.totalPages || 1);
          setTotalCount(data.pagination.totalCount || 0);
        }
      } else {
        throw new Error(data.message || 'Zimmet kayıtları alınamadı.');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const renderStatusBadge = (status) => {
    switch (status) {
      case 'Aktif':
        return (
          <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-bold">
            Aktif
          </span>
        );
      case 'Kısmi İade':
      case 'KismiIade':
        return (
          <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[11px] font-bold">
            Kısmi İade
          </span>
        );
      case 'İade Edildi':
      case 'IadeEdildi':
        return (
          <span className="px-2.5 py-0.5 rounded-full bg-slate-200 text-slate-700 text-[11px] font-bold">
            İade Edildi
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[11px] font-bold">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-[#1E2534] tracking-tight">Zimmetleme Yönetimi</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Personele verilmiş tüm varlık, aksesuar ve lisans zimmetlerinin takibi.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <ExcelExportButton
            modulePath="assignments"
            queryParams={{
              unitId: unitIdFilter,
              status: statusFilter,
              dateFrom,
              dateTo,
              q: searchQuery,
            }}
            fileNamePrefix="zimmet"
          />

          {hasPermission(currentUser, 'assignments:create') && (
            <button
              onClick={() => navigate('/assignments/create')}
              className="px-4 py-2.5 rounded-xl bg-[#1E2534] text-white text-xs font-bold hover:bg-slate-800 transition cursor-pointer flex items-center gap-2 shadow-xs"
            >
              <Plus className="w-4 h-4" /> Yeni Zimmetleme Oluştur
            </button>
          )}

        </div>

      </div>

      {/* Assignment Statistics Summary Bar */}
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

        {/* Aktif */}
        <div className="bg-blue-50/50 p-5 rounded-2xl border border-blue-200 shadow-xs flex flex-col justify-between">
          <span className="text-xs font-bold text-[#2F6BFF] uppercase tracking-wider block mb-1">
            Aktif
          </span>
          <div className="text-2xl font-bold font-heading text-blue-950">
            {stats.active}
          </div>
        </div>

        {/* Kısmi İade */}
        <div className="bg-amber-50/60 p-5 rounded-2xl border border-amber-200 shadow-xs flex flex-col justify-between">
          <span className="text-xs font-bold text-amber-800 uppercase tracking-wider block mb-1">
            Kısmi İade
          </span>
          <div className="text-2xl font-bold font-heading text-amber-900">
            {stats.partiallyReturned}
          </div>
        </div>

        {/* Tamamen İade Edildi */}
        <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">
            Tamamen İade Edildi
          </span>
          <div className="text-2xl font-bold font-heading text-slate-700">
            {stats.fullyReturned}
          </div>
        </div>
      </div>

      {/* Filters Card */}
      <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-3">
        {/* Row 1: Full-width live search */}
        <div className="relative w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Personel adı, Sicil No, teslim eden veya varlık bilgisi ile canlı ara..."

            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-medium text-[#1E2534] focus:border-[#4F8FE0] focus:bg-white transition"
          />
        </div>

        {/* Row 2: Equal width filters row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 items-end">
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 uppercase mb-1">
              Birim
            </label>
            <select
              value={unitIdFilter}
              onChange={(e) => {
                setUnitIdFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs font-medium text-[#1E2534] focus:border-[#4F8FE0] focus:bg-white transition"
            >
              <option value="">Tüm Birimler</option>
              {units.map((unit) => (
                <option key={unit.id} value={unit.id}>
                  {unit.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-600 uppercase mb-1">
              Durum
            </label>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs font-medium text-[#1E2534] focus:border-[#4F8FE0] focus:bg-white transition"
            >
              <option value="">Tüm Durumlar</option>
              <option value="Aktif">Aktif</option>
              <option value="KismiIade">Kısmi İade</option>
              <option value="IadeEdildi">İade Edildi</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-600 uppercase mb-1">
              Başlangıç Tarihi
            </label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => {
                setDateFrom(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs font-medium text-[#1E2534] focus:border-[#4F8FE0] focus:bg-white transition"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-600 uppercase mb-1">
              Bitiş Tarihi
            </label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => {
                setDateTo(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs font-medium text-[#1E2534] focus:border-[#4F8FE0] focus:bg-white transition"
            />
          </div>
        </div>

        {/* Clear Filters Button Row (Only if any filter active) */}
        {(searchQuery || unitIdFilter || statusFilter || dateFrom || dateTo) && (
          <div className="flex justify-end pt-1">
            <button
              onClick={() => {
                setSearchQuery('');
                setUnitIdFilter('');
                setStatusFilter('');
                setDateFrom('');
                setDateTo('');
                setCurrentPage(1);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-100 text-slate-700 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 text-xs font-bold transition cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Filtreleri Temizle
            </button>
          </div>
        )}
      </div>


      {/* Main Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-xs font-semibold text-slate-500">
            Zimmet kayıtları yükleniyor...
          </div>
        ) : error ? (
          <div className="p-6 text-center text-xs font-semibold text-rose-600">
            {error}
          </div>
        ) : assignments.length === 0 ? (
          <div className="p-12 text-center text-xs font-medium text-slate-400">
            Kriterlere uygun zimmet kaydı bulunamadı.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-[#1E2534]">
              <thead className="bg-slate-50 text-[10px] font-bold text-slate-500 uppercase border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">Teslim Tarihi</th>
                  <th className="px-4 py-3">Teslim Alan</th>
                  <th className="px-4 py-3">Departman</th>
                  <th className="px-4 py-3">Kalem Sayısı</th>
                  <th className="px-4 py-3">Durum</th>
                  <th className="px-4 py-3 text-right">İşlemler</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {assignments.map((item) => {
                  const itemCount =
                    (item.items?.length || 0) +
                    (item.accessoryItems?.length || 0) +
                    (item.consumableItems?.length || 0);

                  return (
                    <tr key={item.id} className="hover:bg-slate-50/80 transition">
                      <td className="px-4 py-3.5 font-medium text-slate-600">
                        {new Date(item.teslimTarihi).toLocaleDateString('tr-TR')}
                      </td>

                      <td className="px-4 py-3.5 font-bold text-[#1E2534]">
                        {item.employee?.fullName}
                      </td>

                      <td className="px-4 py-3.5 text-slate-600 font-medium">
                        {item.employee?.unit?.name || '-'}
                      </td>

                      <td className="px-4 py-3.5 font-bold text-slate-800">
                        {itemCount} Kalem
                      </td>

                      <td className="px-4 py-3.5">{renderStatusBadge(item.status)}</td>

                      <td className="px-4 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => {
                              setSelectedAssignmentId(item.id);
                              setIsDetailOpen(true);
                            }}
                            className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-[#EAF2FC] hover:text-[#4F8FE0] transition cursor-pointer"
                            title="Detay Gör"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() =>
                              window.open(`http://localhost:5000/api/assignments/${item.id}/pdf?token=${token}`, '_blank')
                            }
                            className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-[#1E2534] transition cursor-pointer"
                            title="PDF İndir"
                          >
                            <FileText className="w-4 h-4 text-[#4F8FE0]" />
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

        {/* Pagination Footer */}
        {totalPages > 1 && (
          <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs">
            <span className="text-slate-500 font-medium">
              Toplam {totalCount} kayıttan {currentPage}/{totalPages} sayfa gösteriliyor
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 font-semibold disabled:opacity-50 hover:bg-slate-100 transition cursor-pointer"
              >
                Önceki
              </button>
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 font-semibold disabled:opacity-50 hover:bg-slate-100 transition cursor-pointer"
              >
                Sonraki
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Assignment Detail Modal */}
      <AssignmentDetailModal
        isOpen={isDetailOpen}
        onClose={() => {
          setIsDetailOpen(false);
          setSelectedAssignmentId(null);
        }}
        assignmentId={selectedAssignmentId}
        onReturnClick={(assignment) => {
          navigate(`/returns/create?assignmentId=${assignment.id}`);
        }}
      />
    </div>
  );
}
