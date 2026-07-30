import React from 'react';
import { Inbox } from 'lucide-react';

export default function EmptyState({
  icon: Icon = Inbox,
  title = 'Kayıt Bulunamadı',
  description = 'Görüntülenecek herhangi bir veri henüz mevcut değil.',
  action,
}) {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center bg-white rounded-xl border border-[#E2E8F0] shadow-sm">
      <div className="w-12 h-12 rounded-xl bg-[#F0F4F8] text-[#1E2534]/70 flex items-center justify-center mb-3">
        <Icon className="w-6 h-6 stroke-[1.75]" />
      </div>
      <h3 className="font-heading text-base font-bold text-[#1E2534]">{title}</h3>
      <p className="text-xs text-slate-500 mt-1 max-w-sm font-medium leading-relaxed">
        {description}
      </p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
