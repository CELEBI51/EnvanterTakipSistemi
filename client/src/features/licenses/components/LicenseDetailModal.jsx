import React, { useEffect, useState } from 'react';
import { X, Calendar, Key, CheckCircle, Ban, FileText, Building2, CreditCard, Clock } from 'lucide-react';
import useAuthStore from '../../../store/authStore';
import { API_BASE_URL } from '../../../config';
import { hasPermission } from '../../../utils/permissions';
import AttachmentList from '../../../components/common/AttachmentList';
import ConfirmModal from '../../../components/common/ConfirmModal';
import { getLicenseStatusLabel } from '../../../constants/licenseStatusLabels';
import { formatCurrency } from '../../../utils/currency';

export default function LicenseDetailModal({ isOpen, onClose, licenseId, onSuccess }) {
  const token = useAuthStore((state) => state.accessToken);
  const user = useAuthStore((state) => state.user);

  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Status Action States
  const [showRenewForm, setShowRenewForm] = useState(false);
  const [newEndDate, setNewEndDate] = useState('');
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState('');

  const canEdit = hasPermission(user, 'licenses:manage');

  useEffect(() => {
    if (isOpen && licenseId) {
      fetchDetail();
      setShowRenewForm(false);
      setNewEndDate('');
      setShowCancelConfirm(false);
      setActionError('');
    }
  }, [isOpen, licenseId]);

  const fetchDetail = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE_URL}/licenses/${licenseId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Lisans detayı alınamadı.');
      setItem(data.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const handleRenewSubmit = async (e) => {
    e.preventDefault();
    setActionError('');

    if (!newEndDate) {
      setActionError('Lütfen yeni bitiş tarihini giriniz.');
      return;
    }

    setActionLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/licenses/${licenseId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          status: 'YENILENDI',
          newEndDate,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Lisans yenilenirken hata oluştu.');

      onSuccess();
      onClose();
    } catch (err) {
      setActionError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelConfirm = async () => {
    setActionError('');
    setActionLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/licenses/${licenseId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          status: 'IPTAL_EDILDI',
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Lisans iptal edilirken hata oluştu.');

      onSuccess();
      onClose();
    } catch (err) {
      setActionError(err.message);
      setShowCancelConfirm(false);
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'AKTIF':
        return (
          <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-blue-100 text-blue-800 border border-blue-200 inline-flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-600"></span> Aktif
          </span>
        );
      case 'YENILENDI':
        return (
          <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 inline-flex items-center gap-1">
            <CheckCircle className="w-3.5 h-3.5" /> Yenilendi
          </span>
        );
      case 'IPTAL_EDILDI':
        return (
          <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-slate-100 text-slate-700 border border-slate-300 inline-flex items-center gap-1">
            <Ban className="w-3.5 h-3.5" /> İptal Edildi / Yenilenmeyecek
          </span>
        );
      case 'SURESI_DOLDU':
        return (
          <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-red-100 text-red-700 border border-red-300 inline-flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-red-600"></span> Süresi Doldu
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-slate-100 text-slate-700">
            {getLicenseStatusLabel(status)}
          </span>
        );
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 bg-[#1E2534] text-white shrink-0">
            <div>
              <span className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider block">
                Lisans Detayı
              </span>
              <h2 className="font-heading text-base font-bold">
                {item ? `${item.brand} - ${item.productInfo}` : 'Yükleniyor...'}
              </h2>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 flex items-center justify-center transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="p-6 overflow-y-auto space-y-5 flex-1">
            {loading ? (
              <div className="py-12 text-center text-xs font-semibold text-slate-400">
                Lisans bilgileri yükleniyor...
              </div>
            ) : error ? (
              <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-semibold">
                {error}
              </div>
            ) : item ? (
              <>
                {actionError && (
                  <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-semibold">
                    {actionError}
                  </div>
                )}

                {/* Status Bar */}
                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-600">Mevcut Durum:</span>
                    {getStatusBadge(item.status)}
                  </div>
                  {item.daysRemaining !== undefined && (
                    <div className="text-xs font-semibold text-slate-600 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      Kalan Süre:{' '}
                      <span className="font-bold text-[#1E2534]">
                        {item.daysRemaining < 0
                          ? `${Math.abs(item.daysRemaining)} gün önce doldu`
                          : `${item.daysRemaining} gün`}
                      </span>
                    </div>
                  )}
                </div>

                {/* Grid Details */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  {/* Birim */}
                  <div className="p-3.5 bg-slate-50/50 rounded-xl border border-slate-100">
                    <div className="text-slate-400 font-semibold mb-1 flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5" /> Birim / Departman
                    </div>
                    <div className="font-bold text-[#1E2534]">{item.unit?.name || '-'}</div>
                  </div>

                  {/* Ödeme Tipi */}
                  <div className="p-3.5 bg-slate-50/50 rounded-xl border border-slate-100">
                    <div className="text-slate-400 font-semibold mb-1 flex items-center gap-1.5">
                      <CreditCard className="w-3.5 h-3.5" /> Ödeme Tipi
                    </div>
                    <div className="font-bold text-[#1E2534]">
                      {item.paymentType === 'KREDI_KARTI'
                        ? 'Kredi Kartı'
                        : item.paymentType === 'NAKIT'
                        ? 'Nakit'
                        : 'Vadeli'}
                    </div>
                  </div>

                  {/* Başlangıç Tarihi */}
                  <div className="p-3.5 bg-slate-50/50 rounded-xl border border-slate-100">
                    <div className="text-slate-400 font-semibold mb-1 flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5" /> Başlangıç Tarihi
                    </div>
                    <div className="font-bold text-[#1E2534]">
                      {item.startDate ? new Date(item.startDate).toLocaleDateString('tr-TR') : '-'}
                    </div>
                  </div>

                  {/* Bitiş Tarihi */}
                  <div className="p-3.5 bg-slate-50/50 rounded-xl border border-slate-100">
                    <div className="text-slate-400 font-semibold mb-1 flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5" /> Bitiş Tarihi
                    </div>
                    <div className="font-bold text-[#1E2534]">
                      {item.endDate ? new Date(item.endDate).toLocaleDateString('tr-TR') : '-'}
                    </div>
                  </div>
                </div>

                {/* Lisans Anahtarı */}
                <div className="p-3.5 bg-slate-50/50 rounded-xl border border-slate-100 text-xs">
                  <div className="text-slate-400 font-semibold mb-1 flex items-center gap-1.5">
                    <Key className="w-3.5 h-3.5" /> Lisans Anahtarı
                  </div>
                  <div className="font-mono text-xs font-bold text-[#1E2534] bg-white p-2.5 rounded-lg border border-slate-200 break-all select-all">
                    {item.licenseKey || 'Lisans anahtarı tanımlanmamış'}
                  </div>
                </div>

                {/* Fatura Bilgileri */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div className="p-3.5 bg-slate-50/50 rounded-xl border border-slate-100">
                    <div className="text-slate-400 font-semibold mb-1">Fatura Numarası</div>
                    <div className="font-mono font-bold text-[#1E2534]">
                      {item.invoiceNumber || '-'}
                    </div>
                  </div>

                  <div className="p-3.5 bg-slate-50/50 rounded-xl border border-slate-100">
                    <div className="text-slate-400 font-semibold mb-1">Fatura Tutarı</div>
                    <div className="font-bold text-[#1E2534]">
                      {formatCurrency(item.invoiceAmount)}
                    </div>
                  </div>
                </div>

                {/* Notlar */}
                {item.notes && (
                  <div className="p-3.5 bg-slate-50/50 rounded-xl border border-slate-100 text-xs">
                    <div className="text-slate-400 font-semibold mb-1 flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5" /> Notlar
                    </div>
                    <div className="text-slate-700 font-medium whitespace-pre-wrap">{item.notes}</div>
                  </div>
                )}

                {/* Attachments / Ek Dosyalar */}
                <div>
                  <div className="text-xs font-bold text-[#1E2534] mb-2">Fatura Belgesi & Ekler</div>
                  <AttachmentList attachments={item.attachments || []} />
                </div>

                {/* Action Section for Admin & IT Staff */}
                {canEdit && (
                  <div className="pt-4 border-t border-slate-100 space-y-3">
                    <div className="text-xs font-bold text-slate-700">Lisans Durum İşlemleri:</div>

                    {!showRenewForm ? (
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => setShowRenewForm(true)}
                          className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#4F8FE0] hover:bg-[#3D75C4] text-white text-xs font-bold transition cursor-pointer shadow-xs"
                        >
                          <CheckCircle className="w-4 h-4" />
                          {item.status === 'YENILENDI' ? 'Tekrar Yenile' : 'Yenilendi Olarak İşaretle'}
                        </button>

                        {item.status !== 'IPTAL_EDILDI' && (
                          <button
                            type="button"
                            onClick={() => setShowCancelConfirm(true)}
                            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-rose-300 text-rose-700 hover:bg-rose-50 text-xs font-bold transition cursor-pointer"
                          >
                            <Ban className="w-4 h-4" />
                            İptal Et
                          </button>
                        )}
                      </div>
                    ) : (
                      /* Inline Renew Form */
                      <form onSubmit={handleRenewSubmit} className="p-4 bg-blue-50/50 rounded-xl border border-blue-200 space-y-3">
                        <div className="flex items-center justify-between text-xs font-bold text-[#1E2534]">
                          <span>Lisans Yenileme - Yeni Bitiş Tarihi Giriniz</span>
                          <button
                            type="button"
                            onClick={() => setShowRenewForm(false)}
                            className="text-slate-400 hover:text-slate-600"
                          >
                            Vazgeç
                          </button>
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-slate-600 mb-1">
                            Yeni Bitiş Tarihi <span className="text-rose-500">*</span>
                          </label>
                          <input
                            type="date"
                            required
                            value={newEndDate}
                            onChange={(e) => setNewEndDate(e.target.value)}
                            className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-medium text-[#1E2534] bg-white focus:border-[#4F8FE0]"
                          />
                        </div>

                        <div className="flex justify-end gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => setShowRenewForm(false)}
                            className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-800"
                          >
                            İptal
                          </button>
                          <button
                            type="submit"
                            disabled={actionLoading}
                            className="px-4 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs disabled:opacity-50 transition cursor-pointer"
                          >
                            {actionLoading ? 'Kaydediliyor...' : 'Yenilemeyi Onayla'}
                          </button>
                        </div>
                      </form>
                    )}
                  </div>
                )}
              </>
            ) : null}
          </div>
        </div>
      </div>

      {/* Cancel Confirmation Modal */}
      <ConfirmModal
        isOpen={showCancelConfirm}
        onClose={() => setShowCancelConfirm(false)}
        onConfirm={handleCancelConfirm}
        title="Lisans İptali"
        message="Bu lisansı iptal etmek istediğinize emin misiniz? Bu işlem geri alınamaz."
        confirmText="Evet, İptal Et"
        confirmButtonClass="bg-rose-600 hover:bg-rose-700 text-white"
        loading={actionLoading}
      />
    </>
  );
}
