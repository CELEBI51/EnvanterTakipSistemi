import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { FileText, Eye, Filter, RotateCcw, Plus, Search } from 'lucide-react';
import useAuthStore from '../../../store/authStore';
import { hasPermission } from '../../../utils/permissions';
import ExcelExportButton from '../../../components/common/ExcelExportButton';

import { API_BASE_URL } from '../../../config';
import ReturnDetailModal from '../components/ReturnDetailModal';
import SelectAssignmentForReturnModal from '../components/SelectAssignmentForReturnModal';

export default function ReturnList() {
  const [searchParams] = useSearchParams();
  const token = useAuthStore((state) => state.accessToken);
  const currentUser = useAuthStore((state) => state.user);
  const userRole = currentUser?.role?.toLowerCase();


  const initialSearch = searchParams.get('search') || searchParams.get('q') || '';
  const autoOpenModal = searchParams.get('openModal') === 'true';

  const [returns, setReturns] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Filters & Pagination
  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const [debouncedSearch, setDebouncedSearch] = useState(initialSearch);
  const [unitIdFilter, setUnitIdFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [units, setUnits] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Detail Modal
  const [selectedReturnId, setSelectedReturnId] = useState(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  // Select Assignment for Return Modal
  const [isSelectAssignmentOpen, setIsSelectAssignmentOpen] = useState(autoOpenModal);


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
        const res = await fetch(`${API_BASE_URL}/units`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (res.ok && data.data) setUnits(data.data);
      } catch (err) {
        console.error('Birimler yüklenemedi:', err);
      }
    };
    if (token) fetchUnits();
  }, [token]);

  useEffect(() => {
    fetchReturns();
  }, [unitIdFilter, statusFilter, debouncedSearch, currentPage, token]);

  const fetchReturns = async () => {
    setLoading(true);
    setError('');

    try {
      let query = `?page=${currentPage}&pageSize=10`;
      if (unitIdFilter) query += `&unitId=${encodeURIComponent(unitIdFilter)}`;
      if (statusFilter) query += `&status=${encodeURIComponent(statusFilter)}`;
      if (debouncedSearch.trim()) query += `&q=${encodeURIComponent(debouncedSearch.trim())}`;

      const res = await fetch(`${API_BASE_URL}/returns${query}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();
      if (res.ok && data.data) {
        setReturns(data.data);
        if (data.pagination) {
          setTotalPages(data.pagination.totalPages || 1);
          setTotalCount(data.pagination.totalCount || 0);
        }
      } else {
        throw new Error(data.message || 'İade kayıtları alınamadı.');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-[#1E2534] tracking-tight">Zimmet İade Kayıtları</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Tamamlanmış ve kısmi zimmet iadelerinin geçmiş takibi ve belgeleri.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <ExcelExportButton
            modulePath="returns"
            queryParams={{
              unitId: unitIdFilter,
              status: statusFilter,
              q: searchQuery,
            }}
            fileNamePrefix="iade"
          />

          {hasPermission(currentUser, 'returns:create') && (
            <button
              onClick={() => setIsSelectAssignmentOpen(true)}
              className="px-4 py-2.5 rounded-xl bg-[#1E2534] text-white text-xs font-bold hover:bg-slate-800 transition cursor-pointer flex items-center gap-2 shadow-xs"
            >
              <Plus className="w-4 h-4" /> Yeni İade Oluştur
            </button>
          )}

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
            placeholder="İade eden personel adı, Sicil No, teslim alan veya ürün bilgisi ile canlı ara..."

            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-medium text-[#1E2534] focus:border-[#4F8FE0] focus:bg-white transition"
          />
        </div>

        {/* Row 2: Equal width filters row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end">
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
              Zimmet Durumu
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
              <option value="KismiIade">Kısmi İade</option>
              <option value="IadeEdildi">İade Edildi</option>

            </select>
          </div>
        </div>

        {/* Clear Filters Button Row (Only if any filter active) */}
        {(searchQuery || unitIdFilter || statusFilter) && (
          <div className="flex justify-end pt-1">
            <button
              onClick={() => {
                setSearchQuery('');
                setUnitIdFilter('');
                setStatusFilter('');
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
            İade kayıtları yükleniyor...
          </div>
        ) : error ? (
          <div className="p-6 text-center text-xs font-semibold text-rose-600">
            {error}
          </div>
        ) : returns.length === 0 ? (
          <div className="p-12 text-center text-xs font-medium text-slate-400">
            Henüz oluşturulmuş iade kaydı bulunamadı.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-[#1E2534]">
              <thead className="bg-slate-50 text-[10px] font-bold text-slate-500 uppercase border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">İade Tarihi</th>
                  <th className="px-4 py-3">İade Eden Personel</th>
                  <th className="px-4 py-3">Birim</th>
                  <th className="px-4 py-3">Teslim Alan (IT)</th>
                  <th className="px-4 py-3">İade Kalem Sayısı</th>
                  <th className="px-4 py-3 text-right">İşlemler</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {returns.map((item) => {
                  const itemCount =
                    (item.items?.length || 0) +
                    (item.accessoryItems?.length || 0);

                  const formatDate = (dateVal) => {
                    if (!dateVal) return '-';
                    const d = new Date(dateVal);
                    return isNaN(d.getTime()) ? '-' : d.toLocaleDateString('tr-TR');
                  };

                  return (
                    <tr key={item.id || Math.random()} className="hover:bg-slate-50/80 transition">
                      <td className="px-4 py-3.5 font-medium text-slate-600">
                        {formatDate(item.tarih)}
                      </td>

                      <td className="px-4 py-3.5 font-bold text-[#1E2534]">
                        {item.assignment?.employee?.fullName || 'Bilinmeyen Personel'}
                      </td>

                      <td className="px-4 py-3.5 text-slate-600 font-medium">
                        {item.assignment?.employee?.unit?.name || '-'}
                      </td>

                      <td className="px-4 py-3.5 font-bold text-[#4F8FE0]">
                        {item.teslimAlanIc || '-'}
                      </td>

                      <td className="px-4 py-3.5 font-bold text-slate-800">
                        {itemCount} Kalem İade
                      </td>

                      <td className="px-4 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => {
                              setSelectedReturnId(item.id);
                              setIsDetailOpen(true);
                            }}
                            className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-[#EAF2FC] hover:text-[#4F8FE0] transition cursor-pointer"
                            title="Detay Gör"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() =>
                              window.open(`${API_BASE_URL}/returns/${item.id}/pdf?token=${token}`, '_blank')
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

      {/* Return Detail Modal */}
      <ReturnDetailModal
        isOpen={isDetailOpen}
        onClose={() => {
          setIsDetailOpen(false);
          setSelectedReturnId(null);
        }}
        returnId={selectedReturnId}
      />

      {/* Select Assignment Modal */}
      <SelectAssignmentForReturnModal
        isOpen={isSelectAssignmentOpen}
        onClose={() => setIsSelectAssignmentOpen(false)}
        initialSearch={initialSearch}
      />

    </div>
  );
}
