import React from 'react';
import { useLocation, useNavigate, Routes, Route, Navigate } from 'react-router-dom';
import {
  FolderTree,
  Building2,
  Palette,
  Building,
  Mail,
  Database,
  Sliders,
  FileText,
  Shield,
  Layers,
} from 'lucide-react';
import CategorySettingsTab from '../components/CategorySettingsTab';
import UnitSettingsTab from '../components/UnitSettingsTab';
import ThemeSettingsTab from '../components/ThemeSettingsTab';
import CompanySettingsTab from '../components/CompanySettingsTab';
import EmailTemplatesSettingsTab from '../components/EmailTemplatesSettingsTab';
import BackupSettingsTab from '../components/BackupSettingsTab';
import ThresholdsSettingsTab from '../components/ThresholdsSettingsTab';
import LogsSettingsTab from '../components/LogsSettingsTab';

export const SETTINGS_TABS = [
  {
    id: 'categories',
    label: 'Kategori Yönetimi',
    path: '/settings/categories',
    icon: FolderTree,
    description: 'Varlık, aksesuar, sarf ve bileşen kategorilerini düzenleyin.',
  },
  {
    id: 'units',
    label: 'Birim Yönetimi',
    path: '/settings/units',
    icon: Building2,
    description: 'Şirket departman ve birim tanımlamalarını yönetin.',
  },
  {
    id: 'theme',
    label: 'Tema',
    path: '/settings/theme',
    icon: Palette,
    description: 'Arayüz tema, renk ve görsel tercihleri yapılandırın.',
  },
  {
    id: 'company',
    label: 'Şirket Bilgileri',
    path: '/settings/company',
    icon: Building,
    description: 'Şirket unvanı, logo, iletişim ve kurumsal bilgiler.',
  },
  {
    id: 'email-templates',
    label: 'E-posta Şablonları',
    path: '/settings/email-templates',
    icon: Mail,
    description: 'Otomatik bilgilendirme ve zimmet e-posta şablonları.',
  },
  {
    id: 'backup',
    label: 'Yedekleme',
    path: '/settings/backup',
    icon: Database,
    description: 'Veritabanı ve dosya yedekleme / geri yükleme işlemleri.',
  },
  {
    id: 'thresholds',
    label: 'Bildirim Eşikleri',
    path: '/settings/thresholds',
    icon: Sliders,
    description: 'Kritik stok seviyeleri ve lisans uyarı gün limitleri.',
  },
  {
    id: 'logs',
    label: 'Sistem Logları',
    path: '/settings/logs',
    icon: FileText,
    description: 'Kullanıcı aktiviteleri, hata logları ve sistem olay kayıtları.',
  },
];

function TabPlaceholder({ tab }) {
  const Icon = tab.icon;
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-8 sm:p-12 text-center shadow-xs flex flex-col items-center justify-center min-h-[420px]">
      <div className="w-16 h-16 rounded-2xl bg-[#4C82F7]/10 text-[#4C82F7] flex items-center justify-center mb-4 shadow-2xs">
        <Icon className="w-8 h-8" />
      </div>
      <h3 className="text-lg font-bold font-heading text-[#1E2534] mb-2">
        {tab.label}
      </h3>
      <p className="text-xs text-slate-500 max-w-md mb-6 leading-relaxed">
        {tab.description}
      </p>
      <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 border border-slate-200 text-xs font-semibold text-slate-600">
        <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
        Geliştirme Aşamasında • Çok Yakında
      </div>
    </div>
  );
}

export default function SettingsLayout() {
  const location = useLocation();
  const navigate = useNavigate();

  // Find active tab from current route path
  const currentTab =
    SETTINGS_TABS.find((t) => location.pathname === t.path) || SETTINGS_TABS[0];

  return (
    <div className="space-y-6 pb-12">
      {/* Page Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">
            Envanter Takip Sistemi • Yönetici Paneli
          </span>
          <h1 className="text-2xl font-bold font-heading text-[#1E2534]">
            Sistem Ayarları
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Sistem parametreleri, birimler, bildirim kuralları ve kurumsal yapılandırma.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <div className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-100 border border-slate-200 text-xs font-bold text-slate-700">
            <Layers className="w-4 h-4 text-[#4C82F7]" />
            <span>8 Yapılandırma Modülü</span>
          </div>
        </div>
      </div>

      {/* Main Settings Grid: Left Vertical Sidebar + Right Content View */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Vertical Navigation Menu */}
        <div className="lg:col-span-4 xl:col-span-3 bg-white rounded-2xl border border-slate-200 p-3 shadow-xs space-y-1">
          <div className="px-3 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            Ayar Menüsü
          </div>
          {SETTINGS_TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = location.pathname === tab.path;

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => navigate(tab.path)}
                className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-xs font-semibold transition-all cursor-pointer text-left ${
                  isActive
                    ? 'bg-[#4C82F7] text-white font-bold shadow-md shadow-[#4C82F7]/20'
                    : 'text-[#1E2534] hover:bg-slate-50 hover:text-[#4C82F7]'
                }`}
              >
                <Icon
                  className={`w-4 h-4 shrink-0 transition-transform ${
                    isActive ? 'text-white scale-110' : 'text-slate-400'
                  }`}
                />
                <span className="truncate">{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Right Tab Content View */}
        <div className="lg:col-span-8 xl:col-span-9">
          <Routes>
            <Route path="categories" element={<CategorySettingsTab />} />
            <Route path="units" element={<UnitSettingsTab />} />
            <Route path="theme" element={<ThemeSettingsTab />} />
            <Route path="company" element={<CompanySettingsTab />} />
            <Route path="email-templates" element={<EmailTemplatesSettingsTab />} />
            <Route path="backup" element={<BackupSettingsTab />} />
            <Route path="thresholds" element={<ThresholdsSettingsTab />} />
            <Route path="logs" element={<LogsSettingsTab />} />
            {SETTINGS_TABS.filter((t) => !['categories', 'units', 'theme', 'company', 'email-templates', 'backup', 'thresholds', 'logs'].includes(t.id)).map((tab) => (
              <Route
                key={tab.id}
                path={tab.id}
                element={<TabPlaceholder tab={tab} />}
              />
            ))}
            {/* Fallback default to categories */}
            <Route
              path="*"
              element={<Navigate to="/settings/categories" replace />}
            />
          </Routes>
        </div>
      </div>
    </div>
  );
}
