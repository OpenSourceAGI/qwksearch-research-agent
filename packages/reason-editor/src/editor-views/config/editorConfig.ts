/**
 * The editor's single JSON configuration object and the helpers that read it.
 *
 * `EditorConfig` is a plain, serializable shape (language, theme, accent color,
 * and a map of plugin → { enabled, settings }). The entire editor UI is driven
 * from it: which Tiptap extensions get registered, which language/theme is
 * active, and what per-plugin settings the Settings modal shows. It persists to
 * localStorage so a user's toggles survive reloads, and `buildExtensions()`
 * turns it back into the concrete extension array the editor mounts.
 */

import type { ThemeColorType } from '@/theme/theme';
import type { ExternalLibsMode } from '@/store/externalLibsMode';

import {
  PLUGIN_BY_KEY,
  PLUGIN_REGISTRY,
  resolvePluginSettings,
} from './pluginRegistry';
import { buildBaseKit } from './baseKit';

export interface PluginConfigEntry {
  enabled: boolean;
  /** overrides for the plugin's settings-schema defaults (only what changed) */
  settings?: Record<string, any>;
}

export interface EditorConfig {
  /** active UI language code (matches the locale bundle keys) */
  language: string;
  /** light / dark appearance */
  theme: 'light' | 'dark';
  /** accent color preset */
  accentColor: ThemeColorType;
  /**
   * How heavy third-party libraries (KaTeX, Mermaid) are loaded: 'cdn' fetches
   * them from a public CDN on first use, 'bundled' imports them from this
   * package's own dependencies so the editor works offline. Does not affect
   * Draw.io, which is always a remote embed. See `@/store/externalLibsMode`.
   */
  externalLibsMode: ExternalLibsMode;
  /** per-plugin enable flags and settings, keyed by plugin key */
  plugins: Record<string, PluginConfigEntry>;
}

export const CONFIG_STORAGE_KEY = 'reason-editor-config';

/** Build the out-of-the-box config straight from the plugin registry. */
export function createDefaultConfig(): EditorConfig {
  const plugins: Record<string, PluginConfigEntry> = {};
  for (const def of PLUGIN_REGISTRY) {
    plugins[def.key] = { enabled: def.defaultEnabled };
  }
  return {
    language: 'en',
    theme: 'light',
    accentColor: 'default',
    externalLibsMode: 'cdn',
    plugins,
  };
}

/**
 * Merge a (possibly stale) saved config against the current registry so that
 * newly-added plugins appear and removed ones drop out, without losing the
 * user's existing toggles and settings overrides.
 */
export function normalizeConfig(saved: Partial<EditorConfig> | null | undefined): EditorConfig {
  const base = createDefaultConfig();
  if (!saved) return base;

  const plugins: Record<string, PluginConfigEntry> = {};
  for (const def of PLUGIN_REGISTRY) {
    const prev = saved.plugins?.[def.key];
    plugins[def.key] = {
      enabled: typeof prev?.enabled === 'boolean' ? prev.enabled : def.defaultEnabled,
      settings: prev?.settings ? { ...prev.settings } : undefined,
    };
  }

  return {
    language: saved.language ?? base.language,
    theme: saved.theme === 'dark' ? 'dark' : 'light',
    accentColor: (saved.accentColor as ThemeColorType) ?? base.accentColor,
    externalLibsMode: saved.externalLibsMode === 'bundled' ? 'bundled' : base.externalLibsMode,
    plugins,
  };
}

export function loadConfig(): EditorConfig {
  try {
    const raw = localStorage.getItem(CONFIG_STORAGE_KEY);
    if (!raw) return createDefaultConfig();
    return normalizeConfig(JSON.parse(raw));
  } catch {
    return createDefaultConfig();
  }
}

export function saveConfig(config: EditorConfig): void {
  try {
    localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(config));
  } catch {
    /* ignore quota / private-mode errors */
  }
}

/**
 * A stable signature of the parts of the config that require the editor to be
 * rebuilt (which plugins are enabled and their settings). Language, theme and
 * accent are applied without recreating the editor, so they are excluded.
 */
export function extensionsSignature(config: EditorConfig): string {
  const parts: string[] = [];
  for (const def of PLUGIN_REGISTRY) {
    const entry = config.plugins[def.key];
    if (!entry?.enabled) continue;
    parts.push(`${def.key}:${JSON.stringify(entry.settings ?? {})}`);
  }
  return parts.join('|');
}

/** Turn the config JSON into the concrete Tiptap extension array to mount. */
export function buildExtensions(config: EditorConfig): any[] {
  const extensions: any[] = [...buildBaseKit()];

  for (const def of PLUGIN_REGISTRY) {
    const entry = config.plugins[def.key];
    if (!entry?.enabled) continue;
    const settings = resolvePluginSettings(def, entry.settings);
    const built = def.create(settings);
    if (Array.isArray(built)) extensions.push(...built);
    else extensions.push(built);
  }

  return extensions;
}

// Re-export registry pieces so callers can import everything from one module.
export {
  PLUGIN_REGISTRY,
  PLUGIN_BY_KEY,
  resolvePluginSettings,
} from './pluginRegistry';
export type { PluginDefinition, SettingField, SettingFieldType } from './pluginRegistry';
