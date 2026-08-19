import React, { useState, useEffect } from 'react';
import { Palette, Check, Sun, Moon, Leaf, Sparkles } from 'lucide-react';

const THEMES = [
  {
    id: 'default',
    label: 'Varsayılan',
    description: 'Koyu lacivert sidebar, krem arka plan, mavi vurgu rengi.',
    icon: Sun,
    preview: {
      sidebar: '#1E2534',
      accent: '#4F8FE0',
      pageBg: '#F5F4EF',
      cardBg: '#ffffff',
      text: '#1E2534',
    },
  },
  {
    id: 'dark',
    label: 'Koyu Mod',
    description: 'Derin lacivert tonları, katmanlı yüzeyler, göz dostu gece modu.',
    icon: Moon,
    isDark: true,
    preview: {
      sidebar: '#0D1526',
      accent: '#4C82F7',
      pageBg: '#0B1220',
      cardBg: '#131C2E',
      text: '#E8ECF3',
    },
  },
  {
    id: 'green',
    label: 'Yeşil',
    description: 'Doğal yeşil vurgu, kurumsal ve sakin bir görünüm.',
    icon: Leaf,
    preview: {
      sidebar: '#14332a',
      accent: '#059669',
      pageBg: '#f0faf6',
      cardBg: '#ffffff',
      text: '#14332a',
    },
  },
  {
    id: 'purple',
    label: 'Mor',
    description: 'Mor vurgu rengi ile modern ve canlı bir arayüz.',
    icon: Sparkles,
    preview: {
      sidebar: '#1e1533',
      accent: '#7c3aed',
      pageBg: '#f5f0ff',
      cardBg: '#ffffff',
      text: '#1e1533',
    },
  },
];

function applyTheme(themeId) {
  const root = document.documentElement;
  // Remove all existing theme classes
  root.className = root.className.replace(/theme-\S+/g, '').trim();
  // Add new theme class (skip for default since :root handles it)
  if (themeId !== 'default') {
    root.classList.add(`theme-${themeId}`);
  }
  // Persist to localStorage
  localStorage.setItem('ditas-theme', themeId);
}

function ThemePreviewCard({ theme, isActive, onClick }) {
  const Icon = theme.icon;
  const p = theme.preview;
  const isDark = theme.isDark || false;

  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative group text-left rounded-2xl border-2 p-0 overflow-hidden transition-all cursor-pointer ${
        isActive
          ? 'border-[var(--theme-accent)] ring-4 ring-[var(--theme-accent)]/15 shadow-lg'
          : 'border-slate-200 hover:border-slate-300 shadow-xs hover:shadow-md'
      }`}
    >
      {/* Active Check Badge */}
      {isActive && (
        <div
          className="absolute top-3 right-3 w-7 h-7 rounded-full flex items-center justify-center z-10 shadow-md"
          style={{ backgroundColor: p.accent }}
        >
          <Check className="w-4 h-4 text-white" strokeWidth={3} />
        </div>
      )}

      {/* Mini Preview */}
      <div className="flex h-[120px] overflow-hidden">
        {/* Mini Sidebar */}
        <div
          className="w-[60px] shrink-0 flex flex-col items-center py-3 gap-2"
          style={{ backgroundColor: p.sidebar }}
        >
          <div
            className="w-5 h-5 rounded-md"
            style={{ backgroundColor: 'rgba(255,255,255,0.15)' }}
          ></div>
          <div className="space-y-1.5 flex flex-col items-center mt-1">
            <div
              className="w-8 h-1.5 rounded-full"
              style={{ backgroundColor: p.accent }}
            ></div>
            <div
              className="w-7 h-1.5 rounded-full"
              style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}
            ></div>
            <div
              className="w-7 h-1.5 rounded-full"
              style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}
            ></div>
            <div
              className="w-7 h-1.5 rounded-full"
              style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}
            ></div>
          </div>
        </div>

        {/* Mini Content Area */}
        <div className="flex-1 flex flex-col" style={{ backgroundColor: p.pageBg }}>
          {/* Mini Header */}
          <div
            className="h-6 shrink-0 border-b flex items-center px-2"
            style={{
              backgroundColor: p.cardBg,
              borderColor: isDark ? '#334155' : '#e2e8f0',
            }}
          >
            <div
              className="w-10 h-1.5 rounded-full"
              style={{
                backgroundColor: isDark ? '#3a3a45' : '#cbd5e1',
              }}
            ></div>
          </div>

          {/* Mini Cards */}
          <div className="p-2 flex gap-1.5 flex-1">
            <div
              className="flex-1 rounded-md p-1.5"
              style={{
                backgroundColor: p.cardBg,
                border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
              }}
            >
              <div
                className="w-full h-1 rounded-full mb-1"
                style={{ backgroundColor: p.accent, opacity: 0.7 }}
              ></div>
              <div
                className="w-3/4 h-1 rounded-full"
                style={{
                  backgroundColor: isDark ? '#3a3a45' : '#cbd5e1',
                }}
              ></div>
            </div>
            <div
              className="flex-1 rounded-md p-1.5"
              style={{
                backgroundColor: p.cardBg,
                border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
              }}
            >
              <div
                className="w-full h-1 rounded-full mb-1"
                style={{ backgroundColor: p.accent, opacity: 0.7 }}
              ></div>
              <div
                className="w-2/3 h-1 rounded-full"
                style={{
                  backgroundColor: isDark ? '#3a3a45' : '#cbd5e1',
                }}
              ></div>
            </div>
          </div>
        </div>
      </div>

      {/* Theme Info */}
      <div
        className="p-4 border-t"
        style={{
          backgroundColor: p.cardBg,
          borderColor: isDark ? '#334155' : '#e2e8f0',
        }}
      >
        <div className="flex items-center gap-2.5 mb-1.5">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: `${p.accent}18`, color: p.accent }}
          >
            <Icon className="w-3.5 h-3.5" />
          </div>
          <span
            className="text-sm font-bold font-heading"
            style={{ color: p.text }}
          >
            {theme.label}
          </span>
        </div>
        <p className="text-[11px] leading-relaxed" style={{ color: isDark ? '#94a3b8' : '#64748b' }}>
          {theme.description}
        </p>

        {/* Color Swatches */}
        <div className="flex items-center gap-1.5 mt-3">
          <div
            className="w-5 h-5 rounded-full border-2 border-white shadow-xs"
            style={{ backgroundColor: p.sidebar }}
            title="Sidebar"
          ></div>
          <div
            className="w-5 h-5 rounded-full border-2 border-white shadow-xs"
            style={{ backgroundColor: p.accent }}
            title="Vurgu"
          ></div>
          <div
            className="w-5 h-5 rounded-full border-2 shadow-xs"
            style={{
              backgroundColor: p.pageBg,
              borderColor: isDark ? '#2a2a35' : '#cbd5e1',
            }}
            title="Arka Plan"
          ></div>
          <div
            className="w-5 h-5 rounded-full border-2 shadow-xs"
            style={{
              backgroundColor: p.cardBg,
              borderColor: isDark ? '#2a2a35' : '#cbd5e1',
            }}
            title="Kart"
          ></div>
        </div>
      </div>
    </button>
  );
}

export default function ThemeSettingsTab() {
  const [activeTheme, setActiveTheme] = useState(() => {
    return localStorage.getItem('ditas-theme') || 'default';
  });

  const handleSelectTheme = (themeId) => {
    setActiveTheme(themeId);
    applyTheme(themeId);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <h2 className="text-xl font-bold font-heading text-[#1E2534] flex items-center gap-2" style={{ color: 'var(--theme-text-primary)' }}>
          <Palette className="w-5 h-5" style={{ color: 'var(--theme-accent)' }} />
          Tema Ayarları
        </h2>
        <p className="text-xs mt-1" style={{ color: 'var(--theme-text-secondary)' }}>
          Arayüz temasını seçin. Değişiklikler anında uygulanır ve tarayıcınıza kaydedilir.
        </p>
      </div>

      {/* Theme Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        {THEMES.map((theme) => (
          <ThemePreviewCard
            key={theme.id}
            theme={theme}
            isActive={activeTheme === theme.id}
            onClick={() => handleSelectTheme(theme.id)}
          />
        ))}
      </div>

      {/* Info Note */}
      <div
        className="p-4 rounded-2xl border text-xs leading-relaxed"
        style={{
          backgroundColor: 'var(--theme-card-bg)',
          borderColor: 'var(--theme-card-border)',
          color: 'var(--theme-text-secondary)',
        }}
      >
        <strong style={{ color: 'var(--theme-text-primary)' }}>💡 Bilgi:</strong>{' '}
        Tema tercihiniz bu tarayıcıya özeldir ve yerel olarak saklanır.
        Farklı cihaz veya tarayıcılardan giriş yaptığınızda varsayılan tema kullanılır.
        Tema değişikliği sidebar, üst çubuk ve arka plan renklerini etkiler.
      </div>
    </div>
  );
}
