import React, { useEffect, useState, useRef } from 'react';
import {
  Database,
  Download,
  Upload,
  CheckSquare,
  Square,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
  RefreshCw,
  Info,
  ShieldAlert,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import useAuthStore from '../../../store/authStore';

const MODULE_LIST = [
  { key: 'hardware', label: 'Varlıklar (Donanım)', sheetName: 'Varlıklar' },
  { key: 'accessories', label: 'Aksesuarlar', sheetName: 'Aksesuarlar' },
  { key: 'consumables', label: 'Sarf Malzemeler', sheetName: 'Sarf Malzemeler' },
  { key: 'components', label: 'Bileşenler', sheetName: 'Bileşenler' },
  { key: 'licenses', label: 'Lisanslar', sheetName: 'Lisanslar' },
  { key: 'employees', label: 'Personel', sheetName: 'Personel' },
  { key: 'assignments', label: 'Zimmetler', sheetName: 'Zimmetler' },
  { key: 'returns', label: 'İadeler', sheetName: 'İadeler' },
  { key: 'users', label: 'Kullanıcılar', sheetName: 'Kullanıcılar' },
  { key: 'categories', label: 'Kategoriler', sheetName: 'Kategoriler' },
  { key: 'units', label: 'Birimler', sheetName: 'Birimler' },
];

const SHEET_MODULE_MAP = MODULE_LIST.reduce((acc, m) => {
  acc[m.sheetName] = m.key;
  return acc;
}, {});

export default function BackupSettingsTab() {
  const token = useAuthStore((state) => state.accessToken);
  const user = useAuthStore((state) => state.user);

  // Counts state
  const [counts, setCounts] = useState({});
  const [countsLoading, setCountsLoading] = useState(true);

  // Export selection state
  const [selectedExportModules, setSelectedExportModules] = useState(
    MODULE_LIST.map((m) => m.key)
  );
  const [downloadLoading, setDownloadLoading] = useState(false);
  const [exportError, setExportError] = useState('');

  // Import / Restore state
  const [restoreFile, setRestoreFile] = useState(null);
  const [previewSheets, setPreviewSheets] = useState([]);
  const [restoreStrategies, setRestoreStrategies] = useState({});
  const [restoreLoading, setRestoreLoading] = useState(false);
  const [restoreResult, setRestoreResult] = useState(null);
  const [restoreError, setRestoreError] = useState('');

  const fileInputRef = useRef(null);
  const canEdit = user?.role === 'admin';

  // Fetch record counts
  const fetchCounts = async () => {
    setCountsLoading(true);
    try {
      const res = await fetch('http://localhost:4001/api/settings/backup/counts', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) {
        setCounts(data.data || {});
      }
    } catch (err) {
      console.error('Kayıt sayıları çekilemedi:', err);
    } finally {
      setCountsLoading(false);
    }
  };

  useEffect(() => {
    fetchCounts();
  }, [token]);

  // Export Checkbox Toggle Logic
  const handleToggleModule = (key) => {
    setSelectedExportModules((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const handleToggleAllExport = () => {
    if (selectedExportModules.length === MODULE_LIST.length) {
      setSelectedExportModules([]);
    } else {
      setSelectedExportModules(MODULE_LIST.map((m) => m.key));
    }
  };

  // Export / Download Backup
  const handleDownloadBackup = async () => {
    if (selectedExportModules.length === 0) {
      setExportError('Lütfen yedeklemek için en az 1 modül seçiniz.');
      return;
    }

    setDownloadLoading(true);
    setExportError('');

    try {
      const queryStr = selectedExportModules.join(',');
      const res = await fetch(`http://localhost:4001/api/settings/backup?modules=${queryStr}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Yedek dosyası indirilemedi.');
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const todayStr = new Date().toISOString().split('T')[0];
      const filename = `ditas-yedek-${todayStr}.xlsx`;

      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      setExportError(err.message);
    } finally {
      setDownloadLoading(false);
    }
  };

  // File Select & Preview Sheet Reading (Client-side XLSX)
  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.xlsx')) {
      setRestoreError('Lütfen geçerli bir Excel (.xlsx) dosyası yükleyiniz.');
      return;
    }

    setRestoreFile(file);
    setRestoreResult(null);
    setRestoreError('');

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const buffer = evt.target.result;
        const workbook = XLSX.read(buffer, { type: 'array' });

        const detected = [];
        const initialStrategies = {};

        workbook.SheetNames.forEach((sheetName) => {
          const modKey = SHEET_MODULE_MAP[sheetName];
          const sheet = workbook.Sheets[sheetName];
          const rowCount = XLSX.utils.sheet_to_json(sheet).length;

          if (modKey) {
            detected.push({
              sheetName,
              modKey,
              label: MODULE_LIST.find((m) => m.key === modKey)?.label || sheetName,
              rowCount,
            });
            initialStrategies[modKey] = 'upsert';
          }
        });

        if (detected.length === 0) {
          setRestoreError('Yüklenen dosyada desteklenen hiçbir modül (sheet) bulunamadı.');
          setPreviewSheets([]);
          setRestoreFile(null);
          return;
        }

        setPreviewSheets(detected);
        setRestoreStrategies(initialStrategies);
      } catch (err) {
        setRestoreError(`Excel dosyası okunamadı: ${err.message}`);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleStrategyChange = (modKey, val) => {
    setRestoreStrategies((prev) => ({
      ...prev,
      [modKey]: val,
    }));
  };

  // Restore Submit (POST /api/settings/restore)
  const handleRestoreSubmit = async (e) => {
    e.preventDefault();
    if (!restoreFile) {
      setRestoreError('Lütfen geri yüklenecek Excel dosyasını seçiniz.');
      return;
    }

    const hasOverwrite = Object.values(restoreStrategies).includes('overwrite');
    if (hasOverwrite) {
      const confirmOverwrite = window.confirm(
        'DİKKAT! "Tümünü Sil ve Yükle (Overwrite)" seçtiğiniz modüllerdeki MEVCUT TÜM VERİLER KALICI OLARAK SİLİNECEKTİR!\n\nDevam etmek istiyor musunuz?'
      );
      if (!confirmOverwrite) return;
    }

    setRestoreLoading(true);
    setRestoreError('');
    setRestoreResult(null);

    try {
      const formData = new FormData();
      formData.append('backupFile', restoreFile);
      formData.append('strategies', JSON.stringify(restoreStrategies));

      const res = await fetch('http://localhost:4001/api/settings/restore', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Yedek geri yükleme başarısız.');

      setRestoreResult(data);
      fetchCounts();
    } catch (err) {
      setRestoreError(err.message);
    } finally {
      setRestoreLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold font-heading text-[#1E2534] flex items-center gap-2" style={{ color: 'var(--theme-text-primary)' }}>
            <Database className="w-5 h-5" style={{ color: 'var(--theme-accent)' }} />
            Yedekleme & Geri Yükleme (Backup & Restore)
          </h2>
          <p className="text-xs mt-1" style={{ color: 'var(--theme-text-secondary)' }}>
            Tüm modül verilerinizi Excel (.xlsx) olarak yedekleyin veya önceden alınan yedekleri sisteme geri yükleyin.
          </p>
        </div>
      </div>

      {/* ─── ÜST BÖLÜM: YEDEK AL (EXPORT) ─── */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-[#4F8FE0] flex items-center justify-center font-bold">
              <Download className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold font-heading text-[#1E2534]">
                1. Modül Yedeği İndir (Excel Export)
              </h3>
              <p className="text-[11px] text-slate-500">
                Seçtiğiniz modüller ayrı çalışma sayfaları (sheet) olarak tek Excel dosyasında indirilmektedir.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleToggleAllExport}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition cursor-pointer self-start sm:self-auto"
          >
            {selectedExportModules.length === MODULE_LIST.length ? (
              <>
                <Square className="w-3.5 h-3.5 text-slate-500" />
                Tümünü Kaldır
              </>
            ) : (
              <>
                <CheckSquare className="w-3.5 h-3.5 text-[#4F8FE0]" />
                Tümünü Seç ({MODULE_LIST.length})
              </>
            )}
          </button>
        </div>

        {exportError && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-medium flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{exportError}</span>
          </div>
        )}

        {/* 2 Sütun Checkbox Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {MODULE_LIST.map((m) => {
            const isChecked = selectedExportModules.includes(m.key);
            const count = counts[m.key] !== undefined ? counts[m.key] : '...';

            return (
              <label
                key={m.key}
                onClick={() => handleToggleModule(m.key)}
                className={`p-3.5 rounded-xl border flex items-center justify-between cursor-pointer transition select-none ${
                  isChecked
                    ? 'bg-blue-50/50 border-[#4F8FE0] text-[#1E2534]'
                    : 'bg-slate-50/60 border-slate-200 text-slate-500 hover:bg-slate-100/60'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    className={`w-4 h-4 rounded-md border flex items-center justify-center transition shrink-0 ${
                      isChecked
                        ? 'bg-[#4F8FE0] border-[#4F8FE0] text-white'
                        : 'border-slate-300 bg-white'
                    }`}
                  >
                    {isChecked && <CheckSquare className="w-3.5 h-3.5" />}
                  </div>
                  <span className="text-xs font-bold truncate">{m.label}</span>
                </div>

                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-600 shrink-0">
                  {countsLoading ? '...' : `${count} kayıt`}
                </span>
              </label>
            );
          })}
        </div>

        <div className="pt-2 flex items-center justify-between border-t border-slate-100">
          <span className="text-xs text-slate-500">
            Seçilen: <strong>{selectedExportModules.length}</strong> / {MODULE_LIST.length} modül
          </span>

          <button
            type="button"
            onClick={handleDownloadBackup}
            disabled={downloadLoading || selectedExportModules.length === 0}
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#4F8FE0] hover:bg-[#3D75C4] text-white font-bold text-xs rounded-xl shadow-md hover:shadow-lg transition cursor-pointer disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            {downloadLoading ? 'Hazırlanıyor...' : 'Yedeği İndir (.xlsx)'}
          </button>
        </div>
      </div>

      {/* ─── ALT BÖLÜM: YEDEK YÜKLE (RESTORE) ─── */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-5">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
              <Upload className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold font-heading text-[#1E2534]">
                2. Yedeği Geri Yükle (Excel Restore)
              </h3>
              <p className="text-[11px] text-slate-500">
                Önceden indirilmiş Excel yedeğini seçin, modül bazlı aktarım stratejisini belirleyin.
              </p>
            </div>
          </div>
        </div>

        {restoreError && (
          <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-medium flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{restoreError}</span>
          </div>
        )}

        {restoreResult && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-emerald-800">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Yedek başarıyla sisteme aktarıldı!</span>
            </div>
            <div className="text-[11px] text-emerald-700 font-medium pl-6 space-y-1">
              {Object.entries(restoreResult.imported || {}).map(([modKey, count]) => (
                <div key={modKey}>
                  • <strong>{MODULE_LIST.find((m) => m.key === modKey)?.label || modKey}:</strong> {count} satır işlendi.
                </div>
              ))}
            </div>
            {restoreResult.errors && restoreResult.errors.length > 0 && (
              <div className="mt-2 pt-2 border-t border-emerald-200/60 text-[11px] text-amber-800 space-y-1">
                <strong>Uyarılar / Atlanan Satırlar:</strong>
                {restoreResult.errors.map((err, idx) => (
                  <div key={idx} className="text-[10px]">
                    ⚠️ {err}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* File Select Area */}
        {!canEdit ? (
          <p className="text-xs text-slate-400 italic">
            Yedek geri yükleme yetkisine sadece admin sahiptir.
          </p>
        ) : (
          <form onSubmit={handleRestoreSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Yedek Dosyası Seç (.xlsx)
              </label>
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-300 hover:border-[#4F8FE0] hover:bg-blue-50/30 rounded-2xl p-6 text-center cursor-pointer transition flex flex-col items-center justify-center gap-2"
              >
                <FileSpreadsheet className="w-8 h-8 text-slate-400" />
                {restoreFile ? (
                  <div className="text-xs font-bold text-[#1E2534]">
                    Seçili Dosya: <span className="text-[#4F8FE0]">{restoreFile.name}</span> (
                    {(restoreFile.size / 1024).toFixed(1)} KB)
                  </div>
                ) : (
                  <>
                    <span className="text-xs font-bold text-slate-600">
                      Excel Yedek Dosyasını Sürükleyin veya Tıklayın
                    </span>
                    <span className="text-[10px] text-slate-400">
                      Desteklenen format: .xlsx (Multi-sheet)
                    </span>
                  </>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </div>
            </div>

            {/* Preview Sheet List & Per-Module Strategy Radio Group */}
            {previewSheets.length > 0 && (
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <Info className="w-4 h-4 text-[#4F8FE0]" />
                    Dosya İçindeki Tespit Edilen Modüller ({previewSheets.length})
                  </span>
                  <span className="text-[10px] text-slate-400 font-medium">
                    Aktarım Stratejisini Seçin
                  </span>
                </div>

                <div className="space-y-3">
                  {previewSheets.map((item) => {
                    const strategy = restoreStrategies[item.modKey] || 'upsert';

                    return (
                      <div
                        key={item.modKey}
                        className={`p-4 rounded-2xl border transition ${
                          strategy === 'overwrite'
                            ? 'bg-rose-50/40 border-rose-200'
                            : 'bg-slate-50/80 border-slate-200'
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold font-heading text-[#1E2534]">
                                {item.label}
                              </span>
                              <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-600">
                                {item.rowCount} satır tespit edildi
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-500 mt-0.5">
                              Çalışma Sayfası: <strong>{item.sheetName}</strong>
                            </p>
                          </div>

                          {/* Strategy Radios */}
                          <div className="flex items-center gap-4 text-xs font-semibold shrink-0">
                            <label className="inline-flex items-center gap-1.5 cursor-pointer">
                              <input
                                type="radio"
                                name={`strategy_${item.modKey}`}
                                value="upsert"
                                checked={strategy === 'upsert'}
                                onChange={() => handleStrategyChange(item.modKey, 'upsert')}
                                className="text-[#4F8FE0] focus:ring-[#4F8FE0]"
                              />
                              <span className="text-slate-700">Üstüne Yaz / Güncelle (Upsert)</span>
                            </label>

                            <label className="inline-flex items-center gap-1.5 cursor-pointer">
                              <input
                                type="radio"
                                name={`strategy_${item.modKey}`}
                                value="overwrite"
                                checked={strategy === 'overwrite'}
                                onChange={() => handleStrategyChange(item.modKey, 'overwrite')}
                                className="text-rose-600 focus:ring-rose-600"
                              />
                              <span className="text-rose-700 font-bold">
                                Tümünü Sil ve Yükle (Overwrite)
                              </span>
                            </label>
                          </div>
                        </div>

                        {/* Overwrite Warning Banner */}
                        {strategy === 'overwrite' && (
                          <div className="mt-3 p-2.5 bg-rose-100/80 border border-rose-300 text-rose-800 rounded-xl text-[11px] font-bold flex items-center gap-2">
                            <ShieldAlert className="w-4 h-4 shrink-0 text-rose-600" />
                            <span>
                              DİKKAT: Bu işlem onaylandığında "{item.label}" modülündeki MEVCUT
                              TÜM VERİLER silinecek ve yedeğinizdeki veriler yüklenecektir!
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Submit Row */}
                <div className="pt-3 flex items-center justify-end border-t border-slate-100">
                  <button
                    type="submit"
                    disabled={restoreLoading}
                    className="inline-flex items-center gap-2 px-6 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-md hover:shadow-lg transition cursor-pointer disabled:opacity-50"
                  >
                    <RefreshCw className={`w-4 h-4 ${restoreLoading ? 'animate-spin' : ''}`} />
                    {restoreLoading ? 'Geri Yükleniyor...' : 'Yedeği Geri Yükle (Restore)'}
                  </button>
                </div>
              </div>
            )}
          </form>
        )}
      </div>
    </div>
  );
}
