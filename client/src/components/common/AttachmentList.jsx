import React, { useEffect, useState } from 'react';
import { FileText, Download, Trash2 } from 'lucide-react';
import useAuthStore from '../../store/authStore';
import { API_BASE_URL } from '../../config';

export default function AttachmentList({ entityType, entityId, canDelete = true }) {
  const [attachments, setAttachments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const token = useAuthStore((state) => state.accessToken);

  const fetchAttachments = async () => {
    if (!entityType || !entityId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `${API_BASE_URL}/attachments?entityType=${entityType}&entityId=${entityId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      const result = await res.json();
      if (res.ok) {
        setAttachments(result.data || []);
      } else {
        setError(result.message || 'Ekler yüklenemedi.');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAttachments();
  }, [entityType, entityId]);

  const handleDownload = async (attachment) => {
    try {
      const res = await fetch(
        `${API_BASE_URL}/attachments/${attachment.id}/download`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (!res.ok) throw new Error('Dosya indirilemedi.');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = attachment.originalName || 'dosya';
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Bu dosyayı silmek istediğinizden emin misiniz?')) return;
    try {
      const res = await fetch(`${API_BASE_URL}/attachments/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const result = await res.json();
      if (res.ok) {
        setAttachments((prev) => prev.filter((a) => a.id !== id));
      } else {
        alert(result.message || 'Silme işlemi başarısız.');
      }
    } catch (err) {
      alert(err.message);
    }
  };

  if (loading) {
    return <div className="text-xs text-slate-500 py-2">Ekler yükleniyor...</div>;
  }

  if (error) {
    return <div className="text-xs text-rose-500 py-1">{error}</div>;
  }

  if (attachments.length === 0) {
    return <div className="text-xs text-slate-400 italic py-1">Yüklenecek fatura / ek dosya bulunmuyor.</div>;
  }

  return (
    <div className="space-y-2">
      {attachments.map((item) => (
        <div
          key={item.id}
          className="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm"
        >
          <div className="flex items-center gap-2 min-w-0">
            <FileText className="w-4 h-4 text-slate-600 shrink-0" />
            <span className="font-medium text-slate-700 truncate">{item.originalName || 'Dosya'}</span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => handleDownload(item)}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-[#4F8FE0] hover:bg-[#EAF2FC] rounded transition"
            >
              <Download className="w-3.5 h-3.5" />
              İndir
            </button>
            {canDelete && (
              <button
                type="button"
                onClick={() => handleDelete(item.id)}
                className="p-1 text-slate-400 hover:text-rose-600 rounded transition"
                title="Dosyayı Sil"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
