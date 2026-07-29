import * as React from "react";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { cn } from "../../lib/utils";
import { useCommit } from "../../lib/use-commit";
import { FieldShell } from "../field-shell";
import type { SettingsFieldRenderProps, SettingsValue } from "../../types";

const inputClass =
  "w-full rounded-lg border border-input bg-background px-3 py-2 pr-10 !text-xs text-foreground placeholder:text-muted-foreground transition-colors focus-visible:outline-none focus-visible:border-ring disabled:cursor-not-allowed disabled:opacity-60 lg:px-4 lg:py-3 lg:!text-[13px]";

interface TextControlProps extends SettingsFieldRenderProps {
  multiline?: boolean;
  secret?: boolean;
}

/**
 * Shared text control backing the `string`, `password` and `textarea`
 * variants. Edits are optimistic (`onChange`) and committed on blur
 * (`onCommit`), matching a "save when you click away" settings pattern.
 */
function TextControl({
  field,
  value,
  onChange,
  onCommit,
  variant,
  anchorId,
  titleAddon,
  classNames,
  disabled,
  multiline = false,
  secret = false,
}: TextControlProps) {
  const { committing, commit } = useCommit(onCommit);
  const [showSecret, setShowSecret] = React.useState(false);
  const fallback = typeof field.default === "string" ? field.default : "";
  const current = (value as string | undefined) ?? fallback;
  const isDisabled = disabled || committing;

  const handleChange = (next: string) => onChange?.(next as SettingsValue);
  const handleBlur = (next: string) => commit(next as SettingsValue);

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
      {multiline ? (
        <textarea
          value={current}
          onChange={(e) => handleChange(e.target.value)}
          onBlur={(e) => handleBlur(e.target.value)}
          placeholder={field.placeholder}
          rows={4}
          disabled={isDisabled}
          className={inputClass}
        />
      ) : (
        <input
          value={current}
          onChange={(e) => handleChange(e.target.value)}
          onBlur={(e) => handleBlur(e.target.value)}
          placeholder={field.placeholder}
          type={secret && !showSecret ? "password" : "text"}
          disabled={isDisabled}
          className={cn(inputClass, secret && "pr-16")}
        />
      )}

      {secret && !multiline ? (
        <button
          type="button"
          onClick={() => setShowSecret((v) => !v)}
          title={showSecret ? "Hide" : "Show"}
          className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-muted-foreground transition-colors hover:text-foreground"
        >
          {showSecret ? (
            <EyeOff className="h-4 w-4" />
          ) : (
            <Eye className="h-4 w-4" />
          )}
        </button>
      ) : null}

      {committing ? (
        <span
          className={cn(
            "pointer-events-none absolute text-muted-foreground",
            multiline
              ? "right-3 translate-y-3"
              : "top-1/2 -translate-y-1/2",
            secret && !multiline ? "right-8" : "right-3",
          )}
        >
          <Loader2 className="h-4 w-4 animate-spin" />
        </span>
      ) : null}
    </FieldShell>
  );
}

export function StringField(props: SettingsFieldRenderProps) {
  return <TextControl {...props} />;
}

export function PasswordField(props: SettingsFieldRenderProps) {
  return <TextControl {...props} secret />;
}

export function TextareaField(props: SettingsFieldRenderProps) {
  return <TextControl {...props} multiline />;
}
