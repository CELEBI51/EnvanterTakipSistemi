import React, { useEffect, useState } from 'react';
import {
  Users,
  UserPlus,
  KeyRound,
  Trash2,
  Shield,
  UserCheck,
  UserX,
  RefreshCw,
  AlertCircle,
  Edit2,
  Check,
  Building2,
  Sliders,
} from 'lucide-react';
import axiosClient from '../../../api/axiosClient';
import useAuthStore from '../../../store/authStore';
import AddUserModal from './AddUserModal';
import ResetPasswordModal from './ResetPasswordModal';
import EditPermissionsModal from './EditPermissionsModal';
import ConfirmModal from '../../../components/common/ConfirmModal';

export default function UsersList() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Modallar
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [resetModalUser, setResetModalUser] = useState(null);
  const [editPermissionsUser, setEditPermissionsUser] = useState(null);

  const [deleteConfirmUser, setDeleteConfirmUser] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Rol Düzenleme State'i
  const [editingUserId, setEditingUserId] = useState(null);
  const [selectedRole, setSelectedRole] = useState('');
  const [isUpdatingRole, setIsUpdatingRole] = useState(false);

  const currentUser = useAuthStore((state) => state.user);

  const fetchUsers = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await axiosClient.get('/users');
      const data = response.data?.data || response.data || [];
      setUsers(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.response?.data?.message || 'Kullanıcılar yüklenirken bir hata oluştu.');
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const adminCount = users.filter((u) => u.role?.toLowerCase() === 'admin').length;

  const handleDeleteUser = async () => {
    if (!deleteConfirmUser) return;
    setIsDeleting(true);
    try {
      await axiosClient.delete(`/users/${deleteConfirmUser.id}`);
      setDeleteConfirmUser(null);
      fetchUsers();
    } catch (err) {
      alert(err.response?.data?.message || 'Silme işlemi sırasında hata oluştu.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleUpdateRole = async (userId) => {
    if (!selectedRole) return;
    setIsUpdatingRole(true);
    try {
      await axiosClient.put(`/users/${userId}`, { role: selectedRole });
      setEditingUserId(null);
      fetchUsers();
    } catch (err) {
      alert(err.response?.data?.message || 'Rol güncellenirken hata oluştu.');
    } finally {
      setIsUpdatingRole(false);
    }
  };

  const getRoleBadge = (role, permissionsCount = 0) => {
    switch (role) {
      case 'admin':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold bg-blue-50 text-[#4C82F7] border border-blue-200">
            <Shield className="w-3.5 h-3.5 text-[#4C82F7]" /> Yönetici (admin)
          </span>
        );
      case 'it_staff':
      default:
        return (
          <div className="inline-flex flex-col items-start gap-1">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold bg-purple-50 text-purple-700 border border-purple-200">
              <UserCheck className="w-3.5 h-3.5 text-purple-600" /> IT Personeli
            </span>
            <span className="text-[10px] text-slate-500 font-mono">
              ({permissionsCount} yetki tanımlı)
            </span>
          </div>
        );
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">
            Envanter Takip Sistemi • Kullanıcı & Yetki Yönetimi
          </span>
          <h1 className="text-2xl font-bold font-heading text-[#1E2534]">
            Kullanıcı Yönetimi
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Sistem erişim yetkilerini, rollerini ve kullanıcı hesaplarını yönetin.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={fetchUsers}
            disabled={loading}
            className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 text-xs font-bold transition cursor-pointer shadow-xs disabled:opacity-50"
            title="Yenile"
          >
            <RefreshCw className={`w-4 h-4 text-slate-500 ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Yenile</span>
          </button>

          <button
            onClick={() => setIsAddModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#4C82F7] hover:bg-[#3D6FE0] text-white text-xs font-bold shadow-xs transition cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>Yeni Kullanıcı Ekle</span>
          </button>
        </div>
      </div>

      {/* Hata Bildirimi */}
      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold rounded-2xl flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Kullanıcı Listesi Tablosu */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3.5 px-6">Ad Soyad</th>
                <th className="py-3.5 px-6">E-posta</th>
                <th className="py-3.5 px-6">Rol</th>
                <th className="py-3.5 px-6">Şifre Durumu</th>
                <th className="py-3.5 px-6">Kayıt Tarihi</th>
                <th className="py-3.5 px-6 text-right">İşlemler</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {loading && users.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-12 text-center text-slate-400 font-medium">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-[#4C82F7]" />
                    <span>Kullanıcılar yükleniyor...</span>
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-12 text-center text-slate-400 font-medium">
                    Henüz kayıtlı kullanıcı bulunmuyor.
                  </td>
                </tr>
              ) : (
                users.map((u) => {
                  const isSelf = u.id === currentUser?.id;
                  const isLastAdmin = u.role === 'admin' && adminCount <= 1;
                  const permCount = Array.isArray(u.permissions) ? u.permissions.length : 0;

                  return (
                    <tr key={u.id} className="hover:bg-slate-50/80 transition cursor-pointer">
                      <td className="py-3.5 px-6 font-bold text-[#1E2534]">
                        <div className="flex items-center gap-2">
                          <span>{u.fullName}</span>
                          {isSelf && (
                            <span className="text-[10px] bg-blue-50 text-[#4C82F7] font-bold px-2 py-0.5 rounded-md border border-blue-200">
                              Siz
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-6 font-mono text-slate-500">{u.email}</td>
                      <td className="py-3.5 px-6">
                        {editingUserId === u.id ? (
                          <div className="flex items-center gap-1.5">
                            <select
                              value={selectedRole}
                              onChange={(e) => setSelectedRole(e.target.value)}
                              className="h-8 px-2.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-[#1E2534] font-semibold outline-none focus:border-[#4C82F7]"
                            >
                              <option value="admin">Yönetici (admin)</option>
                              <option value="it_staff">IT Personeli (it_staff)</option>
                            </select>
                            <button
                              onClick={() => handleUpdateRole(u.id)}
                              disabled={isUpdatingRole}
                              className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center hover:bg-emerald-700 transition cursor-pointer"
                              title="Kaydet"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setEditingUserId(null)}
                              className="w-8 h-8 rounded-lg bg-slate-200 text-slate-600 flex items-center justify-center hover:bg-slate-300 transition cursor-pointer"
                              title="İptal"
                            >
                              <UserX className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          getRoleBadge(u.role, permCount)
                        )}
                      </td>
                      <td className="py-3.5 px-6">
                        {u.mustChangePassword ? (
                          <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200 inline-flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span> Zorunlu Değiştirilecek
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 inline-flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Aktif / Belirlendi
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-6 text-slate-500 font-mono text-[11px]">
                        {new Date(u.createdAt).toLocaleDateString('tr-TR', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                        })}
                      </td>
                      <td className="py-3.5 px-6 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {u.role === 'it_staff' && (
                            <button
                              onClick={() => setEditPermissionsUser(u)}
                              title="Yetkileri / İzinleri Düzenle"
                              className="p-1.5 text-slate-400 hover:text-[#4C82F7] hover:bg-blue-50 rounded-lg transition cursor-pointer inline-flex items-center gap-1 text-xs font-bold"
                            >
                              <Sliders className="w-4 h-4" />
                              <span className="hidden md:inline">Yetkiler</span>
                            </button>
                          )}

                          {editingUserId !== u.id && (
                            <button
                              onClick={() => {
                                setEditingUserId(u.id);
                                setSelectedRole(u.role);
                              }}
                              disabled={isLastAdmin}
                              title={
                                isLastAdmin
                                  ? 'Sistemde en az 1 yönetici kalmalıdır. Son yöneticinin rolü düşürülemez.'
                                  : 'Rolünü Düzenle'
                              }
                              className={`p-1.5 rounded-lg transition ${isLastAdmin
                                  ? 'text-slate-300 cursor-not-allowed'
                                  : 'text-slate-400 hover:text-[#4C82F7] hover:bg-blue-50 cursor-pointer'
                                }`}
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                          )}

                          <button
                            onClick={() => setResetModalUser(u)}
                            title="Şifresini Sıfırla"
                            className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition cursor-pointer"
                          >
                            <KeyRound className="w-4 h-4" />
                          </button>

                          <div className="relative group inline-block">
                            <button
                              onClick={() => setDeleteConfirmUser(u)}
                              disabled={isSelf || isLastAdmin}
                              className={`p-1.5 rounded-lg transition ${isSelf || isLastAdmin
                                  ? 'text-slate-300 bg-transparent cursor-not-allowed'
                                  : 'text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer'
                                }`}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>

                            {(isSelf || isLastAdmin) && (
                              <div className="absolute right-0 bottom-full mb-1.5 hidden group-hover:block w-48 p-2 bg-[#0B1220] border border-[#223049] text-white text-[11px] font-medium rounded-lg shadow-lg z-10 text-center leading-tight">
                                {isSelf
                                  ? 'Kendi hesabınızı silemezsiniz.'
                                  : 'Sistemde en az 1 yönetici kalmalıdır.'}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <AddUserModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={fetchUsers}
      />

      <EditPermissionsModal
        isOpen={!!editPermissionsUser}
        onClose={() => setEditPermissionsUser(null)}
        user={editPermissionsUser}
        onSuccess={fetchUsers}
      />

      <ResetPasswordModal
        isOpen={!!resetModalUser}
        onClose={() => setResetModalUser(null)}
        user={resetModalUser}
        onSuccess={fetchUsers}
      />

      <ConfirmModal
        isOpen={!!deleteConfirmUser}
        onClose={() => setDeleteConfirmUser(null)}
        onConfirm={handleDeleteUser}
        title="Kullanıcıyı Sil"
        message={`${deleteConfirmUser?.fullName} (${deleteConfirmUser?.email}) adlı kullanıcı sistemden kalıcı olarak silinecektir. Bu işlem geri alınamaz!`}
        confirmText="Evet, Kullanıcıyı Sil"
        cancelText="İptal"
        isDanger={true}
        isLoading={isDeleting}
      />
    </div>
  );
}
