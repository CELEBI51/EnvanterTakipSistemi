export const STOCK_MOVEMENT_TYPES = {
  restock: {
    label: 'Stok Girişi',
    sign: '+',
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    textClass: 'text-emerald-700',
  },
  mark_defective: {
    label: 'Arızalı Ayrıldı',
    sign: '-',
    badgeClass: 'bg-rose-50 text-rose-700 border-rose-200',
    textClass: 'text-rose-700',
  },
  assigned: {
    label: 'Zimmetlendi',
    sign: '-',
    badgeClass: 'bg-[#EAF2FC] text-[#4F8FE0] border-[#4F8FE0]/30',
    textClass: 'text-[#4F8FE0]',
  },
  returned: {
    label: 'İade Alındı',
    sign: '+',
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    textClass: 'text-emerald-700',
  },
  used_in_maintenance: {
    label: 'Bakımda Kullanıldı',
    sign: '-',
    badgeClass: 'bg-amber-50 text-amber-800 border-amber-200',
    textClass: 'text-amber-800',
  },
  used: {
    label: 'Kullanıldı / Montaj',
    sign: '-',
    badgeClass: 'bg-amber-50 text-amber-800 border-amber-200',
    textClass: 'text-amber-800',
  },
  issued: {
    label: 'Verildi',
    sign: '-',
    badgeClass: 'bg-purple-50 text-purple-700 border-purple-200',
    textClass: 'text-purple-700',
  },
  issue: {
    label: 'Verildi',
    sign: '-',
    badgeClass: 'bg-purple-50 text-purple-700 border-purple-200',
    textClass: 'text-purple-700',
  },
  consume: {
    label: 'Tüketildi',
    sign: '-',
    badgeClass: 'bg-purple-50 text-purple-700 border-purple-200',
    textClass: 'text-purple-700',
  },
  adjusted: {
    label: 'Stok Düzeltme',
    sign: '',
    badgeClass: 'bg-slate-100 text-slate-700 border-slate-200',
    textClass: 'text-slate-700',
  },
};

export const getStockMovementInfo = (type, quantity) => {
  const info = STOCK_MOVEMENT_TYPES[type] || {
    label: type || 'Stok Hareketi',
    sign: quantity > 0 ? '+' : quantity < 0 ? '-' : '',
    badgeClass: 'bg-slate-100 text-slate-700 border-slate-200',
    textClass: 'text-slate-700',
  };

  const qtyNum = Math.abs(quantity || 0);
  const formattedQuantity = `${info.sign}${qtyNum} adet`;

  return {
    ...info,
    formattedQuantity,
  };
};
