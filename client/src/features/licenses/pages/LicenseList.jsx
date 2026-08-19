import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Plus,
  Search,
  ChevronLeft,
  ChevronRight,
  Download,
  Eye,
  Clock,
  Filter,
  Building2,
  CreditCard,
  AlertTriangle,
  RefreshCw,
  FileSpreadsheet,
} from 'lucide-react';
import useAuthStore from '../../../store/authStore';
import { hasPermission } from '../../../utils/permissions';
import EmptyState from '../../../components/common/EmptyState';

import AddLicenseModal from '../components/AddLicenseModal';
import LicenseDetailModal from '../components/LicenseDetailModal';
import ExcelImportModal from '../../../components/common/ExcelImportModal';
import ExcelExportButton from '../../../components/common/ExcelExportButton';

import { getLicenseStatusLabel } from '../../../constants/licenseStatusLabels';

const STATUS_OPTIONS = [
  { value: '', label: 'Tüm Durumlar' },
  { value: 'AKTIF', label: 'Aktif' },
  { value: 'YENILENDI', label: 'Yenilendi' },
  { value: 'SURESI_DOLDU', label: 'Süresi Doldu' },
  { value: 'YENILENMEDI', label: 'Yenilenmedi' },
  { value: 'YENILENMEYECEK', label: 'Yenilenmeyecek' },
  { value: 'IPTAL_EDILDI', label: 'İptal Edildi / Yenilenmeyecek' },
];

const PAYMENT_TYPE_OPTIONS = [
  { value: '', label: 'Tüm Ödeme Tipleri' },
  { value: 'KREDI_KARTI', label: 'Kredi Kartı' },
  { value: 'NAKIT', label: 'Nakit' },
  { value: 'VADELI', label: 'Vadeli' },
];

export default function LicenseList() {
  const [searchParams] = useSearchParams();
  const licenseIdParam = searchParams.get('licenseId') || searchParams.get('id');

  const token = useAuthStore((state) => state.accessToken);
  const user = useAuthStore((state) => state.user);

  const [items, setItems] = useState([]);
  const [units, setUnits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUnitId, setSelectedUnitId] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedPaymentType, setSelectedPaymentType] = useState('');

  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const [stats, setStats] = useState({ total: 0, expiringSoon: 0, cancelled: 0 });

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedLicenseId, setSelectedLicenseId] = useState(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  const canCreate = hasPermission(user, 'licenses:create');
  const canManage = hasPermission(user, 'licenses:manage');
  const canExcel = hasPermission(user, 'excel:view');

  useEffect(() => {
    fetchUnits();
    fetchStats();
  }, []);

  useEffect(() => {
    if (licenseIdParam) {
      setSelectedLicenseId(licenseIdParam);
      setIsDetailModalOpen(true);
    }
  }, [licenseIdParam]);

  const fetchStats = async () => {
    try {
      const res = await fetch('http://localhost:4001/api/licenses/stats', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok && data.data) {
        setStats(data.data);
      }
    } catch (err) {
      console.error('Lisans istatistikleri alınamadı:', err);
    }
  };

  const fetchUnits = async () => {
    try {
      const res = await fetch('http://localhost:4001/api/units', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok && data.data) {
        setUnits(data.data);
      }
    } catch (err) {
      console.error('Birimler yüklenirken hata:', err);
    }
  };

  const fetchLicenses = async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      params.append('page', page);
      params.append('pageSize', 10);

      if (selectedUnitId) params.append('unitId', selectedUnitId);
      if (selectedStatus) params.append('status', selectedStatus);
      if (selectedPaymentType) params.append('paymentType', selectedPaymentType);
      if (searchQuery.trim()) params.append('q', searchQuery.trim());

      const res = await fetch(`http://localhost:4001/api/licenses?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.message || 'Lisanslar listelenirken hata oluştu.');

      setItems(data.data || []);
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
    fetchLicenses();
  }, [page, selectedUnitId, selectedStatus, selectedPaymentType]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchLicenses();
  };

  const exportToCSV = () => {
    if (!items.length) return;
    const headers = [
      'Birim',
      'Marka',
      'Ürün Bilgisi',
      'Lisans Anahtarı',
      'Başlangıç Tarihi',
      'Bitiş Tarihi',
      'Kalan Gün',
      'Ödeme Tipi',
      'Durum',
      'Fatura No',
      'Fatura Tutarı',
    ];
    const rows = items.map((i) => [
      i.unit?.name || '-',
      i.brand,
      i.productInfo,
      i.licenseKey || '',
      i.startDate ? new Date(i.startDate).toLocaleDateString('tr-TR') : '',
      i.endDate ? new Date(i.endDate).toLocaleDateString('tr-TR') : '',
      i.daysRemaining !== undefined ? i.daysRemaining : '',
      i.paymentType === 'KREDI_KARTI' ? 'Kredi Kartı' : i.paymentType === 'NAKIT' ? 'Nakit' : 'Vadeli',
      getStatusLabel(i.status),
      i.invoiceNumber || '',
      i.invoiceAmount ? `${i.invoiceAmount} TL` : '',
    ]);
    const csvContent =
      'data:text/csv;charset=utf-8,\uFEFF' +
      [headers.join(','), ...rows.map((e) => e.map((x) => `"${x}"`).join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `DITAS_Lisans_Yenileme_Takip_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'AKTIF':
        return (
          <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 inline-flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Aktif
          </span>
        );
      case 'YENILENDI':
        return (
          <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 inline-flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Yenilendi
          </span>
        );
      case 'YENILENMEDI':
        return (
          <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200 inline-flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span> Yenilenmedi
          </span>
        );
      case 'YENILENMEYECEK':
        return (
          <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200 inline-flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span> Yenilenmeyecek
          </span>
        );
      case 'IPTAL_EDILDI':
        return (
          <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-slate-100 text-slate-600 border border-slate-200 inline-flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span> İptal Edildi
          </span>
        );
      case 'SURESI_DOLDU':
        return (
          <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200 inline-flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span> Süresi Doldu
          </span>
        );
      default:
        return <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-slate-100 text-slate-700">{getLicenseStatusLabel(status)}</span>;
    }
  };

  const getStatusLabel = (status) => getLicenseStatusLabel(status);

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">
            Envanter Takip Sistemi • Yazılım Lisans Yönetimi
          </span>
          <h1 className="text-2xl font-bold font-heading text-[#1E2534]">
            Lisans Takip & Yenileme
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Birim bazlı yazılım lisansı yenileme takibi ve fatura kayıtları.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <ExcelExportButton
            modulePath="licenses"
            queryParams={{
              unitId: selectedUnitId,
              status: selectedStatus,
              paymentType: selectedPaymentType,
              q: searchQuery,
            }}
            fileNamePrefix="lisans"
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
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#4F8FE0] hover:bg-[#3D75C4] text-white text-xs font-bold shadow-xs transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Yeni Lisans Ekle
            </button>
          )}
        </div>

      </div>

      {/* Statistics Summary Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        {/* Toplam Lisans */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 border-l-4 border-l-[#4C82F7] shadow-xs flex flex-col justify-between">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">
            Toplam Lisans
          </span>
          <div className="text-2xl font-bold font-heading text-[#1E2534]">
            {stats.total}
          </div>
        </div>

        {/* Süresi Yaklaşan */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 border-l-4 border-l-[#F59E0B] shadow-xs flex flex-col justify-between">
          <span className="text-xs font-bold text-[#F59E0B] uppercase tracking-wider block mb-1 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-[#F59E0B]" /> Süresi Yaklaşan (&le; 15 Gün)
          </span>
          <div className="text-2xl font-bold font-heading text-[#F59E0B]">
            {stats.expiringSoon}
          </div>
        </div>

        {/* Süresi Dolmuş */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 border-l-4 border-l-[#F87171] shadow-xs flex flex-col justify-between">
          <span className="text-xs font-bold text-[#F87171] uppercase tracking-wider block mb-1 flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 text-[#F87171]" /> Süresi Dolmuş
          </span>
          <div className="text-2xl font-bold font-heading text-[#F87171]">
            {stats.expired || 0}
          </div>
        </div>

        {/* İptal Edilmiş / Yenilenmeyecek */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 border-l-4 border-l-[#64748B] shadow-xs flex flex-col justify-between">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">
            İptal Edilmiş / Yenilenmeyecek
          </span>
          <div className="text-2xl font-bold font-heading text-[#64748B]">
            {stats.cancelled}
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <form onSubmit={handleSearchSubmit} className="flex flex-col md:flex-row gap-3">
          {/* Arama Kutusu */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Marka, ürün bilgisi, lisans anahtarı veya fatura no ile ara..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-xs font-medium text-[#1E2534] focus:border-[#4F8FE0] focus:bg-white transition"
            />
          </div>

          <button
            type="submit"
            className="px-5 py-2.5 rounded-xl bg-[#1E2534] hover:bg-slate-800 text-white text-xs font-bold transition cursor-pointer shrink-0"
          >
            Ara
          </button>
        </form>

        {/* Dropdown Filtreler */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-100">
          {/* Birim Filtresi */}
          <div className="flex items-center gap-2 bg-slate-50 px-3 py-2 rounded-xl border border-slate-200">
            <Building2 className="w-4 h-4 text-slate-400 shrink-0" />
            <select
              value={selectedUnitId}
              onChange={(e) => {
                setSelectedUnitId(e.target.value);
                setPage(1);
              }}
              className="w-full bg-transparent text-xs font-semibold text-[#1E2534] focus:outline-none cursor-pointer"
            >
              <option value="">Tüm Birimler</option>
              {units.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
          </div>

          {/* Durum Filtresi */}
          <div className="flex items-center gap-2 bg-slate-50 px-3 py-2 rounded-xl border border-slate-200">
            <Filter className="w-4 h-4 text-slate-400 shrink-0" />
            <select
              value={selectedStatus}
              onChange={(e) => {
                setSelectedStatus(e.target.value);
                setPage(1);
              }}
              className="w-full bg-transparent text-xs font-semibold text-[#1E2534] focus:outline-none cursor-pointer"
            >
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Ödeme Tipi Filtresi */}
          <div className="flex items-center gap-2 bg-slate-50 px-3 py-2 rounded-xl border border-slate-200">
            <CreditCard className="w-4 h-4 text-slate-400 shrink-0" />
            <select
              value={selectedPaymentType}
              onChange={(e) => {
                setSelectedPaymentType(e.target.value);
                setPage(1);
              }}
              className="w-full bg-transparent text-xs font-semibold text-[#1E2534] focus:outline-none cursor-pointer"
            >
              {PAYMENT_TYPE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Table Section */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-xs font-semibold text-slate-400">Lisans kayıtları yükleniyor...</div>
        ) : error ? (
          <div className="p-6 text-center text-xs font-semibold text-rose-600">{error}</div>
        ) : items.length === 0 ? (
          <EmptyState
            title="Kayıtlı Lisans Bulunamadı"
            description="Seçilen filtrelere uygun herhangi bir lisans kaydı bulunamadı."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3.5 px-4">Birim</th>
                  <th className="py-3.5 px-4">Marka</th>
                  <th className="py-3.5 px-4">Ürün Bilgisi</th>
                  <th className="py-3.5 px-4">Bitiş Tarihi</th>
                  <th className="py-3.5 px-4">Durum</th>
                  <th className="py-3.5 px-4">Fatura No</th>
                  <th className="py-3.5 px-4 text-right">İşlemler</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {items.map((item) => {
                  const daysLeft = item.daysRemaining !== undefined ? item.daysRemaining : 999;
                  const isExpiringSoon = daysLeft <= 15 && item.status !== 'IPTAL_EDILDI';

                  return (
                    <tr
                      key={item.id}
                      onClick={() => {
                        setSelectedLicenseId(item.id);
                        setIsDetailModalOpen(true);
                      }}
                      className={`transition cursor-pointer ${
                        isExpiringSoon
                          ? 'bg-amber-50/60 hover:bg-amber-100/50'
                          : 'hover:bg-slate-50/80'
                      }`}
                    >
                      {/* Birim */}
                      <td className="py-3.5 px-4 font-semibold text-slate-700">
                        {item.unit?.name || '-'}
                      </td>

                      {/* Marka */}
                      <td className="py-3.5 px-4 font-bold text-[#1E2534]">
                        {item.brand}
                      </td>

                      {/* Ürün Bilgisi */}
                      <td className="py-3.5 px-4 text-slate-600 font-medium">
                        {item.productInfo}
                        {item.licenseKey && (
                          <div className="text-[11px] font-mono text-slate-400 mt-0.5 truncate max-w-[200px]">
                            Key: {item.licenseKey}
                          </div>
                        )}
                      </td>

                      {/* Bitiş Tarihi & Yaklaşan Uyarı Vurgusu */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="font-semibold text-slate-800">
                          {item.endDate ? new Date(item.endDate).toLocaleDateString('tr-TR') : '-'}
                        </div>
                        {isExpiringSoon && (
                          <div className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 mt-0.5">
                            <Clock className="w-3 h-3 text-amber-600" />
                            {daysLeft < 0
                              ? `${Math.abs(daysLeft)} gün önce doldu!`
                              : daysLeft === 0
                              ? 'Bugün son gün!'
                              : `${daysLeft} gün kaldı`}
                          </div>
                        )}
                      </td>

                      {/* Durum */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {getStatusBadge(item.status)}
                      </td>

                      {/* Fatura No */}
                      <td className="py-3.5 px-4 font-mono text-slate-600">
                        {item.invoiceNumber || '-'}
                      </td>

                      {/* İşlemler */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedLicenseId(item.id);
                            setIsDetailModalOpen(true);
                          }}
                          className="p-1.5 text-slate-400 hover:text-[#4F8FE0] hover:bg-[#EAF2FC] rounded-lg transition"
                          title="Detay Görüntüle"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Sayfalama (Pagination) */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-slate-100 flex items-center justify-between gap-4 text-xs font-semibold text-slate-600 bg-slate-50/50">
            <div>
              Toplam <span className="font-bold text-[#1E2534]">{totalCount}</span> kayıttan{' '}
              <span className="font-bold text-[#1E2534]">{(page - 1) * 10 + 1}</span> -{' '}
              <span className="font-bold text-[#1E2534]">{Math.min(page * 10, totalCount)}</span> arası gösteriliyor
            </div>

            <div className="flex items-center gap-1.5">
              <button
                disabled={page <= 1}
                onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <span className="px-3 py-1 bg-white border border-slate-200 rounded-xl text-xs font-bold text-[#1E2534]">
                {page} / {totalPages}
              </span>

              <button
                disabled={page >= totalPages}
                onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      <AddLicenseModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={() => {
          setIsAddModalOpen(false);
          fetchLicenses();
          fetchStats();
        }}
      />

      <LicenseDetailModal
        isOpen={isDetailModalOpen}
        licenseId={selectedLicenseId}
        onClose={() => {
          setIsDetailModalOpen(false);
          setSelectedLicenseId(null);
        }}
        onSuccess={() => {
          setIsDetailModalOpen(false);
          setSelectedLicenseId(null);
          fetchLicenses();
          fetchStats();
        }}
      />

      <ExcelImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        moduleKey="license"
        moduleTitle="Yazılım Lisansları"
        onSuccess={fetchLicenses}
      />
    </div>
  );
}
