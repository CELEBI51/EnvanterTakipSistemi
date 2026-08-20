import React, { useState, useEffect } from 'react';
import { X, Wrench, Info } from 'lucide-react';

const MAINTENANCE_TYPES = [
  'Periyodik Bakım',
  'Arıza Onarımı',
  'Parça Değişimi',
  'Temizlik',
  'Yazılım Güncelleme',
  'Diğer',
];

export default function PendingMaintenanceFormModal({
  isOpen,
  onClose,
  onSave,
  hardwareName,
}) {
  const todayStr = new Date().toISOString().slice(0, 10);

  const [name, setName] = useState('');
  const [maintenanceType, setMaintenanceType] = useState('Periyodik Bakım');
  const [customTypeNote, setCustomTypeNote] = useState('');
  const [startDate, setStartDate] = useState(todayStr);
  const [endDate, setEndDate] = useState('');
  const [cost, setCost] = useState('');
  const [notes, setNotes] = useState('');

  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setName('');
      setMaintenanceType('Periyodik Bakım');
      setCustomTypeNote('');
      setStartDate(todayStr);
      setEndDate('');
      setCost('');
      setNotes('');
      setError('');
    }
  }, [isOpen, todayStr]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
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

    if (!startDate) {
      setError('Başlangıç tarihi zorunludur.');
      return;
    }

    if (endDate && endDate < startDate) {
      setError('Bitiş tarihi başlangıç tarihinden önce olamaz.');
      return;
    }

    const formData = {
      name: name.trim(),
      maintenanceType,
      customTypeNote: maintenanceType === 'Diğer' ? customTypeNote.trim() : undefined,
      startDate,
      endDate: endDate || undefined,
      cost: cost ? Number(cost) : undefined,
      notes: notes.trim() || undefined,
    };

    onSave(formData);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-lg rounded-2xl border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-[#1E2534] text-white">
          <div className="flex items-center gap-2.5">
            <Wrench className="w-5 h-5 text-[#4F8FE0]" />
            <div>
              <h2 className="font-bold text-base tracking-tight">Servis Bakım Bilgileri</h2>
              {hardwareName && (
                <p className="text-xs text-slate-300 font-normal">Varlık: {hardwareName}</p>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white transition p-1 rounded-lg hover:bg-slate-700/60 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 flex-1">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold rounded-xl">
              {error}
            </div>
          )}

          {/* Bakım Kaydı Adı */}
          <div>
            <label className="block text-xs font-bold text-[#1E2534] mb-1">
              Bakım Kaydı Adı <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Örn: Garanti Kapsamında Servis / Ekran Tamiri"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-[#1E2534] focus:border-[#4F8FE0] outline-none transition"
            />
          </div>

          {/* Bakım Tipi */}
          <div>
            <label className="block text-xs font-bold text-[#1E2534] mb-1">
              Bakım Tipi <span className="text-rose-500">*</span>
            </label>
            <select
              value={maintenanceType}
              onChange={(e) => {
                setMaintenanceType(e.target.value);
                if (e.target.value !== 'Diğer') {
                  setCustomTypeNote('');
                }
              }}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-medium text-[#1E2534] focus:border-[#4F8FE0] outline-none transition"
            >
              {MAINTENANCE_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          {/* Diğer Açıklama Notu */}
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
                placeholder="Özel bakım nedenini belirtiniz"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-[#1E2534] focus:border-[#4F8FE0] outline-none transition"
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
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-[#1E2534] focus:border-[#4F8FE0] outline-none transition"
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
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-[#1E2534] focus:border-[#4F8FE0] outline-none transition"
              />
              <span className="text-[10px] text-slate-400 block mt-1">
                💡 Bakım hâlâ devam ediyorsa boş bırakın.
              </span>
            </div>
          </div>

          {/* Maliyet */}
          <div>
            <label className="block text-xs font-bold text-[#1E2534] mb-1">
              Bakım Maliyeti ($)
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={cost}
              onChange={(e) => setCost(e.target.value)}
              placeholder="Örn: 1500"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-[#1E2534] focus:border-[#4F8FE0] outline-none transition"
            />
          </div>

          {/* Notlar */}
          <div>
            <label className="block text-xs font-bold text-[#1E2534] mb-1">
              Notlar / Açıklama
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Servis veya arıza detayları..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-[#1E2534] focus:border-[#4F8FE0] outline-none transition"
            />
          </div>

          {/* Bileşen Bilgilendirmesi */}
          <div className="p-3 bg-blue-50/70 border border-blue-200/60 rounded-xl flex items-start gap-2 text-[11px] text-blue-800 font-medium">
            <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <span>
              💡 Bakımda kullanılan bileşenleri, iade tamamlandıktan sonra Varlıklar sayfasından ekleyebilirsiniz.
            </span>
          </div>

          {/* Actions */}
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
              className="px-5 py-2.5 text-xs font-bold text-white bg-[#4F8FE0] hover:bg-[#3D75C4] rounded-xl shadow-xs transition cursor-pointer"
            >
              Kaydet ve İadeye Ekle
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
