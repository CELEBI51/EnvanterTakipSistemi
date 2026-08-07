export const LICENSE_STATUS_LABELS = {
  AKTIF: 'Aktif',
  YENILENDI: 'Yenilendi',
  YENILENMEDI: 'Yenilenmedi',
  YENILENMEYECEK: 'Yenilenmeyecek',
  IPTAL_EDILDI: 'İptal Edildi / Yenilenmeyecek',
  SURESI_DOLDU: 'Süresi Doldu',
};

export const getLicenseStatusLabel = (status) => {
  return LICENSE_STATUS_LABELS[status] || status;
};
