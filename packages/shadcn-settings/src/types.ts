import type { ComponentType, ReactNode } from "react";

/** The built-in control variants this package knows how to render. */
export type SettingsFieldType =
  | "string"
  | "password"
  | "textarea"
  | "select"
  | "switch";

/** An option in a `select` field. */
export interface SettingsFieldOption {
  name: string;
  value: string;
}

/** A labelled external link rendered under a field's description. */
export interface SettingsFieldLink {
  name: string;
  url: string;
}

/**
 * A declarative description of one setting. Schemas are plain data (usually
 * JSON) so the same field list can drive rendering, persistence and search.
 *
 * `type` is typed as `string` rather than the built-in union so a host app can
 * declare custom field types and supply matching renderers via
 * {@link SettingsFieldRenderers}; unknown types fall back to the
 * `unknown`-type renderer.
 */
export interface SettingsFieldSchema {
  /** Human-readable label. */
  name: string;
  /** Stable key used for persistence and as the React key. */
  key: string;
  /** Control variant, e.g. `"string"` | `"select"` | a custom type. */
  type: SettingsFieldType | (string & {});
  /** Short helper text shown under the label. */
  description?: string;
  /** Placeholder for text-like inputs. */
  placeholder?: string;
  /** Default value used when no value has been set. */
  default?: string | boolean;
  /** Options for `select` fields. */
  options?: SettingsFieldOption[];
  /** Reference links rendered under the description. */
  links?: SettingsFieldLink[];
  /** Whether the field must be filled (advisory; not enforced here). */
  required?: boolean;
  /** Free-form scope tag carried through untouched (e.g. client/server). */
  scope?: string;
  /** Allow schema authors to attach extra metadata. */
  [extra: string]: unknown;
}

/** The value types a field control can hold. */
export type SettingsValue = string | boolean | number | undefined;

/** Visual layout of a field. */
export type SettingsFieldVariant = "card" | "inline" | "ghost";

/** Per-slot class-name overrides so a host app can match its own design. */
export interface SettingsClassNames {
  /** The outer field container. */
  root?: string;
  /** The label/description header block. */
  header?: string;
  /** The label text. */
  title?: string;
  /** The description text. */
  description?: string;
  /** The control (input/select/switch) wrapper. */
  control?: string;
}

/** Props every field renderer receives from the dispatcher. */
export interface SettingsFieldRenderProps<
  F extends SettingsFieldSchema = SettingsFieldSchema,
> {
  field: F;
  /** Current value (falls back to `field.default` when undefined). */
  value: SettingsValue;
  /**
   * Optimistic local update — fires on every keystroke/toggle so controlled
   * hosts can mirror the value immediately.
   */
  onChange?: (value: SettingsValue) => void;
  /**
   * Persist a value. May be async; the field shows a spinner while the
   * returned promise is pending. Text inputs commit on blur, selects/switches
   * commit immediately.
   */
  onCommit?: (value: SettingsValue) => void | Promise<void>;
  /** Layout variant. */
  variant?: SettingsFieldVariant;
  /** Stable DOM id for the field container (anchoring/deep links). */
  anchorId?: string;
  /** Extra node rendered next to the title (e.g. a copy-link button). */
  titleAddon?: ReactNode;
  /** Class-name overrides. */
  classNames?: SettingsClassNames;
  /** Disable the control. */
  disabled?: boolean;
}

/** A component that renders one field type. */
export type SettingsFieldRenderer<
  F extends SettingsFieldSchema = SettingsFieldSchema,
> = ComponentType<SettingsFieldRenderProps<F>>;

/**
 * Map of field `type` → renderer. Merged over the built-ins, so a host can
 * override a built-in variant or add a brand-new one (e.g. `"theme"`). The
 * special `"unknown"` key handles any type with no registered renderer.
 */
export type SettingsFieldRenderers = Record<string, SettingsFieldRenderer>;
