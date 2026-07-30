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
} from 'lucide-react';
import axiosClient from '../../../api/axiosClient';
import useAuthStore from '../../../store/authStore';
import AddUserModal from './AddUserModal';
import ResetPasswordModal from './ResetPasswordModal';
import ConfirmModal from '../../../components/common/ConfirmModal';

export default function UsersList() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Modallar
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [resetModalUser, setResetModalUser] = useState(null);
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
      const data = response.data?.data || [];
      setUsers(data);
    } catch (err) {
      setError(err.response?.data?.message || 'Kullanıcılar yüklenirken bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const adminCount = users.filter((u) => u.role === 'admin').length;

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

  const getRoleBadge = (role) => {
    switch (role) {
      case 'admin':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-[#1E2534] text-[#4F8FE0] border border-[#1E2534]">
            <Shield className="w-3 h-3 text-[#4F8FE0]" /> Yönetici (admin)
          </span>
        );
      case 'it_staff':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-900 border border-amber-300">
            <UserCheck className="w-3 h-3 text-amber-600" /> IT Personeli (it_staff)
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-300">
            <UserX className="w-3 h-3 text-slate-500" /> İzleyici (viewer)
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Üst Başlık & Ekleme Butonu */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 sm:p-6 rounded-xl border border-[#E2E8F0] shadow-sm">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-lg bg-[#1E2534] text-[#4F8FE0] flex items-center justify-center shrink-0">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-heading text-xl font-bold text-[#1E2534]">Kullanıcı Yönetimi</h1>
            <p className="text-xs text-slate-500 mt-0.5 font-medium">
              Sistem erişim yetkilerini ve kullanıcı hesaplarını yönetin
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchUsers}
            disabled={loading}
            className="h-10 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Yenile"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Yenile</span>
          </button>

          <button
            onClick={() => setIsAddModalOpen(true)}
            className="h-10 px-4 bg-[#4F8FE0] hover:bg-[#3D75C4] active:bg-[#3566AD] text-white text-xs font-semibold rounded-lg flex items-center gap-2 transition-colors cursor-pointer shadow-sm"
          >
            <UserPlus className="w-4 h-4" />
            <span>Yeni Kullanıcı Ekle</span>
          </button>
        </div>
      </div>

      {/* Hata Bildirimi */}
      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium rounded-xl flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Kullanıcı Listesi Tablosu */}
      <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#F0F4F8] border-b border-[#E2E8F0] text-[11px] font-bold text-[#1E2534] uppercase tracking-wider">
                <th className="py-3.5 px-4 sm:px-6">Ad Soyad</th>
                <th className="py-3.5 px-4">E-posta</th>
                <th className="py-3.5 px-4">Rol</th>
                <th className="py-3.5 px-4">Şifre Durumu</th>
                <th className="py-3.5 px-4">Kayıt Tarihi</th>
                <th className="py-3.5 px-4 sm:px-6 text-right">İşlemler</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
              {loading && users.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-[#4F8FE0]" />
                    <span>Kullanıcılar yükleniyor...</span>
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-12 text-center text-slate-400">
                    Henüz kayıtlı kullanıcı bulunmuyor.
                  </td>
                </tr>
              ) : (
                users.map((u) => {
                  const isSelf = u.id === currentUser?.id;
                  const isLastAdmin = u.role === 'admin' && adminCount <= 1;

                  return (
                    <tr key={u.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3.5 px-4 sm:px-6 font-semibold text-[#1E2534]">
                        <div className="flex items-center gap-2">
                          <span>{u.fullName}</span>
                          {isSelf && (
                            <span className="text-[10px] bg-indigo-50 text-indigo-700 font-bold px-2 py-0.5 rounded border border-indigo-200">
                              Siz
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-slate-600">{u.email}</td>
                      <td className="py-3.5 px-4">
                        {editingUserId === u.id ? (
                          <div className="flex items-center gap-1.5">
                            <select
                              value={selectedRole}
                              onChange={(e) => setSelectedRole(e.target.value)}
                              className="h-8 px-2 text-xs bg-white border border-[#4F8FE0] rounded outline-none"
                            >
                              <option value="admin">Yönetici (admin)</option>
                              <option value="it_staff">IT Personeli (it_staff)</option>
                              <option value="viewer">İzleyici (viewer)</option>
                            </select>
                            <button
                              onClick={() => handleUpdateRole(u.id)}
                              disabled={isUpdatingRole}
                              className="w-8 h-8 rounded bg-emerald-600 text-white flex items-center justify-center hover:bg-emerald-700 transition-colors"
                              title="Kaydet"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setEditingUserId(null)}
                              className="w-8 h-8 rounded bg-slate-200 text-slate-600 flex items-center justify-center hover:bg-slate-300 transition-colors"
                              title="İptal"
                            >
                              <UserX className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          getRoleBadge(u.role)
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        {u.mustChangePassword ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                            Zorunlu Değiştirilecek
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                            Aktif / Belirlendi
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-slate-500">
                        {new Date(u.createdAt).toLocaleDateString('tr-TR', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                        })}
                      </td>
                      <td className="py-3.5 px-4 sm:px-6 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Rol Düzenle */}
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
                              className={`p-2 rounded-lg transition-colors ${
                                isLastAdmin
                                  ? 'text-slate-300 cursor-not-allowed'
                                  : 'text-slate-600 hover:text-[#1E2534] hover:bg-slate-100 cursor-pointer'
                              }`}
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                          )}

                          {/* Şifre Sıfırla */}
                          <button
                            onClick={() => setResetModalUser(u)}
                            title="Şifresini Sıfırla"
                            className="p-2 text-amber-600 hover:text-amber-700 hover:bg-amber-50 rounded-lg transition-colors cursor-pointer"
                          >
                            <KeyRound className="w-4 h-4" />
                          </button>

                          {/* Sil */}
                          <div className="relative group inline-block">
                            <button
                              onClick={() => setDeleteConfirmUser(u)}
                              disabled={isSelf || isLastAdmin}
                              className={`p-2 rounded-lg transition-colors ${
                                isSelf || isLastAdmin
                                  ? 'text-slate-300 bg-slate-50 cursor-not-allowed'
                                  : 'text-rose-600 hover:text-rose-700 hover:bg-rose-50 cursor-pointer'
                              }`}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>

                            {/* Custom Tooltip */}
                            {(isSelf || isLastAdmin) && (
                              <div className="absolute right-0 bottom-full mb-1.5 hidden group-hover:block w-48 p-2 bg-[#1E2534] text-white text-[11px] font-medium rounded shadow-lg z-10 text-center leading-tight">
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

      {/* Kullanıcı Ekleme Modali */}
      <AddUserModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={fetchUsers}
      />

      {/* Şifre Sıfırlama Modali */}
      <ResetPasswordModal
        isOpen={!!resetModalUser}
        onClose={() => setResetModalUser(null)}
        user={resetModalUser}
        onSuccess={fetchUsers}
      />

      {/* Özel Silme Onay Modali */}
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
