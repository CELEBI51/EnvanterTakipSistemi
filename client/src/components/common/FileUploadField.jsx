import React, { useRef } from 'react';
import { Upload, X, FileText } from 'lucide-react';

export default function FileUploadField({
  label = 'Fatura Belgesi (PDF veya Resim)',
  onFileSelect,
  selectedFile,
  disabled = false,
}) {
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        alert('Dosya boyutu maksimum 10MB olabilir.');
        return;
      }
      onFileSelect(file);
    }
  };

  const handleClear = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    onFileSelect(null);
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '0 KB';
    const kb = bytes / 1024;
    if (kb < 1024) return `${kb.toFixed(1)} KB`;
    return `${(kb / 1024).toFixed(1)} MB`;
  };

  return (
    <div className="w-full">
      <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
        {label}
      </label>

      {!selectedFile ? (
        <div
          onClick={() => !disabled && fileInputRef.current?.click()}
          className={`border border-dashed border-slate-300 rounded-lg p-3 text-center cursor-pointer transition hover:border-[#4F8FE0] hover:bg-[#EAF2FC]/30 flex items-center justify-center gap-2 ${
            disabled ? 'opacity-50 cursor-not-allowed' : ''
          }`}
        >
          <Upload className="w-4 h-4 text-slate-500" />
          <span className="text-sm font-medium text-slate-600">Dosya Seç (PDF, JPG, PNG - Max 10MB)</span>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
            onChange={handleFileChange}
            disabled={disabled}
            className="hidden"
          />
        </div>
      ) : (
        <div className="flex items-center justify-between p-2.5 border border-slate-200 rounded-lg bg-slate-50">
          <div className="flex items-center gap-2 min-w-0">
            <FileText className="w-4 h-4 text-[#4F8FE0] shrink-0" />
            <span className="text-sm font-medium text-slate-800 truncate">{selectedFile.name}</span>
            <span className="text-xs text-slate-500 shrink-0">({formatFileSize(selectedFile.size)})</span>
          </div>
          <button
            type="button"
            onClick={handleClear}
            disabled={disabled}
            className="text-slate-400 hover:text-rose-600 transition p-1"
            title="Dosyayı kaldır"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
