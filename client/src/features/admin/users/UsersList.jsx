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
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[10px] text-xs font-semibold bg-[#0B2C55] text-white border border-[#0B2C55]">
            <Shield className="w-3 h-3 text-[#2F6BFF]" /> Yönetici (admin)
          </span>
        );
      case 'it_staff':
      default:
        return (
          <div className="inline-flex flex-col items-start gap-1">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[10px] text-xs font-semibold bg-amber-50 text-[#F59E0B] border border-amber-300">
              <UserCheck className="w-3 h-3 text-[#F59E0B]" /> IT Personeli
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
      {/* Üst Başlık & Ekleme Butonu */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-[10px] border border-[#E5E7EB] shadow-xs">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-[#6B7280] uppercase tracking-wider mb-1">
            <span>DİTAŞ Otomotiv • Kullanıcı & Yetki Yönetimi</span>
          </div>
          <h1 className="font-heading text-2xl font-bold text-[#0B2C55]">Kullanıcı Yönetimi</h1>
          <p className="text-xs text-[#6B7280] mt-1 font-normal">
            Sistem erişim yetkilerini, rollerini ve kullanıcı hesaplarını yönetin.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={fetchUsers}
            disabled={loading}
            className="h-10 px-3.5 bg-white border border-[#0B2C55] text-[#0B2C55] hover:bg-slate-50 text-xs font-medium rounded-[10px] flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Yenile"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Yenile</span>
          </button>

          <button
            onClick={() => setIsAddModalOpen(true)}
            className="h-10 px-4 bg-[#0B2C55] hover:bg-[#163B6B] text-white text-xs font-semibold rounded-[10px] flex items-center gap-2 transition-colors cursor-pointer shadow-xs"
          >
            <UserPlus className="w-4 h-4" />
            <span>Yeni Kullanıcı Ekle</span>
          </button>
        </div>
      </div>

      {/* Hata Bildirimi */}
      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-[#DC2626] text-xs font-medium rounded-[10px] flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-[#DC2626] shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Kullanıcı Listesi Tablosu */}
      <div className="bg-white rounded-[10px] border border-[#E5E7EB] shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#0B2C55] text-white text-xs uppercase tracking-wider font-heading sticky top-0">
                <th className="py-3.5 px-4 sm:px-6 font-semibold">Ad Soyad</th>
                <th className="py-3.5 px-4 font-semibold">E-posta</th>
                <th className="py-3.5 px-4 font-semibold">Rol</th>
                <th className="py-3.5 px-4 font-semibold">Şifre Durumu</th>
                <th className="py-3.5 px-4 font-semibold">Kayıt Tarihi</th>
                <th className="py-3.5 px-4 sm:px-6 font-semibold text-right">İşlemler</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E7EB] text-xs text-[#1F2937]">
              {loading && users.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-12 text-center text-[#6B7280]">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-[#2F6BFF]" />
                    <span>Kullanıcılar yükleniyor...</span>
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-12 text-center text-[#6B7280]">
                    Henüz kayıtlı kullanıcı bulunmuyor.
                  </td>
                </tr>
              ) : (
                users.map((u) => {
                  const isSelf = u.id === currentUser?.id;
                  const isLastAdmin = u.role === 'admin' && adminCount <= 1;
                  const permCount = Array.isArray(u.permissions) ? u.permissions.length : 0;

                  return (
                    <tr key={u.id} className="hover:bg-[#F3F4F6] even:bg-[#F9FAFB] transition-colors">
                      <td className="py-3.5 px-4 sm:px-6 font-semibold text-[#1F2937]">
                        <div className="flex items-center gap-2">
                          <span>{u.fullName}</span>
                          {isSelf && (
                            <span className="text-[10px] bg-blue-50 text-[#2F6BFF] font-bold px-2 py-0.5 rounded-[4px] border border-blue-200">
                              Siz
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-[#6B7280]">{u.email}</td>
                      <td className="py-3.5 px-4">
                        {editingUserId === u.id ? (
                          <div className="flex items-center gap-1.5">
                            <select
                              value={selectedRole}
                              onChange={(e) => setSelectedRole(e.target.value)}
                              className="h-8 px-2 text-xs bg-white border border-[#2F6BFF] rounded-[6px] outline-none"
                            >
                              <option value="admin">Yönetici (admin)</option>
                              <option value="it_staff">IT Personeli (it_staff)</option>
                            </select>
                            <button
                              onClick={() => handleUpdateRole(u.id)}
                              disabled={isUpdatingRole}
                              className="w-8 h-8 rounded-[6px] bg-[#16A34A] text-white flex items-center justify-center hover:bg-emerald-700 transition-colors cursor-pointer"
                              title="Kaydet"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setEditingUserId(null)}
                              className="w-8 h-8 rounded-[6px] bg-slate-200 text-[#6B7280] flex items-center justify-center hover:bg-slate-300 transition-colors cursor-pointer"
                              title="İptal"
                            >
                              <UserX className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          getRoleBadge(u.role, permCount)
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        {u.mustChangePassword ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#F59E0B] bg-amber-50 px-2 py-0.5 rounded-[6px] border border-amber-200">
                            Zorunlu Değiştirilecek
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#16A34A] bg-emerald-50 px-2 py-0.5 rounded-[6px] border border-emerald-200">
                            Aktif / Belirlendi
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-[#6B7280]">
                        {new Date(u.createdAt).toLocaleDateString('tr-TR', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                        })}
                      </td>
                      <td className="py-3.5 px-4 sm:px-6 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {u.role === 'it_staff' && (
                            <button
                              onClick={() => setEditPermissionsUser(u)}
                              title="Yetkileri / İzinleri Düzenle"
                              className="p-2 text-[#4F8FE0] hover:bg-blue-50 rounded-[6px] transition-colors cursor-pointer flex items-center gap-1 text-xs font-semibold"
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
                              className={`p-2 rounded-[6px] transition-colors ${isLastAdmin
                                  ? 'text-slate-300 cursor-not-allowed'
                                  : 'text-[#6B7280] hover:text-[#0B2C55] hover:bg-slate-100 cursor-pointer'
                                }`}
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                          )}

                          <button
                            onClick={() => setResetModalUser(u)}
                            title="Şifresini Sıfırla"
                            className="p-2 text-[#F59E0B] hover:bg-amber-50 rounded-[6px] transition-colors cursor-pointer"
                          >
                            <KeyRound className="w-4 h-4" />
                          </button>

                          <div className="relative group inline-block">
                            <button
                              onClick={() => setDeleteConfirmUser(u)}
                              disabled={isSelf || isLastAdmin}
                              className={`p-2 rounded-[6px] transition-colors ${isSelf || isLastAdmin
                                  ? 'text-slate-300 bg-slate-50 cursor-not-allowed'
                                  : 'text-[#DC2626] hover:bg-rose-50 cursor-pointer'
                                }`}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>

                            {(isSelf || isLastAdmin) && (
                              <div className="absolute right-0 bottom-full mb-1.5 hidden group-hover:block w-48 p-2 bg-[#0B2C55] text-white text-[11px] font-medium rounded shadow-lg z-10 text-center leading-tight">
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
