import React, { useState, useEffect } from 'react';
import { X, Key, Calendar, Laptop, FileText, Plus } from 'lucide-react';
import useAuthStore from '../../../store/authStore';

export default function AddSoftwareModal({ isOpen, onClose, onSuccess }) {
  const token = useAuthStore((state) => state.accessToken);

  const [formData, setFormData] = useState({
    name: '',
    license_key: '',
    start_date: new Date().toISOString().split('T')[0],
    end_date: '',
    assigned_hardware_id: '',
    notes: '',
  });

  const [hardwareOptions, setHardwareOptions] = useState([]);
  const [loadingHardware, setLoadingHardware] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      fetchHardwareList();
    }
  }, [isOpen]);

  const fetchHardwareList = async () => {
    setLoadingHardware(true);
    try {
      const res = await fetch('http://localhost:5000/api/hardware?pageSize=100', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (res.ok) {
        setHardwareOptions(data.data?.items || []);
      }
    } catch (err) {
      console.error('Donanım listesi çekilemedi:', err);
    } finally {
      setLoadingHardware(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => {
      const updated = { ...prev, [name]: value };
      // If start_date changes and end_date is before start_date, clear end_date
      if (name === 'start_date' && updated.end_date && updated.end_date < value) {
        updated.end_date = value;
      }
      return updated;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.name.trim()) {
      setError('Yazılım adı zorunludur.');
      return;
    }
    if (!formData.license_key.trim()) {
      setError('Lisans anahtarı zorunludur.');
      return;
    }
    if (!formData.start_date) {
      setError('Başlangıç tarihi zorunludur.');
      return;
    }
    if (!formData.end_date) {
      setError('Bitiş tarihi zorunludur.');
      return;
    }
    if (formData.end_date < formData.start_date) {
      setError('Bitiş tarihi başlangıç tarihinden önce olamaz.');
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        name: formData.name.trim(),
        license_key: formData.license_key.trim(),
        start_date: formData.start_date,
        end_date: formData.end_date,
        assigned_hardware_id: formData.assigned_hardware_id || null,
        notes: formData.notes.trim() || null,
      };

      const res = await fetch('http://localhost:5000/api/software', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || (data.errors && data.errors.join(', ')) || 'Yazılım eklenirken bir hata oluştu.');
      }

      onSuccess();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-lg rounded-2xl border border-[#E2E8F0] shadow-2xl overflow-hidden my-8">
        {/* Header */}
        <div className="bg-[#1E2534] text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#4F8FE0] flex items-center justify-center text-white">
              <Key className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-heading text-lg font-bold">Yeni Yazılım Lisansı Ekle</h2>
              <p className="text-xs text-slate-300">Sisteme yeni yazılım lisans bilgisi ekleyin</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-medium">
              {error}
            </div>
          )}

          {/* Yazılım Adı */}
          <div>
            <label className="block text-xs font-bold text-[#1E2534] mb-1.5">
              Yazılım Adı <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="ör. Microsoft 365 Business Standard"
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#E2E8F0] text-xs text-[#1E2534] focus:outline-hidden focus:border-[#4F8FE0] focus:ring-1 focus:ring-[#4F8FE0]"
              required
            />
          </div>

          {/* Lisans Anahtarı */}
          <div>
            <label className="block text-xs font-bold text-[#1E2534] mb-1.5">
              Lisans Anahtarı (Key) <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              name="license_key"
              value={formData.license_key}
              onChange={handleChange}
              placeholder="ör. XXXX-XXXX-XXXX-XXXX"
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#E2E8F0] text-xs font-mono text-[#1E2534] bg-slate-50/50 focus:outline-hidden focus:border-[#4F8FE0] focus:ring-1 focus:ring-[#4F8FE0]"
              required
            />
          </div>

          {/* Tarih Seçiciler */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-[#1E2534] mb-1.5 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-[#4F8FE0]" />
                Başlangıç Tarihi <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                name="start_date"
                value={formData.start_date}
                onChange={handleChange}
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#E2E8F0] text-xs text-[#1E2534] focus:outline-hidden focus:border-[#4F8FE0]"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#1E2534] mb-1.5 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-amber-500" />
                Bitiş Tarihi <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                name="end_date"
                value={formData.end_date}
                min={formData.start_date}
                onChange={handleChange}
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#E2E8F0] text-xs text-[#1E2534] focus:outline-hidden focus:border-[#4F8FE0]"
                required
              />
            </div>
          </div>

          {/* Atanan Cihaz */}
          <div>
            <label className="block text-xs font-bold text-[#1E2534] mb-1.5 flex items-center gap-1.5">
              <Laptop className="w-3.5 h-3.5 text-slate-500" />
              Atanan Cihaz (Opsiyonel)
            </label>
            <select
              name="assigned_hardware_id"
              value={formData.assigned_hardware_id}
              onChange={handleChange}
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#E2E8F0] text-xs font-medium text-[#1E2534] focus:outline-hidden focus:border-[#4F8FE0]"
              disabled={loadingHardware}
            >
              <option value="">Seçilmedi (Cihaza Bağlı Değil)</option>
              {hardwareOptions.map((hw) => (
                <option key={hw.id} value={hw.id}>
                  {hw.brand} {hw.model} ({hw.demirbasNo})
                </option>
              ))}
            </select>
          </div>

          {/* Notlar */}
          <div>
            <label className="block text-xs font-bold text-[#1E2534] mb-1.5 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-slate-400" />
              Notlar (Opsiyonel)
            </label>
            <textarea
              name="notes"
              rows="3"
              value={formData.notes}
              onChange={handleChange}
              placeholder="Lisans yenileme detayları veya fatura no..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#E2E8F0] text-xs text-[#1E2534] focus:outline-hidden focus:border-[#4F8FE0]"
            />
          </div>

          {/* Buttons */}
          <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            >
              İptal
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#4F8FE0] hover:bg-[#3D75C4] active:bg-[#3566AD] text-white text-xs font-bold shadow-sm transition-all cursor-pointer disabled:opacity-50"
            >
              <Plus className="w-4 h-4" />
              {isSubmitting ? 'Kaydediliyor...' : 'Yazılım Kaydet'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
