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
import {
  followUpSuggestionsPrompt,
  webSearchRetrieverPrompt,
} from "chat-agent-toolkit/prompts/search-prompts";
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
  /** Visible row count for `textarea` fields. Defaults to 4. */
  rows?: number;
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

/**
 * Prompt-editing fields ship with an empty `default` in `search.json` so the
 * prompt text itself has exactly one home: the toolkit's prompt module. The
 * live template is spliced in here, which means the settings textarea shows
 * the real prompt the agent runs, pre-filled and ready to edit. Clearing the
 * box stores an empty string, and every consumer treats blank as "use the
 * built-in template" — so the prompts stay in sync as the toolkit evolves.
 */
const PROMPT_FIELD_DEFAULTS: Record<string, string> = {
  followUpQuestionsPrompt: followUpSuggestionsPrompt,
  queryExpansionPrompt: webSearchRetrieverPrompt,
};

/** Field declarations for the "Search Settings" section. */
export const searchSettingsFields: SettingsFieldSchema[] = (
  searchJson as unknown as SettingsFieldSchema[]
).map((field) =>
  field.key in PROMPT_FIELD_DEFAULTS
    ? { ...field, default: PROMPT_FIELD_DEFAULTS[field.key] }
    : field,
);

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

/**
 * One settings section as a standalone page a host can mount in its own
 * settings area — the "external page" form of {@link SettingsSectionSchema}.
 */
export interface SettingsPageSchema extends SettingsSectionSchema {
  /** Route the host serves this section at, e.g. `/settings/research/models`. */
  href: string;
}

/**
 * The settings sections as pages under `basePath`, in menu order. A host that
 * embeds the research agent registers these alongside its own settings pages
 * (`basePath` is where it mounts the research settings), so every section the
 * agent exposes is reachable from the host's global settings.
 */
export function getSettingsPages(basePath = "/settings"): SettingsPageSchema[] {
  const base = basePath.replace(/\/+$/, "");
  return settingsSections.map((section) => ({
    ...section,
    href: `${base}/${section.key}`,
  }));
}
