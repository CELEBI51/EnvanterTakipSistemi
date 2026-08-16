export const MODULE_PERMISSIONS = [
  {
    key: 'assignments',
    label: 'Zimmetleme',
    viewPermission: 'assignments:view',
    subPermissions: [
      { key: 'assignments:create', label: 'Yeni Zimmet Oluşturma' },
      { key: 'assignments:return', label: 'Zimmet Detayı & İade Al Butonu' },
      { key: 'assignments:pdf', label: 'Zimmet PDF İndirme' },
    ],
  },
  {
    key: 'returns',
    label: 'Zimmet İade',
    viewPermission: 'returns:view',
    subPermissions: [
      { key: 'returns:create', label: 'Yeni İade Oluşturma' },
      { key: 'returns:pdf', label: 'İade PDF İndirme' },
    ],
  },
  {
    key: 'hardware',
    label: 'Varlıklar (Demirbaş)',
    viewPermission: 'hardware:view',
    subPermissions: [
      { key: 'hardware:create', label: 'Yeni Varlık Oluşturma' },
      { key: 'hardware:maintenance', label: 'Bakım İşlemi Oluşturma' },
    ],
  },
  {
    key: 'licenses',
    label: 'Lisanslar',
    viewPermission: 'licenses:view',
    subPermissions: [
      { key: 'licenses:create', label: 'Yeni Lisans Ekleme' },
      { key: 'licenses:manage', label: 'Lisans Durum Değişikliği / Yenileme' },
    ],
  },
  {
    key: 'accessories',
    label: 'Aksesuarlar',
    viewPermission: 'accessories:view',
    subPermissions: [
      { key: 'accessories:manage', label: 'Aksesuar Yönetim Butonu (Ekle / Düzenle / Stok)' },
    ],
  },
  {
    key: 'consumables',
    label: 'Sarf Malzemeler',
    viewPermission: 'consumables:view',
    subPermissions: [
      { key: 'consumables:create', label: 'Yeni Sarf Malzeme Ekleme' },
      { key: 'consumables:manage', label: 'Sarf Malzeme Yönetim Butonu (Stok Güncelleme)' },
    ],
  },
  {
    key: 'components',
    label: 'Bileşenler',
    viewPermission: 'components:view',
    subPermissions: [
      { key: 'components:create', label: 'Yeni Bileşen Ekleme' },
      { key: 'components:manage', label: 'Bileşen Yönetim Butonu (Stok Güncelleme)' },
    ],
  },
  {
    key: 'employees',
    label: 'Personel Yönetimi',
    viewPermission: 'employees:view',
    subPermissions: [
      { key: 'employees:manage', label: 'Personel Yönetim Butonu (Ekle / Düzenle / Pasife Al)' },
    ],
  },
  {
    key: 'excel',
    label: 'Excel İşlemleri (İçe / Dışa Aktarma)',
    viewPermission: 'excel:view',
    subPermissions: [],
  },
];

// All permission strings list
export const ALL_PERMISSIONS = MODULE_PERMISSIONS.reduce((acc, mod) => {
  acc.push(mod.viewPermission);
  mod.subPermissions.forEach((sub) => acc.push(sub.key));
  return acc;
}, []);

export const hasPermission = (user, permissionCode) => {
  if (!user) return false;
  if (user.role?.toLowerCase() === 'admin') return true;
  if (!permissionCode) return true;
  return Array.isArray(user.permissions) && user.permissions.includes(permissionCode);
};
