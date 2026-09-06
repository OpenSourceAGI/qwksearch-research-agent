/**
 * The editor Settings modal. Everything the JSON `EditorConfig` controls is
 * edited here: appearance (theme + accent), the UI language (a shadcn Select),
 * and — the heart of the feature — the plugin manager. Enabled plugins show as
 * removable badge "pills"; a search box surfaces the rest for discovery and
 * one-click enabling. Any enabled plugin that declares a settings schema renders
 * a generated settings form, so turning a plugin on immediately exposes its
 * options. Changes are pushed up through `onConfigChange` as a new immutable
 * config object.
 */

import { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Check,
  CloudDownload,
  HardDrive,
  Keyboard,
  Plus,
  Puzzle,
  RotateCcw,
  Search,
  Settings2,
  Sliders,
  X,
} from 'lucide-react';

import { KeyboardShortcutsSection } from '@/features/settings/sections/KeyboardShortcutsSection';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { localeActions } from '@/locales';
import { themeActions, type ThemeColorType } from '@/theme/theme';

import {
  PLUGIN_REGISTRY,
  createDefaultConfig,
  resolvePluginSettings,
  type EditorConfig,
  type PluginDefinition,
  type SettingField,
} from './editorConfig';

interface SettingsModalProps {
  config: EditorConfig;
  onConfigChange: (next: EditorConfig) => void;
  onClose: () => void;
  theme: string;
  setTheme: (theme: string) => void;
}

const LANGUAGES: { code: string; flag: string; label: string }[] = [
  { code: 'en', flag: '🇺🇸', label: 'English' },
  { code: 'es', flag: '🇪🇸', label: 'Español' },
  { code: 'de', flag: '🇩🇪', label: 'Deutsch' },
  { code: 'fr', flag: '🇫🇷', label: 'Français' },
  { code: 'it', flag: '🇮🇹', label: 'Italiano' },
  { code: 'nl', flag: '🇳🇱', label: 'Nederlands' },
  { code: 'pt_BR', flag: '🇧🇷', label: 'Português' },
  { code: 'ru', flag: '🇷🇺', label: 'Русский' },
  { code: 'tr', flag: '🇹🇷', label: 'Türkçe' },
  { code: 'zh_CN', flag: '🇨🇳', label: '中文' },
  { code: 'ja', flag: '🇯🇵', label: '日本語' },
  { code: 'ko', flag: '🇰🇷', label: '한국어' },
  { code: 'ar', flag: '🇸🇦', label: 'العربية' },
  { code: 'fa', flag: '🇮🇷', label: 'فارسی' },
  { code: 'hi', flag: '🇮🇳', label: 'हिन्दी' },
  { code: 'hu_HU', flag: '🇭🇺', label: 'Magyar' },
  { code: 'vi', flag: '🇻🇳', label: 'Tiếng Việt' },
  { code: 'fi', flag: '🇫🇮', label: 'Suomi' },
];

const ACCENTS: ThemeColorType[] = [
  'default',
  'red',
  'blue',
  'green',
  'orange',
  'rose',
  'violet',
  'yellow',
];

// ─── Generated field for a single plugin setting ──────────────────────────────

function PluginSettingInput({
  field,
  value,
  onChange,
}: {
  field: SettingField;
  value: any;
  onChange: (value: any) => void;
}) {
  if (field.type === 'boolean') {
    return (
      <button
        type="button"
        role="switch"
        aria-checked={!!value}
        onClick={() => onChange(!value)}
        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors shrink-0 ${
          value ? 'bg-blue-500' : 'bg-gray-300 dark:bg-slate-600'
        }`}
      >
        <span
          className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition ${
            value ? 'translate-x-4' : 'translate-x-1'
          }`}
        />
      </button>
    );
  }

  if (field.type === 'color') {
    return (
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value || '#000000'}
          onChange={(e) => onChange(e.target.value)}
          className="h-7 w-9 cursor-pointer rounded border border-gray-200 dark:border-slate-700 bg-transparent p-0.5"
        />
        <input
          type="text"
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value)}
          className="w-24 px-2 py-1 text-xs border rounded bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 font-mono"
        />
      </div>
    );
  }

  return (
    <input
      type={field.type === 'number' ? 'number' : 'text'}
      value={value ?? ''}
      placeholder={field.placeholder}
      onChange={(e) =>
        onChange(field.type === 'number' ? Number(e.target.value) : e.target.value)
      }
      className="w-40 px-2 py-1 text-xs border rounded bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700"
    />
  );
}

function PluginSettingsCard({
  def,
  values,
  onChange,
}: {
  def: PluginDefinition;
  values: Record<string, any>;
  onChange: (fieldKey: string, value: any) => void;
}) {
  return (
    <div className="rounded-lg border border-gray-200 dark:border-slate-700 p-3">
      <div className="flex items-center gap-2 mb-2">
        <Sliders size={13} className="text-blue-500" />
        <span className="text-xs font-semibold text-gray-800 dark:text-gray-100">
          {def.label}
        </span>
      </div>
      <div className="space-y-2">
        {def.settings!.map((field) => (
          <div key={field.key} className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="text-xs text-gray-700 dark:text-gray-300">{field.label}</div>
              {field.help && (
                <div className="text-[10px] text-gray-400 mt-0.5">{field.help}</div>
              )}
            </div>
            <PluginSettingInput
              field={field}
              value={values[field.key]}
              onChange={(v) => onChange(field.key, v)}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main modal ───────────────────────────────────────────────────────────────

export function SettingsModal({
  config,
  onConfigChange,
  onClose,
  theme,
  setTheme,
}: SettingsModalProps) {
  const [query, setQuery] = useState('');

  const enabledPlugins = useMemo(
    () => PLUGIN_REGISTRY.filter((p) => config.plugins[p.key]?.enabled),
    [config]
  );

  const discoverablePlugins = useMemo(() => {
    const q = query.trim().toLowerCase();
    return PLUGIN_REGISTRY.filter((p) => !config.plugins[p.key]?.enabled).filter(
      (p) =>
        !q ||
        p.label.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q)
    );
  }, [config, query]);

  const pluginsWithSettings = useMemo(
    () => enabledPlugins.filter((p) => p.settings && p.settings.length > 0),
    [enabledPlugins]
  );

  // ── Config mutators ──
  const setPluginEnabled = (key: string, enabled: boolean) => {
    onConfigChange({
      ...config,
      plugins: {
        ...config.plugins,
        [key]: { ...config.plugins[key], enabled },
      },
    });
  };

  const setPluginSetting = (key: string, fieldKey: string, value: any) => {
    const entry = config.plugins[key] ?? { enabled: true };
    onConfigChange({
      ...config,
      plugins: {
        ...config.plugins,
        [key]: {
          ...entry,
          settings: { ...(entry.settings ?? {}), [fieldKey]: value },
        },
      },
    });
  };

  const setLanguage = (code: string) => {
    localeActions.setLang(code);
    onConfigChange({ ...config, language: code });
  };

  const setAccent = (color: ThemeColorType) => {
    themeActions.setColor(color);
    onConfigChange({ ...config, accentColor: color });
  };

  const setThemeMode = (mode: 'light' | 'dark') => {
    setTheme(mode);
    onConfigChange({ ...config, theme: mode });
  };

  const setExternalLibsMode = (mode: EditorConfig['externalLibsMode']) => {
    onConfigChange({ ...config, externalLibsMode: mode });
  };

  const resetDefaults = () => {
    if (!confirm('Reset all editor settings and plugins to defaults?')) return;
    const fresh = createDefaultConfig();
    localeActions.setLang(fresh.language);
    themeActions.setColor(fresh.accentColor);
    setTheme(fresh.theme);
    onConfigChange(fresh);
  };

  const currentLang = LANGUAGES.find((l) => l.code === config.language);

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div
        className={`relative ${theme === 'dark' ? 'dark' : ''} bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl shadow-2xl w-[720px] max-w-[92vw] max-h-[88vh] flex flex-col text-gray-900 dark:text-gray-100`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100 dark:border-slate-700">
          <div className="flex items-center gap-2">
            <Settings2 size={16} className="text-blue-500" />
            <span className="text-sm font-semibold">Editor Settings</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-gray-100 dark:hover:bg-slate-800"
          >
            <X size={15} />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 p-5 space-y-6">
          {/* Appearance */}
          <section className="space-y-3">
            <h3 className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">
              Appearance
            </h3>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-700 dark:text-gray-300">Theme</span>
              <div className="flex gap-1">
                <button
                  onClick={() => setThemeMode('light')}
                  className={`px-3 py-1 text-xs border rounded ${
                    theme === 'light'
                      ? 'bg-blue-500 text-white border-blue-600'
                      : 'hover:bg-gray-100 dark:hover:bg-slate-800 border-gray-200 dark:border-slate-700'
                  }`}
                >
                  ☀️ Light
                </button>
                <button
                  onClick={() => setThemeMode('dark')}
                  className={`px-3 py-1 text-xs border rounded ${
                    theme === 'dark'
                      ? 'bg-blue-500 text-white border-blue-600'
                      : 'hover:bg-gray-100 dark:hover:bg-slate-800 border-gray-200 dark:border-slate-700'
                  }`}
                >
                  🌙 Dark
                </button>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-700 dark:text-gray-300">Accent color</span>
              <div className="grid grid-cols-4 gap-1">
                {ACCENTS.map((color) => (
                  <button
                    key={color}
                    onClick={() => setAccent(color)}
                    className={`px-2 py-1 text-[10px] border rounded capitalize ${
                      config.accentColor === color
                        ? 'bg-blue-500/20 border-blue-500'
                        : 'hover:bg-gray-100 dark:hover:bg-slate-800 border-gray-200 dark:border-slate-700'
                    }`}
                  >
                    {color}
                  </button>
                ))}
              </div>
            </div>
          </section>

          {/* Language — shadcn Select */}
          <section className="space-y-3">
            <h3 className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">
              Language
            </h3>
            <div className="flex items-center justify-between gap-4">
              <span className="text-sm text-gray-700 dark:text-gray-300">Editor language</span>
              <Select value={config.language} onValueChange={setLanguage}>
                <SelectTrigger className="w-56">
                  <SelectValue placeholder="Select a language">
                    {currentLang ? `${currentLang.flag}  ${currentLang.label}` : config.language}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {LANGUAGES.map((lang) => (
                    <SelectItem key={lang.code} value={lang.code}>
                      {lang.flag}&nbsp;&nbsp;{lang.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </section>

          {/* External libraries loading mode */}
          <section className="space-y-3">
            <h3 className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">
              Library Loading
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Controls how KaTeX and Mermaid are loaded when a plugin needs them.
              Draw.io always opens diagrams.net in an embedded frame regardless of
              this setting.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                onClick={() => setExternalLibsMode('cdn')}
                className={`flex items-start gap-2 text-left rounded-lg border p-3 transition-colors ${
                  config.externalLibsMode !== 'bundled'
                    ? 'border-blue-500 bg-blue-500/10'
                    : 'border-gray-200 dark:border-slate-700 hover:border-blue-400'
                }`}
              >
                <CloudDownload size={15} className="mt-0.5 text-blue-500 shrink-0" />
                <span className="min-w-0">
                  <span className="block text-xs font-medium text-gray-800 dark:text-gray-100">
                    Lazy-load from CDN
                  </span>
                  <span className="block text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                    Smallest bundle. Fetches libraries on first use — requires
                    network access to the CDN.
                  </span>
                </span>
              </button>
              <button
                onClick={() => setExternalLibsMode('bundled')}
                className={`flex items-start gap-2 text-left rounded-lg border p-3 transition-colors ${
                  config.externalLibsMode === 'bundled'
                    ? 'border-blue-500 bg-blue-500/10'
                    : 'border-gray-200 dark:border-slate-700 hover:border-blue-400'
                }`}
              >
                <HardDrive size={15} className="mt-0.5 text-blue-500 shrink-0" />
                <span className="min-w-0">
                  <span className="block text-xs font-medium text-gray-800 dark:text-gray-100">
                    Bundled (offline)
                  </span>
                  <span className="block text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                    Ships the libraries with the app. Larger bundle, but works
                    fully offline or behind restrictive firewalls.
                  </span>
                </span>
              </button>
            </div>
          </section>

          {/* Keyboard shortcuts */}
          <section className="space-y-3">
            <div className="flex items-center gap-2">
              <Keyboard size={13} className="text-gray-400" />
              <h3 className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                Keyboard Shortcuts
              </h3>
            </div>
            <KeyboardShortcutsSection compact />
          </section>

          {/* Plugins */}
          <section className="space-y-3">
            <div className="flex items-center gap-2">
              <Puzzle size={13} className="text-gray-400" />
              <h3 className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                Plugins
              </h3>
              <span className="text-[10px] text-gray-400">
                {enabledPlugins.length} enabled
              </span>
            </div>

            {/* Pill box: enabled plugins + discovery search */}
            <div className="rounded-lg border border-gray-200 dark:border-slate-700 p-2 focus-within:border-blue-400">
              <div className="flex flex-wrap gap-1.5">
                {enabledPlugins.map((p) => (
                  <span
                    key={p.key}
                    className="inline-flex items-center gap-1 rounded-full bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-gray-200 text-xs font-medium pl-3 pr-1.5 py-1"
                  >
                    {p.label}
                    <button
                      type="button"
                      title={`Disable ${p.label}`}
                      onClick={() => setPluginEnabled(p.key, false)}
                      className="flex items-center justify-center rounded-full p-0.5 text-gray-400 hover:text-red-500 hover:bg-red-500/10"
                    >
                      <X size={11} />
                    </button>
                  </span>
                ))}
                {enabledPlugins.length === 0 && (
                  <span className="text-xs text-gray-400 px-1 py-1">No plugins enabled</span>
                )}
              </div>
              <div className="mt-2 flex items-center gap-2 border-t border-gray-100 dark:border-slate-700 pt-2">
                <Search size={13} className="text-gray-400 shrink-0" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search plugins to add…"
                  className="flex-1 bg-transparent text-xs outline-none placeholder-gray-400"
                />
              </div>
            </div>

            {/* Discovery list */}
            <div className="space-y-1">
              <div className="text-[11px] font-medium text-gray-500 dark:text-gray-400">
                {query.trim() ? 'Search results' : 'Discover more plugins'}
              </div>
              {discoverablePlugins.length === 0 ? (
                <div className="text-xs text-gray-400 py-3 text-center">
                  {query.trim() ? 'No matching plugins.' : 'All plugins are enabled.'}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                  {discoverablePlugins.map((p) => (
                    <button
                      key={p.key}
                      onClick={() => setPluginEnabled(p.key, true)}
                      className="flex items-start gap-2 text-left rounded-lg border border-gray-200 dark:border-slate-700 px-3 py-2 hover:border-blue-400 hover:bg-blue-50/50 dark:hover:bg-slate-800 transition-colors group"
                    >
                      <span className="mt-0.5 flex items-center justify-center rounded-full bg-gray-100 dark:bg-slate-800 group-hover:bg-blue-500 group-hover:text-white text-gray-500 h-5 w-5 shrink-0 transition-colors">
                        <Plus size={12} />
                      </span>
                      <span className="min-w-0">
                        <span className="flex items-center gap-1.5">
                          <span className="text-xs font-medium text-gray-800 dark:text-gray-100">
                            {p.label}
                          </span>
                          <span className="text-[9px] uppercase tracking-wide text-gray-400 border border-gray-200 dark:border-slate-700 rounded px-1">
                            {p.category}
                          </span>
                        </span>
                        <span className="block text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                          {p.description}
                        </span>
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </section>

          {/* Generated plugin settings */}
          {pluginsWithSettings.length > 0 && (
            <section className="space-y-3">
              <h3 className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                Plugin Settings
              </h3>
              <div className="space-y-2">
                {pluginsWithSettings.map((def) => (
                  <PluginSettingsCard
                    key={def.key}
                    def={def}
                    values={resolvePluginSettings(def, config.plugins[def.key]?.settings)}
                    onChange={(fieldKey, value) => setPluginSetting(def.key, fieldKey, value)}
                  />
                ))}
              </div>
            </section>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100 dark:border-slate-700">
          <button
            onClick={resetDefaults}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-gray-200 dark:border-slate-700 rounded hover:bg-gray-50 dark:hover:bg-slate-800"
          >
            <RotateCcw size={12} />
            Reset to defaults
          </button>
          <button
            onClick={onClose}
            className="flex items-center gap-1.5 px-4 py-1.5 text-xs bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            <Check size={13} />
            Done
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
