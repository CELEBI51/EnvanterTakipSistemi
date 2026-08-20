import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  Plus,
  Search,
  ChevronLeft,
  ChevronRight,
  Eye,
  FileSpreadsheet,
  UserCheck,
  UserX,
  AlertTriangle,
  ExternalLink,
  Calendar,
  Phone,
  Mail,
  Building2,
  X,
  CheckCircle,
  Edit,
} from 'lucide-react';
import useAuthStore from '../../../store/authStore';
import { hasPermission } from '../../../utils/permissions';
import { formatPhoneInput, getPhoneDigits, formatTcNoInput } from '../../../utils/inputFormatters';
import EmptyState from '../../../components/common/EmptyState';
import ConfirmModal from '../../../components/common/ConfirmModal';
import EditEmployeeModal from '../components/EditEmployeeModal';
import ExcelImportModal from '../../../components/common/ExcelImportModal';
import ExcelExportButton from '../../../components/common/ExcelExportButton';
import { API_BASE_URL } from '../../../config';


export default function EmployeeList() {
  const token = useAuthStore((state) => state.accessToken);
  const user = useAuthStore((state) => state.user);
  const navigate = useNavigate();

  const canEdit = hasPermission(user, 'employees:manage');
  const canExcel = hasPermission(user, 'excel:view');

  const [employees, setEmployees] = useState([]);
  const [units, setUnits] = useState([]);
  const [stats, setStats] = useState({ total: 0, active: 0, inactive: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filters & Sorting & Pagination
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [unitFilter, setUnitFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sortBy, setSortBy] = useState('name_asc');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Modals state
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Add Form state
  const [addFullName, setAddFullName] = useState('');
  const [addTcNo, setAddTcNo] = useState('');
  const [addUnitId, setAddUnitId] = useState('');
  const [addPhone, setAddPhone] = useState('');
  const [addEmail, setAddEmail] = useState('');
  const [addHireDate, setAddHireDate] = useState('');
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState('');

  // Detail Modal & Status Change state
  const [selectedEmployeeId, setSelectedEmployeeId] = useState(null);
  const [employeeDetail, setEmployeeDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const [isStatusConfirmOpen, setIsStatusConfirmOpen] = useState(false);
  const [statusBlockedWarning, setStatusBlockedWarning] = useState(null);
  const [statusUpdating, setStatusUpdating] = useState(false);

  // Debounce search (350ms)
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 350);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  useEffect(() => {
    fetchUnits();
    fetchStats();
  }, []);

  useEffect(() => {
    fetchEmployees();
  }, [debouncedSearch, unitFilter, statusFilter, page, sortBy]);

  const fetchStats = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/employees/stats`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok && data.data) {
        setStats(data.data);
      }
    } catch (err) {
      console.error('Personel istatistikleri alınamadı:', err);
    }
  };

  const fetchUnits = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/units`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok && data.data) {
        setUnits(data.data);
      }
    } catch (err) {
      console.error('Birimler yüklenemedi:', err);
    }
  };

  const fetchEmployees = async () => {
    setLoading(true);
    setError('');

    try {
      let query = `?page=${page}&pageSize=10`;
      if (debouncedSearch.trim()) query += `&q=${encodeURIComponent(debouncedSearch.trim())}`;
      if (statusFilter !== '') query += `&isActive=${statusFilter}`;

      const res = await fetch(`${API_BASE_URL}/employees${query}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();
      if (res.ok && data.data) {
        let list = data.data;

        // Apply Unit Filter locally if chosen
        if (unitFilter) {
          list = list.filter((emp) => emp.unitId === unitFilter);
        }

        // Client-side sorting
        list.sort((a, b) => {
          if (sortBy === 'name_asc') return a.fullName.localeCompare(b.fullName, 'tr');
          if (sortBy === 'name_desc') return b.fullName.localeCompare(a.fullName, 'tr');
          if (sortBy === 'hireDate_desc') {
            return (new Date(b.hireDate || 0)) - (new Date(a.hireDate || 0));
          }
          if (sortBy === 'hireDate_asc') {
            return (new Date(a.hireDate || 0)) - (new Date(b.hireDate || 0));
          }
          return 0;
        });

        setEmployees(list);
        if (data.pagination) {
          setTotalPages(data.pagination.totalPages || 1);
          setTotalCount(data.pagination.totalCount || 0);
        }
      } else {
        throw new Error(data.message || 'Personel listesi alınamadı.');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddEmployee = async (e) => {
    e.preventDefault();
    setAddError('');

    if (!addFullName.trim()) {
      setAddError('Personel adı soyadı zorunludur.');
      return;
    }
    if (!addTcNo.trim()) {
      setAddError('Sicil Numarası zorunludur.');
      return;
    }
    if (!addUnitId) {
      setAddError('Lütfen bir Birim seçiniz.');
      return;
    }


    setAddLoading(true);

    try {
      const res = await fetch(`${API_BASE_URL}/employees`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          fullName: addFullName.trim(),
          tcNo: addTcNo.trim(),
          unitId: addUnitId,
          phone: getPhoneDigits(addPhone) || undefined,
          email: addEmail.trim() || undefined,
          hireDate: addHireDate || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Personel oluşturulurken bir hata oluştu.');
      }

      setAddFullName('');
      setAddTcNo('');
      setAddUnitId('');
      setAddPhone('');
      setAddEmail('');
      setAddHireDate('');
      setIsAddModalOpen(false);

      fetchEmployees();
      fetchStats();
    } catch (err) {
      setAddError(err.message);
    } finally {
      setAddLoading(false);
    }
  };

  const openEmployeeDetail = async (id) => {
    setSelectedEmployeeId(id);
    setDetailLoading(true);
    setStatusBlockedWarning(null);

    try {
      const res = await fetch(`${API_BASE_URL}/employees/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok && data.data) {
        setEmployeeDetail(data.data);
      }
    } catch (err) {
      console.error('Personel detayı yüklenemedi:', err);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleToggleStatusClick = () => {
    if (!employeeDetail) return;
    setStatusBlockedWarning(null);

    if (employeeDetail.isActive) {
      // Trying to deactivate: Check active assignments
      if (employeeDetail.activeAssignmentCount > 0) {
        setStatusBlockedWarning({
          count: employeeDetail.activeAssignmentCount,
          message: `Bu personelin zimmetinde henüz iade edilmemiş ${employeeDetail.activeAssignmentCount} adet ürün kaydı bulunuyor. İşten çıkarılmadan önce tüm zimmetlerin iade alınması gerekmektedir.`,
        });
      } else {
        setIsStatusConfirmOpen(true);
      }
    } else {
      // Trying to reactivate: confirm or do directly
      handleExecuteStatusChange(true);
    }
  };

  const handleExecuteStatusChange = async (targetActive) => {
    if (!selectedEmployeeId) return;
    setStatusUpdating(true);

    try {
      const res = await fetch(`${API_BASE_URL}/employees/${selectedEmployeeId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ isActive: targetActive }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 400 && data.activeAssignmentCount) {
          setStatusBlockedWarning({
            count: data.activeAssignmentCount,
            message: data.message,
          });
        } else {
          alert(data.message || 'Durum değiştirilirken bir hata oluştu.');
        }
        return;
      }

      setIsStatusConfirmOpen(false);
      setSelectedEmployeeId(null);
      setEmployeeDetail(null);
      fetchEmployees();
      fetchStats();
    } catch (err) {
      alert('İstek gönderilemedi.');
    } finally {
      setStatusUpdating(false);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('tr-TR');
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">
            İnsan Kaynakları & Şirket Kadrosu
          </span>
          <h1 className="text-2xl font-bold font-heading text-[#1E2534]">
            Personel Yönetimi
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Şirket personellerinin ve zimmet geçmişinin merkezi kaydı.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <ExcelExportButton
            modulePath="employees"
            queryParams={{
              q: searchQuery,
              isActive: statusFilter,
            }}
            fileNamePrefix="personel"
          />


          {canExcel && (
            <button
              onClick={() => setIsImportModalOpen(true)}
              className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl border border-emerald-500 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-xs font-bold transition cursor-pointer shadow-xs"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              Excel'den İçe Aktar
            </button>
          )}

          {canEdit && (
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#4F8FE0] hover:bg-[#3D75C4] text-white text-xs font-bold shadow-xs transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Yeni Personel Ekle
            </button>
          )}
        </div>

      </div>

      {/* 1. Statistics Summary Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 border-l-4 border-l-[#4C82F7] shadow-xs flex flex-col justify-between">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">
            Toplam Personel
          </span>
          <div className="text-2xl font-bold font-heading text-[#1E2534]">
            {stats.total}
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 border-l-4 border-l-[#34D399] shadow-xs flex flex-col justify-between">
          <span className="text-xs font-bold text-[#34D399] uppercase tracking-wider block mb-1">
            Aktif Çalışan
          </span>
          <div className="text-2xl font-bold font-heading text-[#34D399]">
            {stats.active}
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 border-l-4 border-l-[#64748B] shadow-xs flex flex-col justify-between">
          <span className="text-xs font-bold text-[#64748B] uppercase tracking-wider block mb-1">
            İşten Çıkmış (Pasif)
          </span>
          <div className="text-2xl font-bold font-heading text-[#64748B]">
            {stats.inactive}
          </div>
        </div>
      </div>

      {/* 2. Filters & Search Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto flex-1">
          {/* Search Box */}
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(1);
              }}
              placeholder="Ad, TC no, e-posta ile ara..."
              className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-medium text-[#1E2534] focus:border-[#4F8FE0] focus:bg-white transition"
            />
          </div>

          {/* Unit Filter */}
          <select
            value={unitFilter}
            onChange={(e) => {
              setUnitFilter(e.target.value);
              setPage(1);
            }}
            className="w-full sm:w-44 px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-medium text-[#1E2534] focus:border-[#4F8FE0] focus:bg-white transition"
          >
            <option value="">Tüm Birimler</option>
            {units.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="w-full sm:w-40 px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-medium text-[#1E2534] focus:border-[#4F8FE0] focus:bg-white transition"
          >
            <option value="">Tüm Durumlar</option>
            <option value="true">Aktif</option>
            <option value="false">İşten Çıkmış</option>
          </select>
        </div>

        {/* Sorting Dropdown */}
        <div className="w-full md:w-auto flex items-center justify-end">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="w-full sm:w-48 px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold text-[#1E2534] focus:border-[#4F8FE0] focus:bg-white transition"
          >
            <option value="name_asc">Sırala: Ad Soyad (A-Z)</option>
            <option value="name_desc">Sırala: Ad Soyad (Z-A)</option>
            <option value="hireDate_desc">İşe Başlama (En Yeni)</option>
            <option value="hireDate_asc">İşe Başlama (En Eski)</option>
          </select>
        </div>
      </div>

      {/* 3. Main Data Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-slate-400 text-xs font-medium">
            Personel verileri yükleniyor...
          </div>
        ) : error ? (
          <div className="py-12 p-4 text-center text-rose-600 text-xs font-semibold">
            {error}
          </div>
        ) : employees.length === 0 ? (
          <EmptyState
            title="Personel Bulunamadı"
            description="Arama kıstaslarınıza uyan herhangi bir personel kaydı mevcut değil."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="p-4">Ad Soyad</th>
                  <th className="p-4">Sicil No</th>
                  <th className="p-4">Birim</th>
                  <th className="p-4">İletişim</th>
                  <th className="p-4">İşe Başlama</th>
                  <th className="p-4">Durum</th>
                  <th className="p-4">Zimmet Durumu</th>
                  <th className="p-4 text-right">İşlemler</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-[#1E2534]">
                {employees.map((emp) => (
                  <tr
                    key={emp.id}
                    onClick={() => openEmployeeDetail(emp.id)}
                    className="hover:bg-slate-50/80 transition cursor-pointer"
                  >
                    <td className="p-4 font-bold text-sm text-[#1E2534]">
                      {emp.fullName}
                    </td>
                    <td className="p-4 font-mono text-slate-600 font-medium">
                      {emp.tcNo}
                    </td>
                    <td className="p-4 text-slate-600 font-medium">
                      {emp.unit?.name || '-'}
                    </td>
                    <td className="p-4 text-slate-500 space-y-0.5">
                      {emp.phone && <div className="text-slate-700">{emp.phone}</div>}
                      {emp.email && <div className="text-slate-400 text-[11px]">{emp.email}</div>}
                      {!emp.phone && !emp.email && '-'}
                    </td>
                    <td className="p-4 text-slate-600 font-medium">
                      {formatDate(emp.hireDate)}
                    </td>
                    <td className="p-4">
                      {emp.isActive ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span> Aktif
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold bg-slate-100 text-slate-600 border border-slate-300">
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-500"></span> İşten Çıkmış
                        </span>
                      )}
                    </td>
                    <td className="p-4">
                      {emp.activeAssignmentCount > 0 ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                          {emp.activeAssignmentCount} zimmetli ürün
                        </span>
                      ) : (
                        <span className="text-slate-400 text-[11px]">Zimmet yok</span>
                      )}
                    </td>
                    <td className="p-4 text-right">
                      <div className="inline-flex items-center justify-end gap-1">
                        {canEdit && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingEmployee(emp);
                              setIsEditModalOpen(true);
                            }}
                            className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                            title="Düzenle"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            openEmployeeDetail(emp.id);
                          }}
                          className="p-1.5 text-slate-500 hover:text-[#4F8FE0] hover:bg-slate-100 rounded-lg transition cursor-pointer"
                          title="Detay Görüntüle"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500 font-medium">
            <span>
              Toplam {totalCount} personelden {((page - 1) * 10) + 1} - {Math.min(page * 10, totalCount)} arası gösteriliyor
            </span>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-2 rounded-lg border border-slate-200 disabled:opacity-40 hover:bg-slate-50 transition"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span>{page} / {totalPages}</span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-2 rounded-lg border border-slate-200 disabled:opacity-40 hover:bg-slate-50 transition"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 4. Add Employee Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between px-6 py-4 bg-[#1E2534] text-white">
              <h2 className="text-base font-bold tracking-tight">Yeni Personel Ekle</h2>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-white transition p-1 rounded-lg hover:bg-slate-700/60 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddEmployee} className="p-6 space-y-4">
              {addError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold rounded-xl">
                  {addError}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Ad Soyad <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  value={addFullName}
                  onChange={(e) => setAddFullName(e.target.value)}
                  placeholder="Ahmet Yılmaz"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-medium text-[#1E2534] focus:border-[#4F8FE0] focus:bg-white transition"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Sicil Numarası <span className="text-rose-600">*</span>
                  </label>
                  <input
                    type="text"
                    value={addTcNo}
                    onChange={(e) => setAddTcNo(formatTcNoInput(e.target.value))}
                    placeholder="Örn: 12345678901"
                    maxLength={11}
                    inputMode="numeric"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-mono text-[#1E2534] focus:border-[#4F8FE0] focus:bg-white transition"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Birim <span className="text-rose-600">*</span>
                  </label>
                  <select
                    value={addUnitId}
                    onChange={(e) => setAddUnitId(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-medium text-[#1E2534] focus:border-[#4F8FE0] focus:bg-white transition"
                    required
                  >
                    <option value="">Birim Seçiniz...</option>
                    {units.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Telefon
                  </label>
                  <input
                    type="text"
                    value={addPhone}
                    onChange={(e) => setAddPhone(formatPhoneInput(e.target.value))}
                    placeholder="05XX XXX XX XX"
                    maxLength={14}
                    inputMode="numeric"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-medium text-[#1E2534] focus:border-[#4F8FE0] focus:bg-white transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    E-posta
                  </label>
                  <input
                    type="email"
                    value={addEmail}
                    onChange={(e) => setAddEmail(e.target.value)}
                    placeholder="ornek@ditas.com.tr"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-medium text-[#1E2534] focus:border-[#4F8FE0] focus:bg-white transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  İşe Başlama Tarihi
                </label>
                <input
                  type="date"
                  value={addHireDate}
                  onChange={(e) => setAddHireDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-medium text-[#1E2534] focus:border-[#4F8FE0] focus:bg-white transition"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-100 transition cursor-pointer"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  disabled={addLoading}
                  className="px-5 py-2.5 rounded-xl bg-[#1E2534] text-white text-xs font-bold hover:bg-slate-800 transition disabled:opacity-50 cursor-pointer"
                >
                  {addLoading ? 'Kaydediliyor...' : 'Personeli Kaydet'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. Employee Detail & Status Change Modal */}
      {selectedEmployeeId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between px-6 py-4 bg-[#1E2534] text-white">
              <div>
                <h2 className="text-base font-bold tracking-tight">
                  {employeeDetail ? employeeDetail.fullName : 'Personel Detayı'}
                </h2>
                <p className="text-xs text-slate-300">
                  {employeeDetail?.tcNo ? `TC: ${employeeDetail.tcNo}` : ''}
                </p>
              </div>
              <button
                onClick={() => {
                  setSelectedEmployeeId(null);
                  setEmployeeDetail(null);
                  setStatusBlockedWarning(null);
                }}
                className="text-slate-400 hover:text-white transition p-1 rounded-lg hover:bg-slate-700/60 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6 overflow-y-auto flex-1 text-xs">
              {detailLoading || !employeeDetail ? (
                <div className="py-12 text-center text-slate-400 font-medium">
                  Personel detayları yükleniyor...
                </div>
              ) : (
                <>
                  {/* Warning Box if deactivation blocked */}
                  {statusBlockedWarning && (
                    <div className="p-4 bg-amber-50 border border-amber-300 rounded-xl space-y-3">
                      <div className="flex items-start space-x-2.5 text-amber-900">
                        <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                        <div>
                          <h4 className="font-bold text-xs">İşten Çıkarma Engellendi</h4>
                          <p className="mt-1 text-xs text-amber-800 leading-relaxed">
                            {statusBlockedWarning.message}
                          </p>
                        </div>
                      </div>
                      <div className="flex justify-end pt-1">
                        <button
                          onClick={() => {
                            setSelectedEmployeeId(null);
                            navigate(`/returns?search=${encodeURIComponent(employeeDetail.fullName)}&openModal=true`);
                          }}
                          className="inline-flex items-center space-x-1.5 px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg text-xs transition cursor-pointer shadow-xs"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span>Zimmetlerini Görüntüle & İade Al</span>
                        </button>

                      </div>
                    </div>
                  )}

                  {/* Summary Grid Info */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <div>
                      <span className="text-[11px] text-slate-400 font-semibold uppercase block">Birim</span>
                      <span className="font-bold text-slate-800">{employeeDetail.unit?.name || '-'}</span>
                    </div>
                    <div>
                      <span className="text-[11px] text-slate-400 font-semibold uppercase block">Durum</span>
                      <span className="font-bold">
                        {employeeDetail.isActive ? (
                          <span className="text-emerald-600">Aktif Çalışan</span>
                        ) : (
                          <span className="text-slate-500">İşten Çıkarıldı</span>
                        )}
                      </span>
                    </div>
                    <div>
                      <span className="text-[11px] text-slate-400 font-semibold uppercase block">İşe Başlama</span>
                      <span className="font-medium text-slate-700">{formatDate(employeeDetail.hireDate)}</span>
                    </div>
                    {employeeDetail.terminationDate && (
                      <div>
                        <span className="text-[11px] text-slate-400 font-semibold uppercase block">İşten Çıkış Tarihi</span>
                        <span className="font-medium text-rose-700">{formatDate(employeeDetail.terminationDate)}</span>
                      </div>
                    )}
                    <div>
                      <span className="text-[11px] text-slate-400 font-semibold uppercase block">Telefon</span>
                      <span className="font-medium text-slate-700">{employeeDetail.phone || '-'}</span>
                    </div>
                    <div>
                      <span className="text-[11px] text-slate-400 font-semibold uppercase block">E-posta</span>
                      <span className="font-medium text-slate-700">{employeeDetail.email || '-'}</span>
                    </div>
                  </div>

                  {/* Assignment History Section */}
                  <div className="space-y-3">
                    <h3 className="font-bold text-slate-800 text-sm flex items-center justify-between border-b border-slate-200 pb-2">
                      <span>Zimmet Geçmişi (Salt Okunur)</span>
                      <span className="text-xs font-normal text-slate-500">
                        {employeeDetail.assignmentHistory?.length || 0} zimmet kaydı
                      </span>
                    </h3>

                    {!employeeDetail.assignmentHistory || employeeDetail.assignmentHistory.length === 0 ? (
                      <div className="py-6 text-center text-slate-400 italic">
                        Bu personele ait zimmet kaydı bulunamadı.
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                        {employeeDetail.assignmentHistory.map((asm) => (
                          <div
                            key={asm.id}
                            className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between"
                          >
                            <div className="space-y-0.5">
                              <div className="font-semibold text-slate-800">
                                {formatDate(asm.teslimTarihi)} — Teslim Eden: {asm.teslimEden}
                              </div>
                              <div className="text-[11px] text-slate-500">
                                İçerik: {asm._count?.items || 0} Donanım, {asm._count?.accessoryItems || 0} Aksesuar, {asm._count?.consumableItems || 0} Sarf
                              </div>
                            </div>
                            <div>
                              {asm.status === 'Aktif' && (
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800">
                                  Aktif Zimmet
                                </span>
                              )}
                              {asm.status === 'KismiIade' && (
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                                  Kısmi İade
                                </span>
                              )}
                              {asm.status === 'IadeEdildi' && (
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-200 text-slate-700">
                                  İade Edildi
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Footer Actions & Status Toggle Button */}
            <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 bg-slate-50">
              {canEdit && employeeDetail ? (
                <div>
                  {employeeDetail.isActive ? (
                    <button
                      onClick={handleToggleStatusClick}
                      disabled={statusUpdating}
                      className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs transition cursor-pointer shadow-xs inline-flex items-center space-x-1.5"
                    >
                      <UserX className="w-4 h-4" />
                      <span>İşten Çıkar (Pasife Al)</span>
                    </button>
                  ) : (
                    <button
                      onClick={handleToggleStatusClick}
                      disabled={statusUpdating}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition cursor-pointer shadow-xs inline-flex items-center space-x-1.5"
                    >
                      <UserCheck className="w-4 h-4" />
                      <span>Yeniden Aktif Et</span>
                    </button>
                  )}
                </div>
              ) : (
                <div />
              )}

              <button
                onClick={() => {
                  setSelectedEmployeeId(null);
                  setEmployeeDetail(null);
                  setStatusBlockedWarning(null);
                }}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold rounded-xl text-xs transition cursor-pointer"
              >
                Kapat
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Deactivation Modal */}
      <ConfirmModal
        isOpen={isStatusConfirmOpen}
        title="Personeli İşten Çıkar"
        message={`"${employeeDetail?.fullName}" isimli personeli işten çıkarmak (durumunu pasife almak) istediğinize emin misiniz?`}
        confirmText={statusUpdating ? 'İşlem yapılıyor...' : 'Evet, İşten Çıkar'}
        confirmVariant="danger"
        onConfirm={() => handleExecuteStatusChange(false)}
        onCancel={() => setIsStatusConfirmOpen(false)}
      />

      {/* Excel Import Modal */}
      <ExcelImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        moduleKey="employee"
        moduleTitle="Personel"
        onSuccess={() => {
          fetchEmployees();
          fetchStats();
        }}
      />

      <EditEmployeeModal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setEditingEmployee(null);
        }}
        employee={editingEmployee}
        onSuccess={() => {
          fetchEmployees();
          fetchStats();
        }}
      />
    </div>
  );
}
