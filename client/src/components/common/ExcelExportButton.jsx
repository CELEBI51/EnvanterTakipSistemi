import React, { useState } from 'react';
import { FileSpreadsheet, Loader2 } from 'lucide-react';
import api from '../../api/axiosClient';
import useAuthStore from '../../store/authStore';
import { hasPermission } from '../../utils/permissions';

/**
 * Excel Export Button Component
 * @param {Object} props
 * @param {string} props.modulePath Endpoint module path (e.g. 'hardware', 'accessories', etc.)
 * @param {Object} props.queryParams Current filter and search query parameters
 * @param {string} props.fileNamePrefix Prefix for downloaded excel file (e.g. 'varlik')
 * @param {string} [props.buttonText='Excel\'e Aktar'] Text displayed on the button
 */
export default function ExcelExportButton({
  modulePath,
  queryParams = {},
  fileNamePrefix = 'export',
  buttonText = "Excel'e Aktar",
}) {
  const user = useAuthStore((state) => state.user);
  const [downloading, setDownloading] = useState(false);

  if (!hasPermission(user, 'excel:view')) {
    return null;
  }

  const handleExport = async () => {
    if (downloading) return;
    setDownloading(true);

    try {
      // Build query string
      const filteredParams = {};
      Object.entries(queryParams).forEach(([key, val]) => {
        if (val !== undefined && val !== null && val !== '' && val !== 'Tümü') {
          filteredParams[key] = val;
        }
      });

      const response = await api.get(`/${modulePath}/export`, {
        params: filteredParams,
        responseType: 'blob',
      });

      const todayStr = new Date().toISOString().split('T')[0];
      const filename = `${fileNamePrefix}_${todayStr}.xlsx`;

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error(`${modulePath} Excel dışa aktarım hatası:`, error);
      alert('Excel dosyası indirilirken bir hata oluştu.');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <button
      onClick={handleExport}
      disabled={downloading}
      className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl border border-emerald-600 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition cursor-pointer shadow-xs disabled:opacity-60 disabled:cursor-not-allowed"
      title="Filtrelenmiş tüm kayıtları Excel olarak indir"
    >
      {downloading ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin text-white" />
          <span>İndiriliyor...</span>
        </>
      ) : (
        <>
          <FileSpreadsheet className="w-4 h-4 text-white" />
          <span>{buttonText}</span>
        </>
      )}
    </button>
  );
}
