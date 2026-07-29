import { Switch } from "../ui/switch";
import { FieldShell } from "../field-shell";
import { useCommit } from "../../lib/use-commit";
import type { SettingsFieldRenderProps, SettingsValue } from "../../types";

/** Toggle control for the `switch` variant. Laid out as a row. Commits on change. */
export function SwitchField({
  field,
  value,
  onChange,
  onCommit,
  variant,
  anchorId,
  titleAddon,
  classNames,
  disabled,
}: SettingsFieldRenderProps) {
  const { committing, commit } = useCommit(onCommit);
  const checked =
    value === true ||
    value === "true" ||
    (value === undefined && field.default === true);

  const handleChange = (next: boolean) => {
    onChange?.(next as SettingsValue);
    void commit(next as SettingsValue);
  };

  return (
    <FieldShell
      anchorId={anchorId}
      title={field.name}
      description={field.description}
      links={field.links}
      titleAddon={titleAddon}
      classNames={classNames}
      variant={variant}
      layout="row"
    >
      <Switch
        checked={checked}
        onCheckedChange={handleChange}
        disabled={disabled || committing}
        className="h-6 w-12"
      />
    </FieldShell>
  );
}
