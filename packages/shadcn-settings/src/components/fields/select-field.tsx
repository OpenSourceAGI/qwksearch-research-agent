import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { FieldShell } from "../field-shell";
import { useCommit } from "../../lib/use-commit";
import type { SettingsFieldRenderProps, SettingsValue } from "../../types";

/** Dropdown control for the `select` variant. Commits on change. */
export function SelectField({
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
  const fallback = typeof field.default === "string" ? field.default : undefined;
  const current = (value as string | undefined) ?? fallback;
  const options = (field.options ?? []).filter((o) => o.value !== "");

  const handleChange = (next: string) => {
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
    >
      <Select
        value={current}
        onValueChange={handleChange}
        disabled={disabled || committing}
      >
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Select an option" />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </FieldShell>
  );
}
