/**
 * shadcn-settings — schema-driven settings form renderer for shadcn/ui.
 *
 * Feed it a list of plain-data field declarations plus `getValue`/`onCommit`
 * callbacks and it renders the controls (string, password, textarea, select,
 * switch) with card / inline / ghost layout variants. Bring your own field
 * types by passing extra `renderers`.
 */
export { SettingsList } from "./components/settings-list";
export type { SettingsListProps } from "./components/settings-list";

export { SettingsField, builtinRenderers } from "./components/settings-field";
export type { SettingsFieldProps } from "./components/settings-field";

export { FieldShell } from "./components/field-shell";
export type { FieldShellProps } from "./components/field-shell";

// Individual field renderers, exported so hosts can compose them directly.
export {
  StringField,
  PasswordField,
  TextareaField,
} from "./components/fields/text-field";
export { SelectField } from "./components/fields/select-field";
export { SwitchField } from "./components/fields/switch-field";

// shadcn/ui primitives used by the fields, re-exported for reuse.
export * from "./components/ui/select";
export { Switch } from "./components/ui/switch";

export { cn } from "./lib/utils";
export { useCommit } from "./lib/use-commit";

export type {
  SettingsFieldType,
  SettingsFieldOption,
  SettingsFieldLink,
  SettingsFieldSchema,
  SettingsValue,
  SettingsFieldVariant,
  SettingsClassNames,
  SettingsFieldRenderProps,
  SettingsFieldRenderer,
  SettingsFieldRenderers,
} from "./types";
