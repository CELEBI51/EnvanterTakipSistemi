import React, { useState } from 'react';
import { X, CheckCircle2, Plus } from 'lucide-react';
import useAuthStore from '../../../store/authStore';
import { API_BASE_URL } from '../../../config';
import AddComponentToMaintenanceModal from './AddComponentToMaintenanceModal';

const MAINTENANCE_TYPES = [
  'Periyodik Bakım',
  'Arıza Onarımı',
  'Parça Değişimi',
  'Temizlik',
  'Yazılım Güncelleme',
  'Diğer',
];

export default function AddMaintenanceModal({ isOpen, onClose, hardwareId, onSuccess }) {
  const token = useAuthStore((state) => state.accessToken);

  const todayStr = new Date().toISOString().slice(0, 10);
  const [name, setName] = useState('');
  const [maintenanceType, setMaintenanceType] = useState('Periyodik Bakım');
  const [customTypeNote, setCustomTypeNote] = useState('');
  const [startDate, setStartDate] = useState(todayStr);
  const [endDate, setEndDate] = useState('');
  const [cost, setCost] = useState('');
  const [notes, setNotes] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [createdMaintenance, setCreatedMaintenance] = useState(null);
  const [isAddComponentModalOpen, setIsAddComponentModalOpen] = useState(false);

  if (!isOpen) return null;

  const resetForm = () => {
    setName('');
    setMaintenanceType('Periyodik Bakım');
    setCustomTypeNote('');
    setStartDate(todayStr);
    setEndDate('');
    setCost('');
    setNotes('');
    setError('');
    setCreatedMaintenance(null);
  };

  const handleClose = () => {
    resetForm();
    if (onClose) onClose();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!name || !name.trim()) {
      setError('Bakım kaydı adı zorunludur.');
      return;
    }

    if (maintenanceType === 'Diğer' && (!customTypeNote || !customTypeNote.trim())) {
      setError("Bakım türü 'Diğer' seçildiğinde açıklama notu zorunludur.");
      return;
    }

    if (endDate && endDate < startDate) {
      setError('Bitiş tarihi başlangıç tarihinden önce olamaz.');
      return;
    }

    setLoading(true);

    const payload = {
      name: name.trim(),
      hardwareId,
      maintenanceType,
      customTypeNote: maintenanceType === 'Diğer' ? customTypeNote.trim() : undefined,
      startDate,
      endDate: endDate || undefined,
      cost: cost ? Number(cost) : undefined,
      notes: notes.trim() || undefined,
    };

    try {
      const res = await fetch(`${API_BASE_URL}/maintenance`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Bakım kaydı oluşturulurken hata oluştu.');
      }

      setCreatedMaintenance(data.data);
      if (onSuccess) onSuccess();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-[#1E2534] text-white">
          <div>
            <h2 className="font-heading text-base font-bold">
              {createdMaintenance ? 'Bakım Kaydı Oluşturuldu' : 'Yeni Bakım İşlemi Oluştur'}
            </h2>
            <p className="text-xs text-slate-300">Varlık için periyodik veya arıza bakım kaydı açın.</p>
          </div>
          <button
            onClick={handleClose}
            className="w-8 h-8 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 flex items-center justify-center transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        {createdMaintenance ? (
          <div className="p-6 flex flex-col items-center justify-center space-y-4 text-center overflow-y-auto">
            <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-7 h-7" />
            </div>

            <div>
              <h3 className="font-heading text-base font-bold text-[#1E2534]">Bakım İşlemi Başlatıldı!</h3>
              {!createdMaintenance.endDate ? (
                <p className="text-xs text-blue-700 bg-blue-50 border border-blue-200 px-3 py-2 rounded-xl mt-2 font-medium">
                  ℹ️ Bu varlığın durumu artık <strong>"Serviste"</strong> olarak güncellendi.
                </p>
              ) : (
                <p className="text-xs text-slate-500 mt-1">Bakım kaydı başarıyla kaydedildi.</p>
              )}
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 w-full pt-2">
              <button
                type="button"
                onClick={() => setIsAddComponentModalOpen(true)}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#4F8FE0] hover:bg-[#3D75C4] text-white text-xs font-bold transition cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                Şimdi Bileşen Ekle
              </button>
              <button
                type="button"
                onClick={handleClose}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition cursor-pointer"
              >
                Kapat
              </button>
            </div>

            {/* Sub-modal for components */}
            <AddComponentToMaintenanceModal
              isOpen={isAddComponentModalOpen}
              onClose={() => {
                setIsAddComponentModalOpen(false);
                handleClose();
              }}
              maintenanceId={createdMaintenance.id}
              onSuccess={() => {
                setIsAddComponentModalOpen(false);
                handleClose();
              }}
            />
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 flex-1">
            {error && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-medium">
                {error}
              </div>
            )}

            {/* Bakım Adı */}
            <div>
              <label className="block text-xs font-bold text-[#1E2534] mb-1">
                Bakım Kaydı Adı <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder=""
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-[#1E2534]"
              />
            </div>

            {/* Bakım Tipi */}
            <div>
              <label className="block text-xs font-bold text-[#1E2534] mb-1">
                Bakım Tipi <span className="text-rose-500">*</span>
              </label>
              <select
                value={maintenanceType}
                onChange={(e) => setMaintenanceType(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-medium text-[#1E2534]"
              >
                {MAINTENANCE_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            {maintenanceType === 'Diğer' && (
              <div>
                <label className="block text-xs font-bold text-[#1E2534] mb-1">
                  Bakım Türü Açıklaması <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={customTypeNote}
                  onChange={(e) => setCustomTypeNote(e.target.value)}
                  placeholder=""
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-[#1E2534]"
                />
              </div>
            )}

            {/* Tarihler */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-[#1E2534] mb-1">
                  Başlangıç Tarihi <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-[#1E2534]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#1E2534] mb-1">
                  Bitiş Tarihi
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-[#1E2534]"
                />
                <span className="text-[10px] text-slate-400 block mt-1">
                  💡 Bakım hâlâ devam ediyorsa boş bırakın.
                </span>
              </div>
            </div>

            {/* Maliyet */}
            <div>
              <label className="block text-xs font-bold text-[#1E2534] mb-1">
                Bakım Maliyeti (₺)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={cost}
                onChange={(e) => setCost(e.target.value)}
                placeholder=""
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-[#1E2534]"
              />
            </div>

            {/* Notlar */}
            <div>
              <label className="block text-xs font-bold text-[#1E2534] mb-1">
                Notlar / Açıklama
              </label>
              <textarea
                rows="2"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder=""
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-[#1E2534]"
              ></textarea>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2.5 text-xs font-semibold text-slate-600 hover:text-slate-800 transition cursor-pointer"
              >
                İptal
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-5 py-2.5 text-xs font-bold text-white bg-[#4F8FE0] hover:bg-[#3D75C4] rounded-xl shadow-xs disabled:opacity-50 transition cursor-pointer"
              >
                {loading ? 'Kaydediliyor...' : 'Bakım Başlat / Kaydet'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
