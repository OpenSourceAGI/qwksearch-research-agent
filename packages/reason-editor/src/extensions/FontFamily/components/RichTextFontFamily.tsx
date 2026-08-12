/**
 * Toolbar control (React) for the FontFamily extension, which adds font-family selection. Renders the button and dispatches the matching editor command when activated.
 */

import { Search, Type } from 'lucide-react';
import React, { useDeferredValue, useMemo, useRef, useState } from 'react';

import {
  ActionButton,
  ActionMenuButton,
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components';
import { FontFamily } from '@/extensions/FontFamily/FontFamily';
import { useActive } from '@/hooks/useActive';
import { useButtonProps } from '@/hooks/useButtonProps';
import { useLocale } from '@/locales';

import type { ButtonViewReturnComponentProps } from '@/types';

export interface Item {
  title: string;
  icon?: any;
  font?: string;
  isActive: NonNullable<ButtonViewReturnComponentProps['isActive']>;
  action?: ButtonViewReturnComponentProps['action'];
  style?: React.CSSProperties;
  shortcutKeys?: string[];
  disabled?: boolean;
  divider?: boolean;
  default?: boolean;
}

export interface RichTextFontFamilyProps {
  /**
   * `icon` is the compact "T" button the main toolbar uses; `label` keeps the
   * older trigger that spells out the active font, for use inside menus where
   * there is room for the name.
   */
  variant?: 'icon' | 'label';
}

export function RichTextFontFamily({ variant = 'icon' }: RichTextFontFamilyProps = {}) {
  const { t } = useLocale();

  const buttonProps = useButtonProps(FontFamily.name);

  const {
    icon = undefined,
    tooltip = undefined,
    items = [],
    isActive = undefined,
  } = buttonProps?.componentProps ?? {};

  const { disabled, dataState } = useActive(isActive);

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  // Typing filters a list of ~50 fonts, each rendered in its own face; letting
  // the input update ahead of the list keeps the field responsive.
  const deferredQuery = useDeferredValue(query);
  const searchRef = useRef<HTMLInputElement>(null);

  const title = useMemo(() => {
    return dataState?.font || 'Inter';
  }, [dataState]);

  const filtered = useMemo(() => {
    const needle = deferredQuery.trim().toLowerCase();
    if (!needle) return items as Item[];
    return (items as Item[]).filter((item) => item.title?.toLowerCase().includes(needle));
  }, [items, deferredQuery]);

  if (!buttonProps) {
    return <></>;
  }

  const label = tooltip || 'Font';

  return (
    <Popover
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setQuery('');
      }}
      open={open}
    >
      <PopoverTrigger asChild disabled={disabled}>
        {variant === 'icon' ? (
          // Same `ActionButton` every other single-icon control uses, so the
          // font picker sits in the toolbar row looking like its neighbours.
          // The trigger's own `data-state` is open/closed rather than the
          // toggle's on/off, so the pressed look is keyed off that instead.
          <ActionButton
            aria-label={label}
            customClass='data-[state=open]:richtext-bg-accent'
            disabled={disabled}
            tooltip={label}
          >
            <Type className='richtext-size-4' />
          </ActionButton>
        ) : (
          <div className='richtext-w-full'>
            <ActionMenuButton disabled={disabled} icon={icon} title={title} tooltip={tooltip} />
          </div>
        )}
      </PopoverTrigger>

      <PopoverContent
        align='start'
        className='richtext-w-[280px] !richtext-p-0'
        // The picker lives inside the toolbar's own dropdown panels; pulling
        // focus into the search box must not scroll or blur what is underneath.
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          searchRef.current?.focus({ preventScroll: true });
        }}
        side='bottom'
      >
        <div className='richtext-relative richtext-border-b richtext-border-border'>
          <Search
            className='richtext-pointer-events-none richtext-absolute richtext-left-3 richtext-top-1/2 -richtext-translate-y-1/2 richtext-text-muted-foreground'
            size={15}
          />

          <input
            className='richtext-w-full richtext-bg-transparent richtext-py-2.5 richtext-pl-9 richtext-pr-3 richtext-text-sm richtext-outline-none placeholder:richtext-text-muted-foreground'
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t('editor.fontFamily.search')}
            ref={searchRef}
            type='text'
            value={query}
          />
        </div>

        <div className='richtext-max-h-80 richtext-overflow-y-auto richtext-py-1'>
          {filtered.length === 0 && (
            <div className='richtext-px-3 richtext-py-6 richtext-text-center richtext-text-sm richtext-text-muted-foreground'>
              {t('editor.fontFamily.empty')}
            </div>
          )}

          {filtered.map((item, index) => {
            const active = title === item.font;

            return (
              <button
                aria-pressed={active}
                key={`font-family-${item.font ?? index}`}
                onClick={() => {
                  item.action?.();
                  setOpen(false);
                }}
                // The default entry is the editor's own face, so it is left to
                // inherit rather than being pinned to a named family.
                style={item.default ? {} : { fontFamily: item.font }}
                type='button'
                className={`richtext-flex richtext-w-full richtext-items-center richtext-px-4 richtext-py-2 richtext-text-left richtext-text-base richtext-transition-colors hover:richtext-bg-accent ${
                  active ? 'richtext-bg-accent richtext-font-medium' : ''
                }`}
              >
                <span className='richtext-truncate'>{item.title}</span>
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
