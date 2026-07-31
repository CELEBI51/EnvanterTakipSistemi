import React, { useEffect, useRef } from 'react';
import JsBarcode from 'jsbarcode';

export default function BarcodeLabel({ demirbasNo, brand, model }) {
  const svgRef = useRef(null);

  const titleText = [brand, model].filter(Boolean).join(' ');

  useEffect(() => {
    if (svgRef.current && demirbasNo) {
      try {
        JsBarcode(svgRef.current, demirbasNo, {
          format: 'CODE128',
          displayValue: false,
          width: 1.8,
          height: 48,
          margin: 6,
          background: '#ffffff',
          lineColor: '#000000',
        });
      } catch (err) {
        console.error('[BarcodeLabel] Barkod üretme hatası:', err);
      }
    }
  }, [demirbasNo]);

  if (!demirbasNo) {
    return (
      <div className="p-4 bg-white border border-slate-300 rounded-lg text-xs text-slate-400 text-center">
        Demirbaş Numarası Belirtilmedi
      </div>
    );
  }

  return (
    <div className="inline-flex flex-col items-center justify-center bg-white p-4 border border-slate-300 rounded-xl shadow-xs text-black max-w-xs">
      {/* Ürün Başlığı (Opsiyonel Marka/Model) */}
      {titleText && (
        <div className="text-[11px] font-bold text-slate-800 mb-1 truncate max-w-[220px] text-center tracking-tight">
          {titleText}
        </div>
      )}

      {/* Barkod SVG Çizim Alanı (High Contrast Black/White for Scanners) */}
      <div className="flex justify-center my-0.5">
        <svg ref={svgRef} className="max-w-full h-auto"></svg>
      </div>

      {/* İnsan Gözüyle Okunabilir Demirbaş Numarası */}
      <div className="font-mono text-xs font-bold text-black tracking-widest mt-1 text-center select-all">
        {demirbasNo}
      </div>
    </div>
  );
}
