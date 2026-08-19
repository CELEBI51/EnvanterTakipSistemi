import React, { useState, useEffect } from 'react';
import { X, FileText, Download, CheckCircle2, RotateCcw, History } from 'lucide-react';
import useAuthStore from '../../../store/authStore';
import { hasPermission } from '../../../utils/permissions';
import FileUploadField from '../../../components/common/FileUploadField';

export default function AssignmentDetailModal({ isOpen, onClose, assignmentId, onReturnClick }) {
  const token = useAuthStore((state) => state.accessToken);
  const currentUser = useAuthStore((state) => state.user);
  const userRole = currentUser?.role?.toLowerCase();


  const [assignment, setAssignment] = useState(null);
  const [returnsHistory, setReturnsHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [uploadingSignedForm, setUploadingSignedForm] = useState(false);
  const [signedFile, setSignedFile] = useState(null);
  const [uploadError, setUploadError] = useState('');

  useEffect(() => {
    if (isOpen && assignmentId) {
      fetchAssignmentDetail();
    }
  }, [isOpen, assignmentId]);

  const fetchAssignmentDetail = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`http://localhost:4001/api/assignments/${assignmentId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok && data.data) {
        setAssignment(data.data);
      } else {
        throw new Error(data.message || 'Zimmet detayı alınamadı.');
      }

      // Fetch Returns History
      const returnRes = await fetch(`http://localhost:4001/api/returns?assignmentId=${assignmentId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (returnRes.ok) {
        const returnData = await returnRes.json();
        setReturnsHistory(returnData.data || []);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPdf = () => {
    window.open(`http://localhost:4001/api/assignments/${assignmentId}/pdf?token=${token}`, '_blank');
  };

  const handleDownloadSignedForm = () => {
    window.open(`http://localhost:4001/api/assignments/${assignmentId}/signed-form?token=${token}`, '_blank');
  };

  const handleUploadSignedForm = async (e) => {
    e.preventDefault();
    if (!signedFile) return;

    setUploadingSignedForm(true);
    setUploadError('');

    try {
      const formData = new FormData();
      formData.append('file', signedFile);

      const res = await fetch(`http://localhost:4001/api/assignments/${assignmentId}/signed-form`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'İmzalı form yüklenirken hata oluştu.');
      }

      setSignedFile(null);
      await fetchAssignmentDetail();
    } catch (err) {
      setUploadError(err.message);
    } finally {
      setUploadingSignedForm(false);
    }
  };

  if (!isOpen) return null;

  const renderStatusBadge = (status) => {
    switch (status) {
      case 'Aktif':
        return (
          <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold border border-emerald-200">
            Aktif Zimmet
          </span>
        );
      case 'Kısmi İade':
      case 'KismiIade':
        return (
          <span className="px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 text-xs font-bold border border-amber-200">
            Kısmi İade Yapıldı
          </span>
        );
      case 'İade Edildi':
      case 'IadeEdildi':
        return (
          <span className="px-2.5 py-1 rounded-full bg-slate-200 text-slate-700 text-xs font-bold border border-slate-300">
            İade Edildi
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-bold border border-slate-200">
            {status}
          </span>
        );
    }
  };

  const isFullyReturned = assignment?.status === 'İade Edildi' || assignment?.status === 'IadeEdildi';

  const hasReturnableHw = assignment?.items && assignment.items.some((item) => !item.returned);
  const hasReturnableAcc = assignment?.accessoryItems && assignment.accessoryItems.some((acc) => acc.quantityGiven - acc.quantityReturned > 0);
  const canReturn = !isFullyReturned && (hasReturnableHw || hasReturnableAcc);


  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-[#1E2534] text-white shrink-0">
          <div className="flex items-center gap-3">
            <h2 className="text-base font-bold tracking-tight">Zimmet Kaydı Detayı</h2>
            {assignment && renderStatusBadge(assignment.status)}
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
              Zimmet detayları yükleniyor...
            </div>
          ) : error ? (
            <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold rounded-xl">
              {error}
            </div>
          ) : assignment ? (
            <>
              {/* Teslim Eden ve Teslim Alan Kartları */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* TESLİM EDEN */}
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="block text-[10px] font-bold text-[#4F8FE0] uppercase tracking-wider mb-2">
                    TESLİM EDEN (IT PERSONELİ)
                  </span>
                  <div className="space-y-1 text-xs">
                    <p className="font-bold text-[#1E2534] text-sm">{assignment.teslimEden}</p>
                    <p className="text-slate-500">{assignment.createdBy?.email}</p>
                    <p className="text-slate-400 text-[11px] mt-1">
                      Teslim Tarihi: {new Date(assignment.teslimTarihi).toLocaleDateString('tr-TR')}
                    </p>
                  </div>
                </div>

                {/* TESLİM ALAN */}
                <div className="p-4 bg-[#EAF2FC]/40 rounded-xl border border-[#4F8FE0]/30">
                  <span className="block text-[10px] font-bold text-[#4F8FE0] uppercase tracking-wider mb-2">
                    TESLİM ALAN (KULLANICI PERSONEL)
                  </span>
                  <div className="space-y-1 text-xs">
                    <p className="font-bold text-[#1E2534] text-sm">{assignment.employee?.fullName}</p>
                    <p className="text-slate-600 font-mono">Sicil No: {assignment.employee?.tcNo}</p>
                    <p className="text-slate-600">Birim: {assignment.employee?.unit?.name || '-'}</p>

                    {assignment.employee?.phone && (
                      <p className="text-slate-600">Tel: {assignment.employee.phone}</p>
                    )}
                    {assignment.employee?.email && (
                      <p className="text-slate-600">E-posta: {assignment.employee.email}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* GRUPLANMIŞ ZİMMET KALEMLERİ */}
              <div className="space-y-4">
                <h3 className="text-xs font-bold text-[#1E2534] uppercase tracking-wider border-b border-slate-200 pb-2">
                  Zimmetlenen Kalemler
                </h3>

                {/* 1. VARLIKLAR */}
                {assignment.items && assignment.items.length > 0 && (
                  <div className="space-y-2">
                    <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-blue-600"></span> Donanım / Varlıklar ({assignment.items.length})
                    </span>
                    <div className="overflow-x-auto border border-slate-200 rounded-xl">
                      <table className="w-full text-left text-xs text-slate-700">
                        <thead className="bg-slate-50 text-[10px] font-bold text-slate-500 uppercase border-b border-slate-200">
                          <tr>
                            <th className="px-3 py-2">Demirbaş No</th>
                            <th className="px-3 py-2">Kategori</th>
                            <th className="px-3 py-2">Marka / Model</th>
                            <th className="px-3 py-2">Seri No</th>
                            <th className="px-3 py-2">Durum</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {assignment.items.map((item) => (
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
                              <td className="px-3 py-2">
                                {item.returned ? (
                                  <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                                    İade Edildi
                                  </span>
                                ) : (
                                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                                    Zimmette ({item.hardware?.status})
                                  </span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* 2. AKSESUARLAR */}
                {assignment.accessoryItems && assignment.accessoryItems.length > 0 && (
                  <div className="space-y-2">
                    <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-purple-600"></span> Aksesuarlar ({assignment.accessoryItems.length})
                    </span>
                    <div className="overflow-x-auto border border-slate-200 rounded-xl">
                      <table className="w-full text-left text-xs text-slate-700">
                        <thead className="bg-slate-50 text-[10px] font-bold text-slate-500 uppercase border-b border-slate-200">
                          <tr>
                            <th className="px-3 py-2">Aksesuar Adı</th>
                            <th className="px-3 py-2">Kategori</th>
                            <th className="px-3 py-2">Verilen</th>
                            <th className="px-3 py-2">İade Edilen</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {assignment.accessoryItems.map((acc) => (
                            <tr key={acc.id} className="hover:bg-slate-50/80">
                              <td className="px-3 py-2 font-bold text-[#1E2534]">{acc.accessory?.name}</td>
                              <td className="px-3 py-2">{acc.accessory?.category?.name || 'Aksesuar'}</td>
                              <td className="px-3 py-2 font-bold text-purple-700">{acc.quantityGiven} adet</td>
                              <td className="px-3 py-2">{acc.quantityReturned} adet</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* 3. SARF MALZEMELER */}
                {assignment.consumableItems && assignment.consumableItems.length > 0 && (
                  <div className="space-y-2">
                    <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-600"></span> Sarf Malzemeler ({assignment.consumableItems.length})
                    </span>
                    <div className="overflow-x-auto border border-slate-200 rounded-xl">
                      <table className="w-full text-left text-xs text-slate-700">
                        <thead className="bg-slate-50 text-[10px] font-bold text-slate-500 uppercase border-b border-slate-200">
                          <tr>
                            <th className="px-3 py-2">Sarf Malzeme Adı</th>
                            <th className="px-3 py-2">Kategori</th>
                            <th className="px-3 py-2">Verilen Miktar</th>
                            <th className="px-3 py-2">Durum</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {assignment.consumableItems.map((con) => (
                            <tr key={con.id} className="hover:bg-slate-50/80">
                              <td className="px-3 py-2 font-bold text-[#1E2534]">{con.consumable?.name}</td>
                              <td className="px-3 py-2">{con.consumable?.category?.name || 'Sarf Malzeme'}</td>
                              <td className="px-3 py-2 font-bold text-emerald-700">{con.quantityGiven} adet</td>
                              <td className="px-3 py-2 text-[11px] font-medium text-slate-500 italic">
                                Verildi (Tüketim - İadesiz)
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>

              {/* BÖLÜM D.2: İADE GEÇMİŞİ LİSTESİ */}
              {returnsHistory.length > 0 && (
                <div className="p-4 bg-amber-50/40 rounded-xl border border-amber-200/60 space-y-3">
                  <div className="flex items-center gap-2 text-amber-800">
                    <History className="w-4 h-4" />
                    <span className="text-xs font-bold uppercase tracking-wider">
                      İade Geçmişi ({returnsHistory.length} İşlem)
                    </span>
                  </div>

                  <div className="space-y-2">
                    {returnsHistory.map((ret) => {
                      const retCount =
                        (ret.items?.length || 0) +
                        (ret.accessoryItems?.length || 0);

                      return (
                        <div
                          key={ret.id}
                          className="flex items-center justify-between p-3 bg-white border border-amber-100 rounded-xl text-xs"
                        >
                          <div>
                            <p className="font-bold text-[#1E2534]">
                              {new Date(ret.tarih).toLocaleDateString('tr-TR')} — {retCount} Kalem İade Alındı
                            </p>
                            <p className="text-slate-500 text-[11px]">Teslim Alan IT: {ret.teslimAlanIc}</p>
                          </div>

                          <button
                            onClick={() =>
                              window.open(`http://localhost:4001/api/returns/${ret.id}/pdf?token=${token}`, '_blank')
                            }
                            className="px-3 py-1.5 rounded-lg bg-amber-600 text-white text-xs font-semibold hover:bg-amber-700 transition cursor-pointer flex items-center gap-1.5"
                          >
                            <FileText className="w-3.5 h-3.5" /> İade PDF'i
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* İMZALI FORM YÜKLEME / GÖRÜNTÜLEME BÖLÜMÜ */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                <h4 className="text-xs font-bold text-[#1E2534] uppercase tracking-wider">
                  İmzalı Zimmet Belgesi
                </h4>

                {assignment.signedFormAttachment ? (
                  <div className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-xl">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span className="text-xs font-semibold text-slate-700">
                        İmzalı zimmet belgesi yüklendi ({assignment.signedFormAttachment.originalName})
                      </span>
                    </div>
                    <button
                      onClick={handleDownloadSignedForm}
                      className="px-3 py-1.5 rounded-lg bg-[#1E2534] text-white text-xs font-semibold hover:bg-slate-800 transition cursor-pointer flex items-center gap-1.5"
                    >
                      <Download className="w-3.5 h-3.5" /> İmzalı Belgeyi İndir
                    </button>
                  </div>
                ) : hasPermission(currentUser, 'assignments:create') ? (
                  <form onSubmit={handleUploadSignedForm} className="space-y-3">
                    {uploadError && (
                      <div className="p-2 bg-rose-50 text-rose-700 text-xs font-semibold rounded-lg">
                        {uploadError}
                      </div>
                    )}
                    <FileUploadField
                      label="İmzalı Zimmet Formu Yükle (PDF / Görsel)"
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
                  <p className="text-xs text-slate-500 italic">Henüz imzalı belge yüklenmemiş.</p>
                )}
              </div>
            </>
          ) : null}
        </div>

        {/* Footer Actions */}
        {assignment && (
          <div className="flex items-center justify-between px-6 py-4 bg-slate-50 border-t border-slate-200 shrink-0">
            {hasPermission(currentUser, 'assignments:pdf') ? (
              <button
                onClick={handleDownloadPdf}
                className="px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-[#1E2534] text-xs font-bold hover:bg-slate-100 transition cursor-pointer flex items-center gap-2"
              >
                <FileText className="w-4 h-4 text-[#4F8FE0]" /> Zimmet PDF'ini İndir
              </button>
            ) : <div />}

            <div className="flex items-center gap-3">
              {canReturn && hasPermission(currentUser, 'assignments:return') && (
                <button
                  onClick={() => {
                    onClose();
                    if (onReturnClick) onReturnClick(assignment);
                  }}
                  className="px-4 py-2.5 rounded-xl bg-amber-600 text-[#FFFFFF] text-xs font-bold hover:bg-amber-700 transition cursor-pointer flex items-center gap-2 shadow-xs"
                >
                  <RotateCcw className="w-4 h-4" /> Zimmet İade Al
                </button>
              )}

              <button
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl bg-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-300 transition cursor-pointer"
              >
                Kapat
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
