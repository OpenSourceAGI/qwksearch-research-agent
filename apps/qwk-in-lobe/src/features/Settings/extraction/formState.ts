/**
 * The translation between the form's values and the API's override document.
 *
 * The pane's whole subtlety is that **an unset field is not a value**. The
 * Worker folds four layers — shipped default → operator env → the user's
 * overrides → the request's query parameters — and `normalizeOverrides` drops
 * `undefined` so a partial layer cannot erase the one below it. A field the
 * user has not touched must therefore be *absent* from the PUT body, not sent
 * as `null`, `''` or the value that happens to be in force.
 *
 * So every input carries an explicit "inherit" state, spelled here as
 * {@link INHERIT} for enums and an empty list / `undefined` for the rest, and
 * {@link overridesFromFormValues} omits those keys entirely. Keeping that in a
 * plain module rather than inside the component is what makes it testable
 * without rendering antd.
 */
import type {
  CitationStyle,
  ExtractionSettingsResponse,
  PdfProcessor,
  TierId,
  UserExtractionOverrides,
} from './api';

/**
 * The select value that means "no override — use whatever the operator set".
 *
 * The empty string is deliberate: antd Select treats `undefined` as "nothing
 * chosen" and renders the placeholder, which is indistinguishable from a
 * loading state. A real option the user can pick back is clearer.
 */
export const INHERIT = '' as const;

export type Inheritable<T extends string> = T | typeof INHERIT;

export interface ExtractionFormValues {
  citationStyle: Inheritable<CitationStyle>;
  /** Empty means inherit. Order is meaningful — most-preferred first. */
  languages: string[];
  pdfProcessor: Inheritable<PdfProcessor>;
  /** Empty means inherit. Order is the order the tiers run in. */
  tiers: TierId[];
  /** `null` means inherit; antd InputNumber clears to `null`, not `undefined`. */
  timeoutSeconds: null | number;
  /** `INHERIT` rather than a boolean, so "off" and "unset" stay distinct. */
  useThirdPartyBackup: 'off' | 'on' | typeof INHERIT;
}

export const EMPTY_FORM_VALUES: ExtractionFormValues = {
  citationStyle: INHERIT,
  languages: [],
  pdfProcessor: INHERIT,
  tiers: [],
  timeoutSeconds: null,
  useThirdPartyBackup: INHERIT,
};

/**
 * Render the stored overrides as form values.
 *
 * Reads `overrides`, never `effective`: seeding the inputs from what is in
 * force would turn every inherited field into an explicit override the moment
 * the user saved anything, silently pinning them to today's server config.
 */
export const formValuesFromOverrides = (
  overrides: UserExtractionOverrides = {},
): ExtractionFormValues => ({
  citationStyle: overrides.citationStyle ?? INHERIT,
  languages: overrides.languages ?? [],
  pdfProcessor: overrides.pdfProcessor ?? INHERIT,
  tiers: overrides.tiers ?? [],
  timeoutSeconds: overrides.timeoutSeconds ?? null,
  useThirdPartyBackup:
    overrides.useThirdPartyBackup === undefined
      ? INHERIT
      : overrides.useThirdPartyBackup
        ? 'on'
        : 'off',
});

export const formValuesFromResponse = (response: ExtractionSettingsResponse) =>
  formValuesFromOverrides(response.overrides);

/**
 * The PUT body: only the fields the user actually chose.
 *
 * Values are passed through as typed rather than re-validated — the route
 * validates on write and returns what it kept, and duplicating the bounds here
 * is exactly the drift the `options` payload exists to avoid.
 */
export const overridesFromFormValues = (
  values: Partial<ExtractionFormValues> = {},
): UserExtractionOverrides => {
  const overrides: UserExtractionOverrides = {};

  if (values.citationStyle) overrides.citationStyle = values.citationStyle;
  if (values.pdfProcessor) overrides.pdfProcessor = values.pdfProcessor;
  if (values.languages?.length) overrides.languages = values.languages;
  if (values.tiers?.length) overrides.tiers = values.tiers;
  if (typeof values.timeoutSeconds === 'number' && Number.isFinite(values.timeoutSeconds)) {
    overrides.timeoutSeconds = values.timeoutSeconds;
  }
  if (values.useThirdPartyBackup === 'on') overrides.useThirdPartyBackup = true;
  if (values.useThirdPartyBackup === 'off') overrides.useThirdPartyBackup = false;

  return overrides;
};

/**
 * Whether the form differs from what the server last told us it stored.
 *
 * Compared through {@link overridesFromFormValues} on both sides so the
 * comparison is over override documents, not form representations: clearing a
 * language list and never having set one are the same state, and the Save bar
 * should not light up for the difference.
 */
export const isFormDirty = (
  values: Partial<ExtractionFormValues> | undefined,
  saved: UserExtractionOverrides | undefined,
): boolean => {
  const next = overridesFromFormValues(values);
  const previous = overridesFromFormValues(formValuesFromOverrides(saved));
  return !equalOverrides(next, previous);
};

const equalOverrides = (a: UserExtractionOverrides, b: UserExtractionOverrides): boolean => {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)] as Array<
    keyof UserExtractionOverrides
  >);

  for (const key of keys) {
    const left = a[key];
    const right = b[key];
    if (Array.isArray(left) || Array.isArray(right)) {
      // Order matters for both list fields: `languages` is a preference order
      // and `tiers` is an execution order.
      if (!Array.isArray(left) || !Array.isArray(right)) return false;
      if (left.length !== right.length) return false;
      if (left.some((item, index) => item !== right[index])) return false;
    } else if (left !== right) return false;
  }

  return true;
};

/** Whether any override is set at all — the Reset button's enablement. */
export const hasAnyOverride = (overrides: UserExtractionOverrides | undefined): boolean =>
  !!overrides && Object.keys(overrides).length > 0;
