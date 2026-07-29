/**
 * @fileoverview App-specific settings schema, declared as data.
 *
 * These JSON files are the single source of truth for *which* settings the app
 * exposes and how each one should be described and edited. The consuming app
 * "requests" this information at build/runtime and hands it to a renderer (see
 * the `shadcn-settings` package) that turns each declaration into a control.
 *
 * Keeping the schema here — separate from both the server config manager that
 * reads/writes the values and the components that render them — means the list
 * of settings can change without touching rendering or persistence code.
 */
import sectionsJson from "./sections.json";
import searchJson from "./search.json";

/** The kind of control a setting is edited with. */
export type SettingsFieldType =
  | "string"
  | "password"
  | "textarea"
  | "select"
  | "switch"
  | "theme";

/** Where a setting's value lives: browser `localStorage` or the server config. */
export type SettingsFieldScope = "client" | "server";

export interface SettingsFieldOption {
  name: string;
  value: string;
}

export interface SettingsFieldLink {
  name: string;
  url: string;
}

/**
 * A single declarative setting. This is intentionally structurally compatible
 * with `shadcn-settings`' field type so the schema can be passed straight to
 * the renderer, and with the app's own `UIConfigField` union.
 */
export interface SettingsFieldSchema {
  name: string;
  key: string;
  type: SettingsFieldType;
  required: boolean;
  description: string;
  scope: SettingsFieldScope;
  default?: string | boolean;
  placeholder?: string;
  env?: string;
  options?: SettingsFieldOption[];
  links?: SettingsFieldLink[];
}

/** Metadata describing one entry in the settings sidebar/menu. */
export interface SettingsSectionSchema {
  /** Stable id used for routing and the active-tab state. */
  key: string;
  /** Human-readable label shown in the menu and header. */
  name: string;
  /** One-line summary shown under the header. */
  description: string;
  /** lucide-react icon name; the app maps this to a component. */
  icon: string;
  /** Config namespace this section reads/writes (`config.values[dataAdd]`). */
  dataAdd: string;
}

/** Ordered list of settings sections (menu items). */
export const settingsSections: SettingsSectionSchema[] =
  sectionsJson as unknown as SettingsSectionSchema[];

/** Field declarations for the "Search Settings" section. */
export const searchSettingsFields: SettingsFieldSchema[] =
  searchJson as unknown as SettingsFieldSchema[];

/** Every field group keyed by the section `dataAdd` it belongs to. */
export const settingsFieldsBySection: Record<string, SettingsFieldSchema[]> = {
  search: searchSettingsFields,
};

/**
 * Return the full app settings schema. Named like a request because the app
 * asks this module for "the setting info" rather than declaring it inline.
 */
export function getSettingsSchema(): {
  sections: SettingsSectionSchema[];
  fieldsBySection: Record<string, SettingsFieldSchema[]>;
} {
  return {
    sections: settingsSections,
    fieldsBySection: settingsFieldsBySection,
  };
}
