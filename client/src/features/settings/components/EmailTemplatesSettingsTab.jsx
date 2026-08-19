import React, { useEffect, useState, useRef } from 'react';
import {
  Mail,
  Send,
  Save,
  CheckCircle2,
  AlertCircle,
  Clock,
  Package,
  AlertTriangle,
  FileCheck,
  Tag,
  RotateCcw,
} from 'lucide-react';
import useAuthStore from '../../../store/authStore';

const TEMPLATE_DEFINITIONS = [
  {
    type: 'license_expiry',
    label: 'Lisans Bitiş Uyarısı',
    badge: '15 Gün Kala',
    icon: Clock,
    iconColor: 'text-amber-500',
    iconBg: 'bg-amber-50 border-amber-200',
    description: 'Lisans geçerlilik süresinin dolmasına az bir zaman kaldığında gönderilen özet hatırlatma e-postası.',
    variables: ['{{lisansSayisi}}', '{{lisansListesi}}', '{{sirketAdi}}'],
  },
  {
    type: 'critical_stock',
    label: 'Kritik Stok Uyarısı',
    badge: 'Stok Eşiği',
    icon: AlertTriangle,
    iconColor: 'text-rose-500',
    iconBg: 'bg-rose-50 border-rose-200',
    description: 'Aksesuar veya sarf malzemelerin miktarı kritik limitin altına düştüğünde gönderilen uyarı e-postası.',
    variables: ['{{urunSayisi}}', '{{urunListesi}}', '{{sirketAdi}}'],
  },
  {
    type: 'license_expired',
    label: 'Lisans Süresi Doldu',
    badge: 'Bitiş Tarihi',
    icon: AlertCircle,
    iconColor: 'text-rose-600',
    iconBg: 'bg-rose-100 border-rose-300',
    description: 'Lisans süresi resmen dolduğunda ve durumu otomatik "SÜRESİ DOLDU" yapıldığında anlık gönderilen e-posta.',
    variables: ['{{lisansSayisi}}', '{{lisansListesi}}', '{{sirketAdi}}'],
  },
  {
    type: 'new_assignment',
    label: 'Yeni Zimmet Bildirimi',
    badge: 'Zimmetleme',
    icon: Package,
    iconColor: 'text-[#4F8FE0]',
    iconBg: 'bg-blue-50 border-blue-200',
    description: 'Personele yeni bir donanım, aksesuar veya sarf malzeme zimmetlendiğinde yöneticilere gönderilen bildirim.',
    variables: ['{{personelAdi}}', '{{birimAdi}}', '{{tarih}}', '{{teslimEden}}', '{{kalemListesi}}', '{{sirketAdi}}'],
  },
];

export default function EmailTemplatesSettingsTab() {
  const token = useAuthStore((state) => state.accessToken);
  const user = useAuthStore((state) => state.user);

  const [activeType, setActiveType] = useState('license_expiry');
  const [templates, setTemplates] = useState({});
  const [loading, setLoading] = useState(true);
  const [saveLoading, setSaveLoading] = useState(false);
  const [testLoading, setTestLoading] = useState(false);

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form State for Active Template
  const [currentSubject, setCurrentSubject] = useState('');
  const [currentBodyText, setCurrentBodyText] = useState('');
  const [isDirty, setIsDirty] = useState(false);

  const textareaRef = useRef(null);
  const canEdit = user?.role === 'admin';

  // Fetch all templates from API
  const fetchTemplates = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('http://localhost:4001/api/settings/email-templates', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Şablonlar yüklenemedi.');

      const map = {};
      (data.data || []).forEach((t) => {
        map[t.type] = t;
      });
      setTemplates(map);

      // Load active template state
      if (map[activeType]) {
        setCurrentSubject(map[activeType].subject || '');
        setCurrentBodyText(map[activeType].bodyText || '');
        setIsDirty(false);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, [token]);

  // Handle Tab Change with unsaved changes check
  const handleSelectTab = (type) => {
    if (type === activeType) return;

    if (isDirty) {
      const confirmLeave = window.confirm(
        'Kaydedilmemiş değişiklikleriniz var! Başka bir şablona geçerseniz değişiklikler kaybolacak. Devam etmek istiyor musunuz?'
      );
      if (!confirmLeave) return;
    }

    setActiveType(type);
    setError('');
    setSuccess('');

    if (templates[type]) {
      setCurrentSubject(templates[type].subject || '');
      setCurrentBodyText(templates[type].bodyText || '');
      setIsDirty(false);
    } else {
      setCurrentSubject('');
      setCurrentBodyText('');
      setIsDirty(false);
    }
  };

  // Insert Variable at Cursor Position in Textarea
  const handleInsertVariable = (varTag) => {
    if (!canEdit) return;

    const textarea = textareaRef.current;
    if (!textarea) {
      setCurrentBodyText((prev) => prev + ' ' + varTag);
      setIsDirty(true);
      return;
    }

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = currentBodyText;

    const before = text.substring(0, start);
    const after = text.substring(end, text.length);

    const newText = before + varTag + after;
    setCurrentBodyText(newText);
    setIsDirty(true);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + varTag.length, start + varTag.length);
    }, 0);
  };

  // Save Template (PUT)
  const handleSave = async (e) => {
    e.preventDefault();
    if (!currentSubject.trim()) {
      setError('E-posta konusu boş olamaz.');
      return;
    }
    if (!currentBodyText.trim()) {
      setError('E-posta içeriği boş olamaz.');
      return;
    }

    setSaveLoading(true);
    setError('');
    setSuccess('');

    try {
      const res = await fetch(`http://localhost:4001/api/settings/email-templates/${activeType}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          subject: currentSubject.trim(),
          bodyText: currentBodyText.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Şablon kaydedilemedi.');

      setTemplates((prev) => ({
        ...prev,
        [activeType]: data.data,
      }));
      setIsDirty(false);
      setSuccess('E-posta şablonu başarıyla güncellendi.');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaveLoading(false);
    }
  };

  // Send Test Email (POST /test)
  const handleSendTestEmail = async () => {
    setTestLoading(true);
    setError('');
    setSuccess('');

    try {
      const res = await fetch(`http://localhost:4001/api/settings/email-templates/${activeType}/test`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Test e-postası gönderilemedi.');

      setSuccess(data.message || 'Test e-postası başarıyla gönderildi.');
    } catch (err) {
      setError(err.message || 'Test e-postası gönderilirken hata oluştu.');
    } finally {
      setTestLoading(false);
    }
  };

  const activeDef = TEMPLATE_DEFINITIONS.find((d) => d.type === activeType) || TEMPLATE_DEFINITIONS[0];
  const IconComponent = activeDef.icon;

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-xs text-slate-400 font-medium shadow-xs">
        E-posta şablonları yükleniyor...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold font-heading text-[#1E2534] flex items-center gap-2" style={{ color: 'var(--theme-text-primary)' }}>
            <Mail className="w-5 h-5" style={{ color: 'var(--theme-accent)' }} />
            E-posta Şablonları Yönetimi
          </h2>
          <p className="text-xs mt-1" style={{ color: 'var(--theme-text-secondary)' }}>
            Otomatik e-posta bildirimlerinin konu ve içeriğini düzenleyin, dinamik değişkenler ekleyin.
          </p>
        </div>
      </div>

      {/* Global Alerts */}
      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-700 font-medium flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs text-emerald-800 font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
          <span>{success}</span>
        </div>
      )}

      {/* Template Selector Cards (Tab Buttons) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {TEMPLATE_DEFINITIONS.map((def) => {
          const Icon = def.icon;
          const isActive = activeType === def.type;

          return (
            <button
              key={def.type}
              type="button"
              onClick={() => handleSelectTab(def.type)}
              className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                isActive
                  ? 'bg-white border-[#4F8FE0] ring-2 ring-[#4F8FE0]/20 shadow-md'
                  : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/50 shadow-xs'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className={`w-8 h-8 rounded-xl border flex items-center justify-center ${def.iconBg} ${def.iconColor}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600">
                    {def.badge}
                  </span>
                </div>
                <h3 className="font-heading text-xs font-bold text-[#1E2534] leading-tight">
                  {def.label}
                </h3>
              </div>

              <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                <span className="text-slate-400 font-medium">{def.type}</span>
                {isActive && <span className="font-bold text-[#4F8FE0]">Seçili</span>}
              </div>
            </button>
          );
        })}
      </div>

      {/* Active Template Editor Box */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl border flex items-center justify-center ${activeDef.iconBg} ${activeDef.iconColor}`}>
              <IconComponent className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold font-heading text-[#1E2534]">
                {activeDef.label}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">{activeDef.description}</p>
            </div>
          </div>

          {canEdit && (
            <button
              type="button"
              onClick={handleSendTestEmail}
              disabled={testLoading}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition cursor-pointer disabled:opacity-50 shrink-0"
              title="Admin e-postanıza örnek verilerle test e-postası gönderir"
            >
              <Send className="w-3.5 h-3.5 text-[#4F8FE0]" />
              {testLoading ? 'Gönderiliyor...' : 'Test Maili Gönder'}
            </button>
          )}
        </div>

        <form onSubmit={handleSave} className="space-y-5">
          {/* Subject Field */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              E-posta Konusu <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              disabled={!canEdit}
              value={currentSubject}
              onChange={(e) => {
                setCurrentSubject(e.target.value);
                setIsDirty(true);
              }}
              placeholder="E-posta konu başlığı..."
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-[#1E2534] focus:outline-hidden focus:border-[#4F8FE0] disabled:opacity-60"
            />
          </div>

          {/* Dynamic Variable Chips */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5 text-[#4F8FE0]" />
              Kullanılabilir Dinamik Değişkenler
              <span className="text-[10px] text-slate-400 font-normal">
                (Metne eklemek için etikete tıklayın)
              </span>
            </label>
            <div className="flex flex-wrap gap-2 p-3 bg-slate-50 border border-slate-200 rounded-xl">
              {activeDef.variables.map((varTag) => (
                <button
                  key={varTag}
                  type="button"
                  onClick={() => handleInsertVariable(varTag)}
                  disabled={!canEdit}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-slate-300 hover:border-[#4F8FE0] hover:bg-blue-50 text-[#4F8FE0] text-xs font-mono font-bold transition shadow-2xs cursor-pointer disabled:opacity-50"
                  title="Metin imlecinin bulunduğu yere ekler"
                >
                  <span>{varTag}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Body Textarea */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Mesaj Metni <span className="text-rose-500">*</span>
            </label>
            <textarea
              ref={textareaRef}
              rows="8"
              required
              disabled={!canEdit}
              value={currentBodyText}
              onChange={(e) => {
                setCurrentBodyText(e.target.value);
                setIsDirty(true);
              }}
              placeholder="E-posta içeriği..."
              className="w-full px-3.5 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono leading-relaxed text-[#1E2534] focus:outline-hidden focus:border-[#4F8FE0] disabled:opacity-60 min-h-[160px]"
            />
          </div>

          {/* Action Row */}
          {canEdit && (
            <div className="pt-3 flex items-center justify-between border-t border-slate-100">
              <div className="text-xs text-slate-400">
                {isDirty ? (
                  <span className="text-amber-600 font-bold flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" /> Kaydedilmemiş değişiklikler var
                  </span>
                ) : (
                  <span className="text-emerald-600 font-medium flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Tüm değişiklikler güncel
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2.5">
                {isDirty && (
                  <button
                    type="button"
                    onClick={() => {
                      if (templates[activeType]) {
                        setCurrentSubject(templates[activeType].subject || '');
                        setCurrentBodyText(templates[activeType].bodyText || '');
                        setIsDirty(false);
                      }
                    }}
                    className="px-4 py-2.5 text-xs font-semibold text-slate-500 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                  >
                    Vazgeç
                  </button>
                )}

                <button
                  type="submit"
                  disabled={saveLoading || !isDirty}
                  className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#4F8FE0] hover:bg-[#3D75C4] text-white font-bold text-xs rounded-xl shadow-md hover:shadow-lg transition cursor-pointer disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  {saveLoading ? 'Kaydediliyor...' : 'Değişiklikleri Kaydet'}
                </button>
              </div>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
