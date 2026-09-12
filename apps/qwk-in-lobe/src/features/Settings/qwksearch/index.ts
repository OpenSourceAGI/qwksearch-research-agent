/**
 * Controls shared by the QwkSearch settings panes.
 *
 * The extraction pane (`../extraction`) and the Search & Sources pane
 * (`../search`) are separate features with separate routes, but three of their
 * fields are the same two problems: a list whose order is execution order
 * (`tiers`, `categories`, `languages`), and a BCP-47 tag the server silently
 * drops when it is malformed (`languages`, `language`). Both were solved once
 * here rather than twice there, and a third pane on the same resolver pattern
 * gets them free.
 *
 * Nothing in here knows about either pane's API shape — these are plain
 * controlled inputs that antd `Form.Item` can drive.
 */
export {
  LanguageListSelect,
  type LanguageListSelectProps,
  LanguageSelect,
  type LanguageSelectProps,
} from './LanguageSelect';
export {
  canonicalizeLanguageTag,
  isLanguageTag,
  languageLabel,
  type LanguageListResult,
  type LanguageTagCasing,
  lowercaseLanguageTag,
  MAX_TRANSCRIPT_LANGUAGES,
  normalizeLanguageList,
  normalizeLanguageTag,
  SUGGESTED_LANGUAGE_TAGS,
} from './languageTags';
export {
  moveItem,
  ORDER_HANDLE_TEST_ID,
  default as OrderedList,
  type OrderedListProps,
  removeItem,
} from './OrderedList';
export { default as OrderedMultiSelect, type OrderedMultiSelectProps } from './OrderedMultiSelect';
