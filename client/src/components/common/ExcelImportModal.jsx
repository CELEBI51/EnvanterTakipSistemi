import React, { useState } from 'react';
import { Upload, Download, CheckCircle, AlertTriangle, X, FileSpreadsheet } from 'lucide-react';
import api from '../../api/axiosClient';

export default function ExcelImportModal({ isOpen, onClose, moduleKey, moduleTitle, onSuccess }) {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [updateExisting, setUpdateExisting] = useState(false);
  const [validationResult, setValidationResult] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [commitSuccessMsg, setCommitSuccessMsg] = useState('');

  if (!isOpen) return null;

  const handleDownloadTemplate = async () => {
    try {
      const response = await api.get(`/import/${moduleKey}/template`, {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${moduleKey}_import_sablon.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      setErrorMsg('Şablon indirilirken bir hata oluştu.');
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setValidationResult(null);
      setErrorMsg('');
      setCommitSuccessMsg('');
    }
  };

  const handleValidate = async () => {
    if (!file) {
      setErrorMsg('Lütfen önce bir Excel dosyası seçin.');
      return;
    }

    setLoading(true);
    setErrorMsg('');
    setValidationResult(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await api.post(`/import/${moduleKey}/validate?updateExisting=${updateExisting}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setValidationResult(res.data);
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Excel dosyası doğrulanırken bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  const handleCommit = async () => {
    if (!validationResult || !validationResult.rows) return;
    const validRows = validationResult.rows.filter((r) => r.isValid);
    if (validRows.length === 0) {
      setErrorMsg('İçe aktarılabilecek geçerli satır yok.');
      return;
    }

    setLoading(true);
    setErrorMsg('');

    try {
      const res = await api.post(`/import/${moduleKey}/commit`, {
        rows: validRows,
      });
      setCommitSuccessMsg(`${res.data.createdCount} adet ${moduleTitle || moduleKey} kaydı başarıyla sisteme aktarıldı!`);
      if (onSuccess) onSuccess();
      setTimeout(() => {
        handleReset();
        onClose();
      }, 1800);
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Veriler kaydedilirken bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setFile(null);
    setValidationResult(null);
    setErrorMsg('');
    setCommitSuccessMsg('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/50">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-400">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-100">Excel'den İçe Aktar - {moduleTitle}</h3>
              <p className="text-xs text-slate-400">Verilerinizi toplu olarak Excel şablonu ile ekleyin</p>
            </div>
          </div>
          <button
            onClick={() => { handleReset(); onClose(); }}
            className="text-slate-400 hover:text-slate-200 transition-colors p-1 rounded-lg hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1">
          {/* Step 1: Download Template */}
          <div className="bg-slate-800/40 rounded-lg p-4 border border-slate-700/50 flex items-center justify-between">
            <div>
              <h4 className="text-sm font-medium text-slate-200">1. Şablon İndirin</h4>
              <p className="text-xs text-slate-400 mt-0.5">Doğru kolon yapısına ve referans tanımlarına sahip Excel şablonunu kullanın.</p>
            </div>
            <button
              onClick={handleDownloadTemplate}
              className="inline-flex items-center space-x-2 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-md text-xs font-medium transition-colors"
            >
              <Download className="w-4 h-4" />
              <span>Şablonu İndir (.xlsx)</span>
            </button>
          </div>

          {/* Step 2: Select File */}
          <div className="space-y-3">
            <label className="block text-sm font-medium text-slate-200">2. Excel Dosyası Seçin</label>
            <div className="flex items-center space-x-3">
              <input
                type="file"
                accept=".xlsx, .xls"
                onChange={handleFileChange}
                className="block w-full text-sm text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-emerald-500/10 file:text-emerald-400 hover:file:bg-emerald-500/20 file:cursor-pointer"
              />
              <button
                onClick={handleValidate}
                disabled={!file || loading}
                className="inline-flex items-center space-x-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-md text-xs font-medium transition-colors whitespace-nowrap"
              >
                <Upload className="w-4 h-4" />
                <span>{loading ? 'Analiz Ediliyor...' : 'Doğrula ve Önizle'}</span>
              </button>
            </div>
            
            <label className="flex items-center space-x-2 pt-1 cursor-pointer">
              <input
                type="checkbox"
                checked={updateExisting}
                onChange={(e) => setUpdateExisting(e.target.checked)}
                className="rounded border-slate-700 text-emerald-500 focus:ring-emerald-500 bg-slate-800"
              />
              <span className="text-xs text-slate-300">
                Sistemde var olan kayıtları hata vermek yerine güncelle (Tekil anahtar eşleşirse)
              </span>
            </label>
          </div>

          {/* Error Message */}
          {errorMsg && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center space-x-2 text-red-400 text-xs">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Success Commit Message */}
          {commitSuccessMsg && (
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg flex items-center space-x-2 text-emerald-400 text-xs font-medium">
              <CheckCircle className="w-4 h-4 shrink-0" />
              <span>{commitSuccessMsg}</span>
            </div>
          )}

          {/* Validation Result Overview */}
          {validationResult && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
                  <span className="text-xs text-emerald-400 block font-medium">Geçerli Satırlar</span>
                  <span className="text-xl font-bold text-emerald-300">{validationResult.validCount} satır</span>
                </div>
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                  <span className="text-xs text-red-400 block font-medium">Hatalı Satırlar</span>
                  <span className="text-xl font-bold text-red-300">{validationResult.invalidCount} satır</span>
                </div>
              </div>

              {/* Preview Table */}
              <div className="border border-slate-700/60 rounded-lg overflow-hidden max-h-60 overflow-y-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-800/80 text-slate-400 border-b border-slate-700/60 sticky top-0">
                    <tr>
                      <th className="p-2.5">Satır No</th>
                      <th className="p-2.5">Durum</th>
                      <th className="p-2.5">Detay / Hata Mesajı</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {validationResult.rows.map((row, idx) => (
                      <tr key={idx} className={row.isValid ? 'hover:bg-slate-800/30' : 'bg-red-500/5 hover:bg-red-500/10'}>
                        <td className="p-2.5 text-slate-400">#{row.rowIndex}</td>
                        <td className="p-2.5 font-medium">
                          {row.isValid ? (
                            <span className="inline-flex items-center space-x-1 text-emerald-400">
                              <CheckCircle className="w-3.5 h-3.5" />
                              <span>Geçerli</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center space-x-1 text-red-400">
                              <AlertTriangle className="w-3.5 h-3.5" />
                              <span>Hatalı</span>
                            </span>
                          )}
                        </td>
                        <td className="p-2.5 text-slate-300">
                          {row.isValid ? (
                            <span className="text-slate-400 italic">Hazır</span>
                          ) : (
                            <ul className="list-disc list-inside text-red-400 space-y-0.5">
                              {row.errors.map((err, eIdx) => (
                                <li key={eIdx}>{err}</li>
                              ))}
                            </ul>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end space-x-3 px-6 py-4 border-t border-slate-800 bg-slate-900/50">
          <button
            onClick={() => { handleReset(); onClose(); }}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-md text-xs font-medium transition-colors"
          >
            İptal
          </button>
          <button
            onClick={handleCommit}
            disabled={!validationResult || validationResult.validCount === 0 || loading}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-md text-xs font-medium transition-colors"
          >
            {loading ? 'Kaydediliyor...' : `${validationResult?.validCount || 0} Satırı Aktar`}
          </button>
        </div>
      </div>
    </div>
  );
}
