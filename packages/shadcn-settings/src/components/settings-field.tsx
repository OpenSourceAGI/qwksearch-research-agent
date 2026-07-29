import * as React from "react";
import { FieldShell } from "./field-shell";
import { StringField, PasswordField, TextareaField } from "./fields/text-field";
import { SelectField } from "./fields/select-field";
import { SwitchField } from "./fields/switch-field";
import type {
  SettingsFieldRenderProps,
  SettingsFieldRenderer,
  SettingsFieldRenderers,
} from "../types";

/** The variants shipped with this package. */
export const builtinRenderers: SettingsFieldRenderers = {
  string: StringField as SettingsFieldRenderer,
  password: PasswordField as SettingsFieldRenderer,
  textarea: TextareaField as SettingsFieldRenderer,
  select: SelectField as SettingsFieldRenderer,
  switch: SwitchField as SettingsFieldRenderer,
};

/** Rendered when a field's `type` has no registered renderer. */
function UnknownField({
  field,
  variant,
  anchorId,
  classNames,
}: SettingsFieldRenderProps) {
  return (
    <FieldShell
      anchorId={anchorId}
      title={field.name}
      description={field.description}
      classNames={classNames}
      variant={variant}
    >
      <p className="text-xs text-muted-foreground">
        Unsupported field type: {String(field.type)}
      </p>
    </FieldShell>
  );
}

export interface SettingsFieldProps extends SettingsFieldRenderProps {
  /**
   * Extra or overriding renderers merged over the built-ins. Use the special
   * `"unknown"` key to customise the fallback, or add a new `type` (e.g.
   * `"theme"`) the schema uses.
   */
  renderers?: SettingsFieldRenderers;
}

/**
 * Renders a single settings field by dispatching on `field.type`. Unknown
 * types fall back to the `unknown` renderer.
 */
export function SettingsField({ renderers, ...props }: SettingsFieldProps) {
  const registry = React.useMemo(
    () => ({ ...builtinRenderers, ...renderers }),
    [renderers],
  );
  const Renderer =
    registry[props.field.type] ?? registry.unknown ?? UnknownField;
  return <Renderer {...props} />;
}
