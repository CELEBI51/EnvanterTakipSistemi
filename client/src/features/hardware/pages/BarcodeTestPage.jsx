import React, { useState } from 'react';
import BarcodeLabel from '../../../components/common/BarcodeLabel';
import BarcodePrintModal from '../../../components/common/BarcodePrintModal';
import { Barcode, Printer } from 'lucide-react';

export default function BarcodeTestPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const sampleHardware = {
    demirbasNo: '2024-0157',
    brand: 'Dell',
    model: 'Latitude 5540',
  };

  return (
    <div className="p-8 space-y-6 max-w-xl mx-auto bg-white rounded-2xl border border-slate-200 shadow-sm mt-8">
      <div className="flex items-center gap-2 border-b border-slate-100 pb-4">
        <Barcode className="w-6 h-6 text-[#4F8FE0]" />
        <div>
          <h1 className="font-heading text-lg font-bold text-[#1E2534]">
            Barkod Bileşeni Doğrulama & Test Sayfası
          </h1>
          <p className="text-xs text-slate-500">
            CODE128 istemci tarafı barkod üretimi ve etiket önizlemesi
          </p>
        </div>
      </div>

      <div className="space-y-3">
        <h2 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
          Canlı Etiket Önizlemesi (2024-0157):
        </h2>
        <div className="flex justify-center p-4 bg-slate-50 rounded-xl border border-slate-200">
          <BarcodeLabel
            demirbasNo={sampleHardware.demirbasNo}
            brand={sampleHardware.brand}
            model={sampleHardware.model}
          />
        </div>
      </div>

      <div className="pt-2 flex justify-end">
        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#4F8FE0] hover:bg-[#3D75C4] text-white text-xs font-bold shadow-xs transition-all"
        >
          <Printer className="w-4 h-4" />
          Yazdır Modalını Aç
        </button>
      </div>

      <BarcodePrintModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        demirbasNo={sampleHardware.demirbasNo}
        brand={sampleHardware.brand}
        model={sampleHardware.model}
      />
    </div>
  );
}
