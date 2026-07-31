import React from 'react';
import { X, Printer, Barcode } from 'lucide-react';
import BarcodeLabel from './BarcodeLabel';

export default function BarcodePrintModal({ isOpen, onClose, demirbasNo, brand, model }) {
  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
      <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-2xl w-full max-w-md overflow-hidden flex flex-col my-8">
        {/* Header (Kurumsal Tema) */}
        <div className="flex items-center justify-between px-5 py-4 bg-[#1E2534] text-white">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#4F8FE0] text-white flex items-center justify-center font-bold">
              <Barcode className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-heading text-base font-bold">Barkod Etiketi Yazdır</h3>
              <p className="text-[11px] text-slate-300">Demirbaş etiketini yazıcıya gönderin</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body / Barkod Önizleme Alanı */}
        <div className="p-6 bg-[#F0F4F8] flex flex-col items-center justify-center space-y-4">
          <p className="text-xs text-slate-500 font-medium text-center">
            Aşağıdaki barkod etiketi yazıcıdan 1:1 ölçekte çıkacak şekilde tasarlanmıştır.
          </p>

          {/* Yazdırılacak Alan (.print-area) - Siyah/Beyaz Yüksek Kontrast */}
          <div className="print-area">
            <BarcodeLabel demirbasNo={demirbasNo} brand={brand} model={model} />
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="flex items-center justify-end gap-3 px-5 py-3.5 bg-white border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
          >
            Kapat
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-white bg-[#4F8FE0] hover:bg-[#3D75C4] active:bg-[#3566AD] rounded-xl shadow-xs transition-all cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            Yazdır
          </button>
        </div>
      </div>
    </div>
  );
}
