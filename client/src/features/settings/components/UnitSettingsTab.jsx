import React, { useEffect, useState } from 'react';
import {
  Building2,
  Plus,
  Edit2,
  Trash2,
  ToggleLeft,
  ToggleRight,
  AlertCircle,
  CheckCircle2,
  X,
  Phone,
  Mail,
  MapPin,
  User,
  RotateCcw,
} from 'lucide-react';
import useAuthStore from '../../../store/authStore';
import EmptyState from '../../../components/common/EmptyState';

export default function UnitSettingsTab() {
  const token = useAuthStore((state) => state.accessToken);
  const user = useAuthStore((state) => state.user);

  const [units, setUnits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showInactive, setShowInactive] = useState(false);

  // Modal states for Create / Edit
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('create'); // 'create' | 'edit'
  const [selectedUnit, setSelectedUnit] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    phone: '',
    contactPerson: '',
    email: '',
  });
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState('');

  // Delete (Pasife Al) Confirm Modal states
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [unitToDelete, setUnitToDelete] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  // Activate Confirm Modal states
  const [isActivateOpen, setIsActivateOpen] = useState(false);
  const [unitToActivate, setUnitToActivate] = useState(null);
  const [activateLoading, setActivateLoading] = useState(false);

  const canEdit = user?.role === 'admin';

  const fetchUnits = async () => {
    setLoading(true);
    setError('');
    try {
      const url = showInactive
        ? 'http://localhost:5000/api/units?includeInactive=true'
        : 'http://localhost:5000/api/units';
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Birimler alınamadı.');
      setUnits(data.data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUnits();
  }, [token, showInactive]);

  // Open Create Modal
  const handleOpenCreateModal = () => {
    setModalMode('create');
    setSelectedUnit(null);
    setFormData({ name: '', address: '', phone: '', contactPerson: '', email: '' });
    setModalError('');
    setIsModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEditModal = (unit) => {
    setModalMode('edit');
    setSelectedUnit(unit);
    setFormData({
      name: unit.name || '',
      address: unit.address || '',
      phone: unit.phone || '',
      contactPerson: unit.contactPerson || '',
      email: unit.email || '',
    });
    setModalError('');
    setIsModalOpen(true);
  };

  // Handle Form Submit (Create or Edit)
  const handleModalSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setModalError('Birim adı zorunludur.');
      return;
    }

    setModalLoading(true);
    setModalError('');

    try {
      const payload = {
        name: formData.name.trim(),
        address: formData.address.trim() || undefined,
        phone: formData.phone.trim() || undefined,
        contactPerson: formData.contactPerson.trim() || undefined,
        email: formData.email.trim() || undefined,
      };

      let res;
      if (modalMode === 'create') {
        res = await fetch('http://localhost:5000/api/units', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch(`http://localhost:5000/api/units/${selectedUnit.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        });
      }

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'İşlem başarısız.');

      setIsModalOpen(false);
      setFormData({ name: '', address: '', phone: '', contactPerson: '', email: '' });
      setSelectedUnit(null);
      fetchUnits();
    } catch (err) {
      setModalError(err.message);
    } finally {
      setModalLoading(false);
    }
  };

  // Open Delete (Pasife Al) Modal
  const handleOpenDeleteModal = (unit) => {
    setUnitToDelete(unit);
    setDeleteError('');
    setIsDeleteOpen(true);
  };

  // Confirm Delete (Soft delete)
  const handleConfirmDelete = async () => {
    if (!unitToDelete) return;
    setDeleteLoading(true);
    setDeleteError('');

    try {
      const res = await fetch(`http://localhost:5000/api/units/${unitToDelete.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Birim pasife alınamadı.');

      setIsDeleteOpen(false);
      setUnitToDelete(null);
      fetchUnits();
    } catch (err) {
      setDeleteError(err.message);
    } finally {
      setDeleteLoading(false);
    }
  };

  // Open Activate Modal
  const handleOpenActivateModal = (unit) => {
    setUnitToActivate(unit);
    setIsActivateOpen(true);
  };

  // Confirm Activate
  const handleConfirmActivate = async () => {
    if (!unitToActivate) return;
    setActivateLoading(true);

    try {
      const res = await fetch(`http://localhost:5000/api/units/${unitToActivate.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ isActive: true }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Birim aktif edilemedi.');

      setIsActivateOpen(false);
      setUnitToActivate(null);
      fetchUnits();
    } catch (err) {
      console.error('Birim aktif edilemedi:', err);
    } finally {
      setActivateLoading(false);
    }
  };

  const activeCount = units.filter((u) => u.isActive !== false).length;
  const inactiveCount = units.filter((u) => u.isActive === false).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold font-heading text-[#1E2534] flex items-center gap-2">
            <Building2 className="w-5 h-5 text-[#4F8FE0]" />
            Birim Yönetimi
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Şirket departman ve birimlerini ekleyin, güncelleyin veya pasife alın.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0 flex-wrap">
          {/* Pasif Göster Toggle */}
          <button
            type="button"
            onClick={() => setShowInactive((p) => !p)}
            className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border text-xs font-bold transition cursor-pointer ${
              showInactive
                ? 'bg-amber-50 border-amber-300 text-amber-800'
                : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
            }`}
          >
            {showInactive ? (
              <ToggleRight className="w-4 h-4 text-amber-600" />
            ) : (
              <ToggleLeft className="w-4 h-4 text-slate-400" />
            )}
            Pasif Birimleri {showInactive ? 'Gizle' : 'Göster'}
          </button>

          {canEdit && (
            <button
              type="button"
              onClick={handleOpenCreateModal}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#4F8FE0] hover:bg-[#3D75C4] text-white text-xs font-bold transition shadow-xs cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Yeni Birim Ekle
            </button>
          )}
        </div>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="bg-white rounded-2xl border border-slate-200 p-4 text-center shadow-xs">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
            Toplam Birim
          </div>
          <div className="text-2xl font-extrabold font-heading text-[#1E2534]">{units.length}</div>
        </div>
        <div className="bg-white rounded-2xl border border-emerald-200 p-4 text-center shadow-xs">
          <div className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider mb-1">
            Aktif
          </div>
          <div className="text-2xl font-extrabold font-heading text-emerald-700">{activeCount}</div>
        </div>
        {showInactive && (
          <div className="bg-white rounded-2xl border border-amber-200 p-4 text-center shadow-xs">
            <div className="text-[10px] font-bold text-amber-500 uppercase tracking-wider mb-1">
              Pasif
            </div>
            <div className="text-2xl font-extrabold font-heading text-amber-700">{inactiveCount}</div>
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-700 font-medium flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
          {error}
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="px-6 py-4 bg-[#F5F4EF] border-b border-slate-200 flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Birim Listesi
          </span>
          <span className="text-xs text-slate-500 font-medium">
            Toplam <strong>{units.length}</strong> birim
          </span>
        </div>

        {loading ? (
          <div className="py-16 text-center text-xs text-slate-400 font-medium">
            Birimler yükleniyor...
          </div>
        ) : units.length === 0 ? (
          <div className="p-8">
            <EmptyState
              title="Henüz Birim Tanımlanmamış"
              description="Yeni birim eklemek için 'Yeni Birim Ekle' butonunu kullanın."
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3.5 px-6">Birim Adı</th>
                  <th className="py-3.5 px-6">Adres</th>
                  <th className="py-3.5 px-6">Telefon</th>
                  <th className="py-3.5 px-6">Yetkili Kişi</th>
                  <th className="py-3.5 px-6">E-posta</th>
                  <th className="py-3.5 px-6">Durum</th>
                  <th className="py-3.5 px-6 text-right">İşlemler</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {units.map((unit) => {
                  const isInactive = unit.isActive === false;

                  return (
                    <tr
                      key={unit.id}
                      className={`transition group ${
                        isInactive
                          ? 'bg-amber-50/40 opacity-60'
                          : 'hover:bg-slate-50/80'
                      }`}
                    >
                      <td className="py-3.5 px-6">
                        <div className="flex items-center gap-2">
                          <span
                            className={`w-2 h-2 rounded-full ${
                              isInactive ? 'bg-amber-400' : 'bg-emerald-500'
                            }`}
                          ></span>
                          <span
                            className={`font-bold ${
                              isInactive
                                ? 'text-slate-400 line-through'
                                : 'text-[#1E2534]'
                            }`}
                          >
                            {unit.name}
                          </span>
                        </div>
                      </td>

                      <td className="py-3.5 px-6 text-slate-500 max-w-[180px] truncate">
                        {unit.address ? (
                          <span className="flex items-center gap-1.5">
                            <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                            {unit.address}
                          </span>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>

                      <td className="py-3.5 px-6 text-slate-500">
                        {unit.phone ? (
                          <span className="flex items-center gap-1.5">
                            <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                            {unit.phone}
                          </span>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>

                      <td className="py-3.5 px-6 text-slate-500">
                        {unit.contactPerson ? (
                          <span className="flex items-center gap-1.5">
                            <User className="w-3 h-3 text-slate-400 shrink-0" />
                            {unit.contactPerson}
                          </span>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>

                      <td className="py-3.5 px-6 text-slate-500">
                        {unit.email ? (
                          <span className="flex items-center gap-1.5">
                            <Mail className="w-3 h-3 text-slate-400 shrink-0" />
                            {unit.email}
                          </span>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>

                      <td className="py-3.5 px-6">
                        {isInactive ? (
                          <span className="inline-block px-2.5 py-0.5 rounded-md bg-amber-100 text-amber-800 font-bold text-[10px] border border-amber-200">
                            Pasif
                          </span>
                        ) : (
                          <span className="inline-block px-2.5 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-bold text-[10px] border border-emerald-200">
                            Aktif
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-6 text-right whitespace-nowrap">
                        {canEdit && (
                          <div className="inline-flex items-center justify-end gap-1.5">
                            {isInactive ? (
                              <button
                                type="button"
                                onClick={() => handleOpenActivateModal(unit)}
                                className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition cursor-pointer"
                                title="Aktife Al"
                              >
                                <RotateCcw className="w-4 h-4" />
                              </button>
                            ) : (
                              <>
                                <button
                                  type="button"
                                  onClick={() => handleOpenEditModal(unit)}
                                  className="p-1.5 text-slate-400 hover:text-[#4F8FE0] hover:bg-blue-50 rounded-lg transition cursor-pointer"
                                  title="Birimi Düzenle"
                                >
                                  <Edit2 className="w-4 h-4" />
                                </button>

                                <button
                                  type="button"
                                  onClick={() => handleOpenDeleteModal(unit)}
                                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                                  title="Pasife Al"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ─── CREATE / EDIT UNIT MODAL ─── */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-lg overflow-hidden flex flex-col">
            {/* Header */}
            <div className="p-6 bg-[#1E2534] text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#4F8FE0]/20 text-[#4F8FE0] flex items-center justify-center font-bold">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-heading text-base font-bold tracking-tight text-white leading-tight">
                    {modalMode === 'create' ? 'Yeni Birim Ekle' : 'Birimi Düzenle'}
                  </h3>
                  <p className="text-xs text-slate-300">
                    {modalMode === 'create'
                      ? 'Departman veya şube bilgilerini girin.'
                      : selectedUnit?.name}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-700/60 rounded-xl transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleModalSubmit} className="p-6 space-y-4 overflow-y-auto max-h-[60vh]">
              {modalError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-medium flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>{modalError}</span>
                </div>
              )}

              {/* Name (Required) */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Birim Adı <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={formData.name}
                  onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
                  placeholder="Örn: Bilgi Teknolojileri"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-[#1E2534] focus:outline-hidden focus:border-[#4F8FE0]"
                />
              </div>

              {/* Address */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Adres
                </label>
                <textarea
                  rows="2"
                  value={formData.address}
                  onChange={(e) => setFormData((p) => ({ ...p, address: e.target.value }))}
                  placeholder="Örn: Organize Sanayi Bölgesi 4. Cadde No: 12"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-hidden focus:border-[#4F8FE0]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Phone */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Telefon
                  </label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData((p) => ({ ...p, phone: e.target.value }))}
                    placeholder="Örn: 0312 555 00 00"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-hidden focus:border-[#4F8FE0]"
                  />
                </div>

                {/* Email */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    E-posta
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData((p) => ({ ...p, email: e.target.value }))}
                    placeholder="Örn: it@ditas.com.tr"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-hidden focus:border-[#4F8FE0]"
                  />
                </div>
              </div>

              {/* Contact Person */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Yetkili Kişi
                </label>
                <input
                  type="text"
                  value={formData.contactPerson}
                  onChange={(e) => setFormData((p) => ({ ...p, contactPerson: e.target.value }))}
                  placeholder="Örn: Ahmet Yılmaz"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-hidden focus:border-[#4F8FE0]"
                />
              </div>

              {/* Submit Row */}
              <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  disabled={modalLoading}
                  className="px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                >
                  İptal
                </button>

                <button
                  type="submit"
                  disabled={modalLoading}
                  className="px-5 py-2.5 bg-[#4F8FE0] hover:bg-[#3D75C4] text-white font-bold text-xs rounded-xl shadow-md hover:shadow-lg transition cursor-pointer disabled:opacity-50"
                >
                  {modalLoading
                    ? 'Kaydediliyor...'
                    : modalMode === 'create'
                    ? 'Birim Ekle'
                    : 'Değişiklikleri Kaydet'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── PASİFE AL CONFIRM MODAL ─── */}
      {isDeleteOpen && unitToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-md p-6 relative">
            <button
              onClick={() => {
                setIsDeleteOpen(false);
                setUnitToDelete(null);
                setDeleteError('');
              }}
              disabled={deleteLoading}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-start gap-4">
              <div className="w-11 h-11 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>

              <div className="flex-1">
                <h3 className="font-heading text-base font-bold text-[#1E2534]">
                  Birimi Pasife Al
                </h3>
                <p className="mt-1 text-xs text-slate-600 leading-relaxed">
                  "<strong>{unitToDelete.name}</strong>" birimini pasife almak istediğinize emin misiniz? Birim silinmeyecek, sadece pasif duruma geçecektir.
                </p>

                {deleteError && (
                  <div className="mt-3 p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-semibold flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
                    <span>{deleteError}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-2.5 border-t border-slate-100 pt-3">
              <button
                type="button"
                onClick={() => {
                  setIsDeleteOpen(false);
                  setUnitToDelete(null);
                  setDeleteError('');
                }}
                disabled={deleteLoading}
                className="px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
              >
                İptal
              </button>

              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={deleteLoading}
                className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow-md hover:shadow-lg transition cursor-pointer disabled:opacity-50"
              >
                {deleteLoading ? 'İşleniyor...' : 'Evet, Pasife Al'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── AKTİFE AL CONFIRM MODAL ─── */}
      {isActivateOpen && unitToActivate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-md p-6 relative">
            <button
              onClick={() => {
                setIsActivateOpen(false);
                setUnitToActivate(null);
              }}
              disabled={activateLoading}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-start gap-4">
              <div className="w-11 h-11 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center shrink-0">
                <RotateCcw className="w-5 h-5" />
              </div>

              <div className="flex-1">
                <h3 className="font-heading text-base font-bold text-[#1E2534]">
                  Birimi Aktife Al
                </h3>
                <p className="mt-1 text-xs text-slate-600 leading-relaxed">
                  "<strong>{unitToActivate.name}</strong>" birimini tekrar aktif duruma getirmek istediğinize emin misiniz?
                </p>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-2.5 border-t border-slate-100 pt-3">
              <button
                type="button"
                onClick={() => {
                  setIsActivateOpen(false);
                  setUnitToActivate(null);
                }}
                disabled={activateLoading}
                className="px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
              >
                İptal
              </button>

              <button
                type="button"
                onClick={handleConfirmActivate}
                disabled={activateLoading}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md hover:shadow-lg transition cursor-pointer disabled:opacity-50"
              >
                {activateLoading ? 'İşleniyor...' : 'Evet, Aktife Al'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
