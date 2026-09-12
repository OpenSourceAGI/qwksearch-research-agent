'use client';

import { Flexbox } from '@lobehub/ui';
import { AutoComplete, Button, Text } from '@lobehub/ui/base-ui';
import { memo, useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import {
  isLanguageTag,
  languageLabel,
  type LanguageTagCasing,
  MAX_TRANSCRIPT_LANGUAGES,
  normalizeLanguageList,
  normalizeLanguageTag,
  SUGGESTED_LANGUAGE_TAGS,
} from './languageTags';
import OrderedList from './OrderedList';

/** The extraction route lowercases; that is how `normalizeLanguages` dedupes. */
const CASING: LanguageTagCasing = 'lowercase';

/**
 * The two language fields, built on `AutoComplete` rather than a tags `Select`.
 *
 * That choice is forced, and the reason is worth keeping. `@lobehub/ui`'s
 * base-ui `Select` accepts `mode="tags"` and `tokenSeparators`, but **it never
 * creates a value that is not already in `options`** — typing is a typeahead
 * over the option list, and Enter commits whichever option the typeahead
 * landed on. With no options there is nothing to commit, which is why the
 * extraction pane's transcript-languages field could not be filled in at all;
 * with options, typing an unlisted-but-valid tag like `sw` selects the nearest
 * highlighted option instead, which is worse than doing nothing. Neither
 * behaviour can back a field whose valid values are "any BCP-47-shaped tag".
 *
 * `AutoComplete` is a real text input with a suggestion list, so both halves
 * work: pick a common language, or type any tag the server would accept.
 *
 * On top of that, these controls apply the route's own rule at the moment of
 * entry. Both routes validate the tag's shape and **drop what does not match
 * rather than failing the write** — deliberately, so `en, klingon` still gets
 * you English. The cost is that a typo disappears on save with nothing said:
 * you type `english`, the toast says "saved", and the field comes back empty.
 * Here the rejection is visible while the cursor is still in the field, and the
 * box shows the canonical spelling that will actually be stored.
 */

const SUGGESTIONS = (locale: string) =>
  SUGGESTED_LANGUAGE_TAGS.map((tag) => ({ label: languageLabel(tag, locale), value: tag }));

export interface LanguageSelectProps {
  /** Supplied by antd `Form.Item`. */
  onChange?: (value: string) => void;
  placeholder?: string;
  /** Supplied by antd `Form.Item`. `''` means "inherit", never "no language". */
  value?: string;
}

/**
 * One tag, canonically cased — the search pane's `language`.
 *
 * The committed value is always normalized, so a half-typed `en-U` commits
 * nothing rather than committing something the server would throw away. The
 * complaint waits for blur: a tag is malformed for most of the time it is being
 * typed, and shouting about it on every keystroke teaches the user to ignore it.
 */
export const LanguageSelect = memo<LanguageSelectProps>(({ onChange, placeholder, value }) => {
  const { i18n, t } = useTranslation('qwksearch');
  const [draft, setDraft] = useState<string | undefined>();
  const [touched, setTouched] = useState(false);

  const locale = i18n.language || 'en-US';
  const options = useMemo(() => SUGGESTIONS(locale), [locale]);

  // The box shows the draft while it is being edited and the stored value
  // otherwise, so a Revert or a PUT response reaches the input.
  const text = draft ?? value ?? '';

  const handleChange = useCallback(
    (next: string) => {
      setDraft(next);
      onChange?.(normalizeLanguageTag(next, 'canonical') ?? '');
    },
    [onChange],
  );

  const handleBlur = useCallback(() => {
    setTouched(true);
    const canonical = normalizeLanguageTag(text, 'canonical');
    // Show what will be stored: `EN-us` becomes `en-US`, and a tag the server
    // would drop stays on screen next to the reason it was dropped.
    if (canonical) setDraft(canonical);
    else if (!text.trim()) setDraft(undefined);
  }, [text]);

  const isInvalid = touched && !!text.trim() && !isLanguageTag(text);

  return (
    <Flexbox gap={4} onBlur={handleBlur}>
      <AutoComplete
        options={options}
        placeholder={placeholder}
        value={text}
        onChange={handleChange}
      />
      {isInvalid && (
        <Text style={{ fontSize: 12 }} type={'danger'}>
          {t('controls.language.invalid', { value: text.trim() })}
        </Text>
      )}
    </Flexbox>
  );
});

LanguageSelect.displayName = 'LanguageSelect';

export interface LanguageListSelectProps {
  /** Defaults to the extraction route's five. */
  limit?: number;
  /** Supplied by antd `Form.Item`. */
  onChange?: (value: string[]) => void;
  placeholder?: string;
  /** Supplied by antd `Form.Item`. Empty means "inherit". Order is preference. */
  value?: string[];
}

/** Split what was typed the way the route's own list parser does. */
const splitEntries = (draft: string): string[] => draft.split(/[\s,]+/).filter(Boolean);

/**
 * Up to `limit` tags, lowercased and in preference order — the extraction
 * pane's `languages`.
 *
 * Adding is an explicit button rather than Enter-in-the-box: `AutoComplete` has
 * no commit event of its own, and a field where Enter sometimes adds a tag and
 * sometimes submits the surrounding form is the kind of guess this pane should
 * not ask anyone to make. The box takes a whole list at once (`en, fr, pt-br`),
 * which is what the placeholder has always promised and what the dead
 * `tokenSeparators` prop never delivered. Order, and removal, live in the list
 * below.
 */
export const LanguageListSelect = memo<LanguageListSelectProps>(
  ({ limit = MAX_TRANSCRIPT_LANGUAGES, onChange, placeholder, value }) => {
    const { i18n, t } = useTranslation('qwksearch');
    const [draft, setDraft] = useState('');
    const [touched, setTouched] = useState(false);

    const locale = i18n.language || 'en-US';
    const selected = useMemo(() => value ?? [], [value]);

    // Suggestions already in the list are dropped rather than disabled: an
    // option that does nothing when clicked is not a useful suggestion.
    const options = useMemo(
      () =>
        SUGGESTIONS(locale).filter(
          (option) => !selected.includes(normalizeLanguageTag(option.value, CASING) ?? ''),
        ),
      [locale, selected],
    );

    // Normalize the stored list and the draft together, so the cap and the
    // duplicate check are the ones the server would apply to the result.
    const { duplicates, next, result } = useMemo(() => {
      const entries = splitEntries(draft);
      const outcome = normalizeLanguageList([...selected, ...entries], { casing: CASING, limit });
      return {
        duplicates: entries.filter((entry) => {
          const tag = normalizeLanguageTag(entry, CASING);
          return !!tag && selected.includes(tag);
        }),
        next: outcome.value,
        result: outcome,
      };
    }, [draft, limit, selected]);

    const isFull = selected.length >= limit;
    const canAdd = next.length > selected.length;

    const handleAdd = useCallback(() => {
      if (!canAdd) return;
      onChange?.(next);
      setDraft('');
      setTouched(false);
    }, [canAdd, next, onChange]);

    const handleOrder = useCallback((next_: string[]) => onChange?.(next_), [onChange]);

    const labelFor = useCallback((item: string) => languageLabel(item, locale), [locale]);

    return (
      <Flexbox gap={8} onBlur={() => setTouched(true)}>
        <Flexbox horizontal gap={8}>
          <Flexbox flex={1}>
            <AutoComplete
              disabled={isFull}
              options={options}
              placeholder={placeholder}
              value={draft}
              onChange={setDraft}
            />
          </Flexbox>
          <Button disabled={!canAdd} onClick={handleAdd}>
            {t('controls.language.add')}
          </Button>
        </Flexbox>
        {touched && result.invalid.length > 0 && (
          <Text style={{ fontSize: 12 }} type={'danger'}>
            {t('controls.language.invalid', { value: result.invalid.join(', ') })}
          </Text>
        )}
        {duplicates.length > 0 && (
          <Text style={{ fontSize: 12 }} type={'secondary'}>
            {t('controls.language.duplicate', { value: duplicates.join(', ') })}
          </Text>
        )}
        {(isFull || result.overflow.length > 0) && (
          <Text style={{ fontSize: 12 }} type={'warning'}>
            {t('controls.language.limit', { count: limit })}
          </Text>
        )}
        <OrderedList labelFor={labelFor} value={selected} onChange={handleOrder} />
      </Flexbox>
    );
  },
);

LanguageListSelect.displayName = 'LanguageListSelect';
