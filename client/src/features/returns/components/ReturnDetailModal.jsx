import React, { useState, useEffect } from 'react';
import { X, FileText, Download, CheckCircle2, RotateCcw } from 'lucide-react';
import useAuthStore from '../../../store/authStore';
import { API_BASE_URL } from '../../../config';
import { hasPermission } from '../../../utils/permissions';
import FileUploadField from '../../../components/common/FileUploadField';

export default function ReturnDetailModal({ isOpen, onClose, returnId }) {
  const token = useAuthStore((state) => state.accessToken);
  const currentUser = useAuthStore((state) => state.user);
  const userRole = currentUser?.role?.toLowerCase();


  const [returnRecord, setReturnRecord] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [signedFile, setSignedFile] = useState(null);
  const [uploadingSignedForm, setUploadingSignedForm] = useState(false);
  const [uploadError, setUploadError] = useState('');

  useEffect(() => {
    if (isOpen && returnId) {
      fetchReturnDetail();
    }
  }, [isOpen, returnId]);

  const fetchReturnDetail = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE_URL}/returns/${returnId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok && data.data) {
        setReturnRecord(data.data);
      } else {
        throw new Error(data.message || 'İade detayı alınamadı.');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPdf = () => {
    window.open(`${API_BASE_URL}/returns/${returnId}/pdf?token=${token}`, '_blank');
  };

  const handleDownloadSignedForm = () => {
    window.open(`${API_BASE_URL}/returns/${returnId}/signed-form?token=${token}`, '_blank');
  };

  const handleUploadSignedForm = async (e) => {
    e.preventDefault();
    if (!signedFile) return;

    setUploadingSignedForm(true);
    setUploadError('');

    try {
      const formData = new FormData();
      formData.append('file', signedFile);

      const res = await fetch(`${API_BASE_URL}/returns/${returnId}/signed-form`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'İmzalı iade formu yüklenirken hata oluştu.');
      }

      setSignedFile(null);
      await fetchReturnDetail();
    } catch (err) {
      setUploadError(err.message);
    } finally {
      setUploadingSignedForm(false);
    }
  };

  if (!isOpen) return null;

  const renderResultBadge = (status) => {
    switch (status) {
      case 'Hazir':
      case 'Hazır':
        return (
          <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[10px] font-bold border border-emerald-200">
            Hazır (Sağlam)
          </span>
        );
      case 'Arizali':
      case 'Arızalı':
        return (
          <span className="px-2 py-0.5 rounded-md bg-rose-100 text-rose-800 text-[10px] font-bold border border-rose-200">
            Arızalı
          </span>
        );
      case 'Serviste':
        return (
          <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 text-[10px] font-bold border border-amber-200">
            Serviste
          </span>
        );
      case 'KullanimDisi':
      case 'Kullanım Dışı':
        return (
          <span className="px-2 py-0.5 rounded-md bg-slate-200 text-slate-700 text-[10px] font-bold border border-slate-300">
            Kullanım Dışı
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[10px] font-bold">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-[#1E2534] text-white shrink-0">
          <div className="flex items-center gap-3">
            <RotateCcw className="w-5 h-5 text-[#4F8FE0]" />
            <h2 className="text-base font-bold tracking-tight">Zimmet İade Kaydı Detayı</h2>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition p-1 rounded-lg hover:bg-slate-700/60 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {loading ? (
            <div className="py-12 text-center text-xs font-semibold text-slate-500">
              İade detayları yükleniyor...
            </div>
          ) : error ? (
            <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold rounded-xl">
              {error}
            </div>
          ) : returnRecord ? (
            <>
              {/* Bilgi Kartları */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* ZİMMET SAHİBİ */}
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="block text-[10px] font-bold text-[#4F8FE0] uppercase tracking-wider mb-2">
                    ZİMMET SAHİBİ (İADE EDEN PERSONEL)
                  </span>
                  <div className="space-y-1 text-xs">
                    <p className="font-bold text-[#1E2534] text-sm">
                      {returnRecord.assignment?.employee?.fullName}
                    </p>
                    <p className="text-slate-600 font-mono">
                      Sicil No: {returnRecord.assignment?.employee?.tcNo}
                    </p>
                    <p className="text-slate-600">

                      Birim: {returnRecord.assignment?.employee?.unit?.name || '-'}
                    </p>
                  </div>
                </div>

                {/* İADE ALAN IT PERSONELİ */}
                <div className="p-4 bg-[#EAF2FC]/40 rounded-xl border border-[#4F8FE0]/30">
                  <span className="block text-[10px] font-bold text-[#4F8FE0] uppercase tracking-wider mb-2">
                    İADE BİLGİLERİ (İADE ALAN IT)
                  </span>
                  <div className="space-y-1 text-xs">
                    <p className="font-bold text-[#1E2534] text-sm">
                      Teslim Alan IT: {returnRecord.teslimAlanIc}
                    </p>
                    <p className="text-slate-500">
                      İade Tarihi:{' '}
                      {returnRecord.tarih && !isNaN(new Date(returnRecord.tarih).getTime())
                        ? new Date(returnRecord.tarih).toLocaleDateString('tr-TR')
                        : '-'}
                    </p>
                  </div>
                </div>
              </div>

              {/* İADE EDİLEN KALEMLER */}
              <div className="space-y-4">
                <h3 className="text-xs font-bold text-[#1E2534] uppercase tracking-wider border-b border-slate-200 pb-2">
                  İade Edilen Kalemler
                </h3>

                {/* 1. VARLIK İADELERİ */}
                {returnRecord.items && returnRecord.items.length > 0 && (
                  <div className="space-y-2">
                    <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-blue-600"></span> Varlık / Donanım İadeleri ({returnRecord.items.length})
                    </span>
                    <div className="overflow-x-auto border border-slate-200 rounded-xl">
                      <table className="w-full text-left text-xs text-slate-700">
                        <thead className="bg-slate-50 text-[10px] font-bold text-slate-500 uppercase border-b border-slate-200">
                          <tr>
                            <th className="px-3 py-2">Demirbaş No</th>
                            <th className="px-3 py-2">Kategori</th>
                            <th className="px-3 py-2">Marka / Model</th>
                            <th className="px-3 py-2">Seri No</th>
                            <th className="px-3 py-2">İade Durumu (Sonuç)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {returnRecord.items.map((item) => (
                            <tr key={item.id} className="hover:bg-slate-50/80">
                              <td className="px-3 py-2 font-mono font-bold text-[#1E2534]">
                                {item.hardware?.demirbasNo}
                              </td>
                              <td className="px-3 py-2">{item.hardware?.category?.name || 'Varlık'}</td>
                              <td className="px-3 py-2 font-medium">
                                {item.hardware?.brand} {item.hardware?.model}
                              </td>
                              <td className="px-3 py-2 font-mono text-slate-500">
                                {item.hardware?.serialNo}
                              </td>
                              <td className="px-3 py-2">{renderResultBadge(item.resultStatus)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* 2. AKSESUAR İADELERİ */}
                {returnRecord.accessoryItems && returnRecord.accessoryItems.length > 0 && (
                  <div className="space-y-2">
                    <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-purple-600"></span> Aksesuar İadeleri ({returnRecord.accessoryItems.length})
                    </span>
                    <div className="overflow-x-auto border border-slate-200 rounded-xl">
                      <table className="w-full text-left text-xs text-slate-700">
                        <thead className="bg-slate-50 text-[10px] font-bold text-slate-500 uppercase border-b border-slate-200">
                          <tr>
                            <th className="px-3 py-2">Aksesuar Adı</th>
                            <th className="px-3 py-2">Kategori</th>
                            <th className="px-3 py-2">İade Edilen Miktar</th>
                            <th className="px-3 py-2">İade Durumu (Sonuç)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {returnRecord.accessoryItems.map((acc) => (
                            <tr key={acc.id} className="hover:bg-slate-50/80">
                              <td className="px-3 py-2 font-bold text-[#1E2534]">{acc.accessory?.name}</td>
                              <td className="px-3 py-2">{acc.accessory?.category?.name || 'Aksesuar'}</td>
                              <td className="px-3 py-2 font-bold text-purple-700">{acc.quantityReturned} adet</td>
                              <td className="px-3 py-2">{renderResultBadge(acc.resultStatus || 'Hazır')}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

              </div>

              {/* İade Notu / Nedeni */}
              {(returnRecord.reason || returnRecord.notes) && (
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    İade Nedeni / Notu
                  </span>
                  <p className="text-slate-700 font-medium whitespace-pre-wrap">{returnRecord.reason || returnRecord.notes}</p>
                </div>
              )}

              {/* İMZALI FORM YÜKLEME / GÖRÜNTÜLEME BÖLÜMÜ */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                <h4 className="text-xs font-bold text-[#1E2534] uppercase tracking-wider">
                  İmzalı İade Belgesi
                </h4>

                {returnRecord.signedFormAttachment ? (
                  <div className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-xl">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span className="text-xs font-semibold text-slate-700">
                        İmzalı iade belgesi yüklendi ({returnRecord.signedFormAttachment.originalName})
                      </span>
                    </div>
                    <button
                      onClick={handleDownloadSignedForm}
                      className="px-3 py-1.5 rounded-lg bg-[#1E2534] text-white text-xs font-semibold hover:bg-slate-800 transition cursor-pointer flex items-center gap-1.5"
                    >
                      <Download className="w-3.5 h-3.5" /> İmzalı Belgeyi İndir
                    </button>
                  </div>
                ) : hasPermission(currentUser, 'returns:create') ? (
                  <form onSubmit={handleUploadSignedForm} className="space-y-3">
                    {uploadError && (
                      <div className="p-2 bg-rose-50 text-rose-700 text-xs font-semibold rounded-lg">
                        {uploadError}
                      </div>
                    )}
                    <FileUploadField
                      label="İmzalı İade Formu Yükle (PDF / Görsel)"
                      selectedFile={signedFile}
                      onFileSelect={setSignedFile}
                    />
                    {signedFile && (
                      <div className="flex justify-end">
                        <button
                          type="submit"
                          disabled={uploadingSignedForm}
                          className="px-4 py-2 bg-[#1E2534] text-white text-xs font-bold rounded-xl hover:bg-slate-800 transition disabled:opacity-50 cursor-pointer"
                        >
                          {uploadingSignedForm ? 'Yükleniyor...' : 'Belgeyi Kaydet ve Bağla'}
                        </button>
                      </div>
                    )}
                  </form>
                ) : (
                  <p className="text-xs text-slate-500 italic">Henüz imzalı iade belgesi yüklenmemiş.</p>
                )}
              </div>
            </>
          ) : null}
        </div>

        {/* Footer Actions */}
        {returnRecord && (
          <div className="flex items-center justify-between px-6 py-4 bg-slate-50 border-t border-slate-200 shrink-0">
            {hasPermission(currentUser, 'returns:pdf') ? (
              <button
                onClick={handleDownloadPdf}
                className="px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-[#1E2534] text-xs font-bold hover:bg-slate-100 transition cursor-pointer flex items-center gap-2"
              >
                <FileText className="w-4 h-4 text-[#4F8FE0]" /> İade PDF'ini İndir
              </button>
            ) : <div />}

            <button
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-300 transition cursor-pointer"
            >
              Kapat
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
