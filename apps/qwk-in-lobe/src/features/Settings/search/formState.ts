/**
 * The translation between the form's values and the API's override document.
 *
 * The pane's whole subtlety is the same one the extraction pane has: **an unset
 * field is not a value**. The resolver folds four layers — shipped default →
 * operator env → the user's overrides → this tool call's arguments — and
 * `normalizeSearchOverrides` drops `undefined`, so a partial layer cannot erase
 * the one below it. A field the user has not touched must therefore be *absent*
 * from the PUT body, not sent as `null`, `''` or the value that happens to be
 * in force.
 *
 * So every input carries an explicit "inherit" state, spelled here as
 * {@link INHERIT} for the enums, an empty list for `categories`, an empty
 * string for `language` and `null` for the two numbers, and
 * {@link overridesFromFormValues} omits those keys entirely. Keeping that in a
 * plain module rather than inside the component is what makes it testable
 * without rendering antd.
 */
import type {
  SearchCategory,
  SearchSettingsResponse,
  SearchTimeRange,
  UserSearchOverrides,
} from './api';

/**
 * The select value that means "no override — use whatever the operator set".
 *
 * The empty string is deliberate, for the reason the extraction pane records:
 * antd Select treats `undefined` as "nothing chosen" and renders the
 * placeholder, which is indistinguishable from a loading state. A real option
 * the user can pick back is clearer.
 */
export const INHERIT = '' as const;

export type Inheritable<T extends string> = T | typeof INHERIT;

/** `INHERIT` rather than a boolean, so "off" and "unset" stay distinct. */
export type TriState = 'off' | 'on' | typeof INHERIT;

export interface SearchFormValues {
  /** Empty means inherit. Order is meaningful — it is the fan-out order. */
  categories: SearchCategory[];
  /** Empty means inherit. A BCP-47-shaped tag; the server drops what is not. */
  language: string;
  /** `null` means inherit; antd InputNumber clears to `null`, not `undefined`. */
  maxCategories: null | number;
  publicInstances: TriState;
  /** `null` means inherit — and inheriting may itself mean "no cap". */
  resultLimit: null | number;
  safeSearch: TriState;
  /** `INHERIT` means inherit, which may itself resolve to "no recency filter". */
  timeRange: Inheritable<SearchTimeRange>;
}

export const EMPTY_FORM_VALUES: SearchFormValues = {
  categories: [],
  language: '',
  maxCategories: null,
  publicInstances: INHERIT,
  resultLimit: null,
  safeSearch: INHERIT,
  timeRange: INHERIT,
};

const triState = (value: boolean | undefined): TriState =>
  value === undefined ? INHERIT : value ? 'on' : 'off';

/**
 * Render the stored overrides as form values.
 *
 * Reads `overrides`, never `effective`: seeding the inputs from what is in
 * force would turn every inherited field into an explicit override the moment
 * the user saved anything, silently pinning them to today's server config.
 */
export const formValuesFromOverrides = (overrides: UserSearchOverrides = {}): SearchFormValues => ({
  categories: overrides.categories ?? [],
  language: overrides.language ?? '',
  maxCategories: overrides.maxCategories ?? null,
  publicInstances: triState(overrides.publicInstances),
  resultLimit: overrides.resultLimit ?? null,
  safeSearch: triState(overrides.safeSearch),
  timeRange: overrides.timeRange ?? INHERIT,
});

export const formValuesFromResponse = (response: SearchSettingsResponse) =>
  formValuesFromOverrides(response.overrides);

const numeric = (value: unknown): number | undefined =>
  typeof value === 'number' && Number.isFinite(value) ? value : undefined;

/**
 * The PUT body: only the fields the user actually chose.
 *
 * Values are passed through as typed rather than re-validated — the route
 * validates on write and returns what it kept, and duplicating the bounds here
 * is exactly the drift the `options` payload exists to avoid. The one thing
 * done locally is trimming `language`, because a trailing space is a typing
 * artefact rather than a choice, and the server would silently drop the whole
 * field for it.
 */
export const overridesFromFormValues = (
  values: Partial<SearchFormValues> = {},
): UserSearchOverrides => {
  const overrides: UserSearchOverrides = {};

  if (values.categories?.length) overrides.categories = values.categories;

  const language = values.language?.trim();
  if (language) overrides.language = language;

  const maxCategories = numeric(values.maxCategories);
  if (maxCategories !== undefined) overrides.maxCategories = maxCategories;

  const resultLimit = numeric(values.resultLimit);
  if (resultLimit !== undefined) overrides.resultLimit = resultLimit;

  if (values.publicInstances === 'on') overrides.publicInstances = true;
  if (values.publicInstances === 'off') overrides.publicInstances = false;

  if (values.safeSearch === 'on') overrides.safeSearch = true;
  if (values.safeSearch === 'off') overrides.safeSearch = false;

  if (values.timeRange) overrides.timeRange = values.timeRange;

  return overrides;
};

/**
 * Whether the form differs from what the server last told us it stored.
 *
 * Compared through {@link overridesFromFormValues} on both sides so the
 * comparison is over override documents, not form representations: clearing a
 * category list and never having set one are the same state, and the Save bar
 * should not light up for the difference.
 */
export const isFormDirty = (
  values: Partial<SearchFormValues> | undefined,
  saved: UserSearchOverrides | undefined,
): boolean => {
  const next = overridesFromFormValues(values);
  const previous = overridesFromFormValues(formValuesFromOverrides(saved));
  return !equalOverrides(next, previous);
};

const equalOverrides = (a: UserSearchOverrides, b: UserSearchOverrides): boolean => {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)] as Array<keyof UserSearchOverrides>);

  for (const key of keys) {
    const left = a[key];
    const right = b[key];
    if (Array.isArray(left) || Array.isArray(right)) {
      // Order matters: `categories` is the order the fan-out runs them in, and
      // the cap keeps the first N.
      if (!Array.isArray(left) || !Array.isArray(right)) return false;
      if (left.length !== right.length) return false;
      if (left.some((item, index) => item !== right[index])) return false;
    } else if (left !== right) return false;
  }

  return true;
};

/** Whether any override is set at all — the Reset button's enablement. */
export const hasAnyOverride = (overrides: UserSearchOverrides | undefined): boolean =>
  !!overrides && Object.keys(overrides).length > 0;
