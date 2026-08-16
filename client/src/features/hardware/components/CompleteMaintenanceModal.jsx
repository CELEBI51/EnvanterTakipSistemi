import React, { useState } from 'react';
import { X, CheckCircle2 } from 'lucide-react';
import useAuthStore from '../../../store/authStore';

const RESULT_STATUS_OPTIONS = [
  { label: 'Hazır (Boşta / Sağlam)', value: 'Hazır' },
  { label: 'Arızalı (Onarılamadı)', value: 'Arızalı' },
  { label: 'Kullanım Dışı (Hurda)', value: 'Kullanım Dışı' },
];

export default function CompleteMaintenanceModal({ isOpen, onClose, maintenance, onSuccess }) {
  const token = useAuthStore((state) => state.accessToken);

  const todayStr = new Date().toISOString().slice(0, 10);
  const [endDate, setEndDate] = useState(todayStr);
  const [resultStatus, setResultStatus] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  if (!isOpen || !maintenance) return null;

  const isKullanimda = maintenance.previousHardwareStatus === 'Kullanımda';
  const needsStatusSelection = !isKullanimda;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!endDate) {
      setError('Bitiş tarihi zorunludur.');
      return;
    }

    if (needsStatusSelection && !resultStatus) {
      setError(
        maintenance.previousHardwareStatus === 'Arızalı'
          ? 'Bu varlık arızalı durumdayken bakıma alınmıştı. Lütfen bakım sonucu varlık durumunu seçin.'
          : 'Lütfen bakım sonrası varlık durumunu seçin.'
      );
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(`http://localhost:5000/api/maintenance/${maintenance.id}/complete`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          endDate,
          resultStatus: needsStatusSelection ? resultStatus : undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Bakım tamamlanırken hata oluştu.');
      }

      const appliedStatus = data.data?.appliedResultStatus || (needsStatusSelection ? resultStatus : 'Kullanımda');
      setSuccessMessage(`Bakım tamamlandı! Varlık durumu "${appliedStatus}" olarak güncellendi.`);

      setTimeout(() => {
        setSuccessMessage('');
        onSuccess();
      }, 1500);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-md overflow-hidden flex flex-col my-8">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-[#1E2534] text-white">
          <div>
            <h3 className="font-heading text-base font-bold">Bakımı Tamamla</h3>
            <p className="text-xs text-slate-300 truncate max-w-[240px]">{maintenance.name}</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 flex items-center justify-center transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-medium">
              {error}
            </div>
          )}

          {successMessage && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-bold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Durum Bilgi Notu */}
          {isKullanimda ? (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-900">
              ℹ️ Varlık zimmetli olduğundan bakım sonrası otomatik olarak <strong>"Kullanımda"</strong> durumuna dönecektir.
            </div>
          ) : maintenance.previousHardwareStatus === 'Arızalı' ? (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 space-y-1">
              <p className="font-bold">⚠️ Arızalı Varlık Uyarısı</p>
              <p>
                Bu varlık arızalı durumdayken bakıma alınmıştı. Bakım sonucunda varlığın durumunu (Hazır / Arızalı / Kullanım Dışı) seçmelisiniz.
              </p>
            </div>
          ) : (
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700">
              ℹ️ Varlık bakıma girmeden önce <strong>"Hazır"</strong> durumundaydı. Bakım sonrası yeni durumunu aşağıdan seçiniz.
            </div>
          )}

          {/* Bitiş Tarihi */}
          <div>
            <label className="block text-xs font-bold text-[#1E2534] mb-1">
              Bitiş Tarihi <span className="text-rose-500">*</span>
            </label>
            <input
              type="date"
              required
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-[#1E2534]"
            />
          </div>

          {/* Bakım Sonucu Durum (previousHardwareStatus !== 'Kullanımda' ise görünür) */}
          {needsStatusSelection && (
            <div>
              <label className="block text-xs font-bold text-[#1E2534] mb-1">
                Bakım Sonrası Durum <span className="text-rose-500">*</span>
              </label>
              <select
                value={resultStatus}
                onChange={(e) => setResultStatus(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-medium text-[#1E2534]"
              >
                <option value="">Seçiniz...</option>
                {RESULT_STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-xs font-semibold text-slate-600 hover:text-slate-800 transition cursor-pointer"
            >
              İptal
            </button>
            <button
              type="submit"
              disabled={loading || (needsStatusSelection && !resultStatus)}
              className="px-5 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs disabled:opacity-50 transition cursor-pointer"
            >
              {loading ? 'Tamamlanıyor...' : 'Bakımı Tamamla'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
