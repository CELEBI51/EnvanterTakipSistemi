import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import useAuthStore from '../../../store/authStore';
import { API_BASE_URL } from '../../../config';

export default function EditEmployeeModal({ isOpen, onClose, employee, onSuccess }) {
  const token = useAuthStore((state) => state.accessToken);

  const [units, setUnits] = useState([]);
  const [loadingUnits, setLoadingUnits] = useState(false);

  const [tcNo, setTcNo] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [unitId, setUnitId] = useState('');
  const [hireDate, setHireDate] = useState('');

  const [loading, setLoading] = useState(false);
  const [generalError, setGeneralError] = useState('');

  useEffect(() => {
    if (isOpen) {
      fetchUnits();
    }
  }, [isOpen]);

  useEffect(() => {
    if (employee && isOpen) {
      setTcNo(employee.tcNo || '');
      setFullName(employee.fullName || '');
      setEmail(employee.email || '');
      setPhone(employee.phone || '');
      setUnitId(employee.unitId || employee.unit?.id || '');
      setHireDate(employee.hireDate ? employee.hireDate.split('T')[0] : '');
    }
  }, [employee, isOpen]);

  const fetchUnits = async () => {
    setLoadingUnits(true);
    try {
      const res = await fetch(`${API_BASE_URL}/units`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) {
        setUnits(data.data || []);
      }
    } catch (err) {
      console.error('Birimler çekilemedi:', err);
    } finally {
      setLoadingUnits(false);
    }
  };

  if (!isOpen || !employee) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setGeneralError('');

    if (!tcNo.trim() || !fullName.trim() || !unitId) {
      setGeneralError('Lütfen gerekli alanları (Sicil No, Ad Soyad, Birim) doldurunuz.');
      return;
    }

    const payload = {
      tcNo: tcNo.trim(),
      fullName: fullName.trim(),
      unitId,
      email: email.trim() || null,
      phone: phone.trim() || null,
      hireDate: hireDate || null,
    };

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/employees/${employee.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Personel bilgileri güncellenirken hata oluştu.');
      }

      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      setGeneralError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50/50">
          <div>
            <h2 className="text-lg font-bold text-[#1E2534] font-heading">Personel Bilgilerini Düzenle</h2>
            <p className="text-xs text-slate-500 font-mono mt-0.5">{employee.fullName}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {generalError && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl font-medium">
              {generalError}
            </div>
          )}

          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Sicil Numarası / TC <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Örn: 10452"
                  value={tcNo}
                  onChange={(e) => setTcNo(e.target.value)}
                  required
                  className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#4F8FE0]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Ad Soyad <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Örn: Ahmet Yılmaz"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#4F8FE0]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Bağlı Olduğu Birim <span className="text-rose-500">*</span>
              </label>
              <select
                value={unitId}
                onChange={(e) => setUnitId(e.target.value)}
                required
                className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#4F8FE0]"
              >
                <option value="">-- Birim Seçin --</option>
                {units.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">E-Posta Adresi</label>
                <input
                  type="email"
                  placeholder="ahmet.yilmaz@ditas.com.tr"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#4F8FE0]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Telefon Numarası</label>
                <input
                  type="text"
                  placeholder="05XX XXX XX XX"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#4F8FE0]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">İşe Başlama Tarihi</label>
              <input
                type="date"
                value={hireDate}
                onChange={(e) => setHireDate(e.target.value)}
                className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#4F8FE0]"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-bold transition cursor-pointer"
            >
              İptal
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 rounded-xl bg-[#4F8FE0] hover:bg-[#3D75C4] text-white text-xs font-bold transition cursor-pointer disabled:opacity-50"
            >
              {loading ? 'Kaydediliyor...' : 'Değişiklikleri Kaydet'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
