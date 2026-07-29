import * as React from "react";
import { cn } from "../lib/utils";
import { SettingsField } from "./settings-field";
import type {
  SettingsClassNames,
  SettingsFieldRenderers,
  SettingsFieldSchema,
  SettingsFieldVariant,
  SettingsValue,
} from "../types";

export interface SettingsListProps {
  /** The fields to render, in order. */
  fields: SettingsFieldSchema[];
  /**
   * Current value for a field. Return `undefined` to fall back to the field's
   * own `default`. Called per-field so client/server-scoped reads can differ.
   */
  getValue: (field: SettingsFieldSchema) => SettingsValue;
  /** Persist a committed value for a field. May be async. */
  onCommit: (
    field: SettingsFieldSchema,
    value: SettingsValue,
  ) => void | Promise<void>;
  /** Optional optimistic per-field change handler (pre-commit). */
  onChange?: (field: SettingsFieldSchema, value: SettingsValue) => void;
  /** Layout variant applied to every field. */
  variant?: SettingsFieldVariant;
  /** Extra/override renderers (e.g. a `theme` variant). */
  renderers?: SettingsFieldRenderers;
  /** Build a DOM id for a field container (anchoring/deep links). */
  anchorId?: (field: SettingsFieldSchema) => string;
  /** Render a node beside a field's title (e.g. a copy-link button). */
  renderTitleAddon?: (field: SettingsFieldSchema) => React.ReactNode;
  /** Per-field class-name overrides. */
  classNames?: SettingsClassNames;
  /** Class name for the wrapping list container. */
  className?: string;
}

/**
 * Renders an ordered list of settings fields from a schema. Each field's value
 * and persistence are supplied by the host via `getValue`/`onCommit`, so this
 * component stays agnostic about where values live (localStorage, an API, …).
 */
export function SettingsList({
  fields,
  getValue,
  onCommit,
  onChange,
  variant,
  renderers,
  anchorId,
  renderTitleAddon,
  classNames,
  className,
}: SettingsListProps) {
  return (
    <div className={cn("flex-1 space-y-6 overflow-y-auto px-6 py-6", className)}>
      {fields.map((field) => (
        <SettingsField
          key={field.key}
          field={field}
          value={getValue(field)}
          onChange={
            onChange ? (value) => onChange(field, value) : undefined
          }
          onCommit={(value) => onCommit(field, value)}
          variant={variant}
          renderers={renderers}
          anchorId={anchorId?.(field)}
          titleAddon={renderTitleAddon?.(field)}
          classNames={classNames}
        />
      ))}
    </div>
  );
}
