/**
 * Emoji-picker UI primitive wrapping the frimousse picker. Provides the searchable emoji grid used by the emoji feature.
 */

'use client';

import * as React from 'react';
import { useEffect, useState } from 'react';
import { LoaderIcon, SearchIcon } from 'lucide-react';

import { cn } from '@/lib/utils';

let frimousseMod: any = null;
let loadPromise: Promise<any> | null = null;

async function loadFrimousse() {
  if (frimousseMod) return frimousseMod;
  if (loadPromise) return loadPromise;

  if (typeof window !== 'undefined' && !window.React) {
    window.React = React;
  }

  loadPromise = import('https://esm.sh/frimousse@0.3.0')
    .then(mod => {
      frimousseMod = mod;
      return mod;
    })
    .catch(err => {
      loadPromise = null;
      throw err;
    });

  return loadPromise;
}

type EmojiPickerRootProps = {
  className?: string;
  onEmojiSelect?: (data: { emoji: string }) => void;
  children?: React.ReactNode;
};

function EmojiPicker({ className, onEmojiSelect, children, ...props }: EmojiPickerRootProps) {
  const [EmojiPickerPrimitive, setEmojiPickerPrimitive] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadFrimousse()
      .then(mod => {
        setEmojiPickerPrimitive(() => mod.EmojiPicker);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to load emoji picker:', err);
        setLoading(false);
      });
  }, []);

  if (loading || !EmojiPickerPrimitive || !frimousseMod) {
    return (
      <div
        data-slot='emoji-picker'
        className={cn(
          '!richtext-isolate !richtext-flex richtext-h-full !richtext-w-fit !richtext-flex-col !richtext-items-center !richtext-justify-center !richtext-overflow-hidden !richtext-rounded-md !richtext-bg-popover !richtext-text-popover-foreground',
          className
        )}
      >
        <LoaderIcon className='!richtext-size-6 !richtext-animate-spin !richtext-text-muted-foreground' />
      </div>
    );
  }

  return (
    <EmojiPickerPrimitive.Root
      data-slot='emoji-picker'
      className={cn(
        '!richtext-isolate !richtext-flex richtext-h-full !richtext-w-fit !richtext-flex-col !richtext-overflow-hidden !richtext-rounded-md !richtext-bg-popover !richtext-text-popover-foreground',
        className
      )}
      onEmojiSelect={onEmojiSelect}
      {...props}
    >
      {children}
    </EmojiPickerPrimitive.Root>
  );
}

function EmojiPickerSearch({ className, ...props }: { className?: string }) {
  if (!frimousseMod) return null;

  return (
    <div
      className={cn(
        '!richtext-flex !richtext-h-9 !richtext-items-center !richtext-gap-2 !richtext-border-b richtext-border-border !richtext-px-3',
        className
      )}
      data-slot='emoji-picker-search-wrapper'
    >
      <SearchIcon className='!richtext-size-4 !richtext-shrink-0 !richtext-opacity-50' />

      <frimousseMod.EmojiPicker.Search
        className='!richtext-flex !richtext-h-10 !richtext-w-full !richtext-rounded-md !richtext-border-none !richtext-bg-transparent !richtext-py-3 !richtext-text-sm !richtext-outline-none placeholder:!richtext-text-muted-foreground disabled:!richtext-cursor-not-allowed disabled:!richtext-opacity-50'
        data-slot='emoji-picker-search'
        {...props}
      />
    </div>
  );
}

function EmojiPickerRow({ children, ...props }: { children?: React.ReactNode; [key: string]: any }) {
  return (
    <div {...props} className='!richtext-scroll-my-1 !richtext-px-1' data-slot='emoji-picker-row'>
      {children}
    </div>
  );
}

function EmojiPickerEmoji({ emoji, className, ...props }: { emoji: any; className?: string; [key: string]: any }) {
  return (
    <button
      {...props}
      data-slot='emoji-picker-emoji'
      className={cn(
        '!richtext-flex !richtext-size-7 !richtext-items-center !richtext-justify-center !richtext-rounded-sm richtext-bg-transparent !richtext-text-base data-[active]:!richtext-bg-accent',
        className
      )}
    >
      {emoji.emoji}
    </button>
  );
}

function EmojiPickerCategoryHeader({ category, ...props }: { category: any; [key: string]: any }) {
  return (
    <div
      {...props}
      className='!richtext-bg-popover !richtext-px-3 !richtext-pb-2 !richtext-pt-3.5 !richtext-text-xs !richtext-leading-none !richtext-text-muted-foreground'
      data-slot='emoji-picker-category-header'
    >
      {category.label}
    </div>
  );
}

function EmojiPickerContent({ className, ...props }: { className?: string }) {
  if (!frimousseMod) return null;

  return (
    <frimousseMod.EmojiPicker.Viewport
      className={cn('!richtext-outline-hidden !richtext-relative !richtext-flex-1', className)}
      data-slot='emoji-picker-viewport'
      {...props}
    >
      <frimousseMod.EmojiPicker.Loading
        className='!richtext-absolute !richtext-inset-0 !richtext-flex !richtext-items-center !richtext-justify-center !richtext-text-muted-foreground'
        data-slot='emoji-picker-loading'
      >
        <LoaderIcon className='!richtext-size-4 !richtext-animate-spin' />
      </frimousseMod.EmojiPicker.Loading>

      <frimousseMod.EmojiPicker.Empty
        className='!richtext-absolute !richtext-inset-0 !richtext-flex !richtext-items-center !richtext-justify-center !richtext-text-sm !richtext-text-muted-foreground'
        data-slot='emoji-picker-empty'
      >
        No emoji found.
      </frimousseMod.EmojiPicker.Empty>

      <frimousseMod.EmojiPicker.List
        className='!richtext-select-none !richtext-pb-1'
        data-slot='emoji-picker-list'
        components={{
          Row: EmojiPickerRow,
          Emoji: EmojiPickerEmoji,
          CategoryHeader: EmojiPickerCategoryHeader,
        }}
      />
    </frimousseMod.EmojiPicker.Viewport>
  );
}

function EmojiPickerFooter({ className, ...props }: { className?: string }) {
  if (!frimousseMod) return null;

  return (
    <div
      data-slot='emoji-picker-footer'
      className={cn(
        '!richtext-max-w-(--frimousse-viewport-width) !richtext-flex !richtext-w-full !richtext-min-w-0 !richtext-items-center !richtext-gap-1 !richtext-border-t richtext-border-border !richtext-p-2',
        className
      )}
      {...props}
    >
      <frimousseMod.EmojiPicker.ActiveEmoji>
        {({ emoji }: { emoji: any }) =>
          emoji ? (
            <>
              <div className='!richtext-flex !richtext-size-7 !richtext-flex-none !richtext-items-center !richtext-justify-center !richtext-text-lg'>
                {emoji.emoji}
              </div>

              <span className='!richtext-truncate !richtext-text-xs !richtext-text-secondary-foreground'>
                {emoji.label}
              </span>
            </>
          ) : (
            <span className='!richtext-ml-1.5 !richtext-flex !richtext-h-7 !richtext-items-center !richtext-truncate !richtext-text-xs !richtext-text-muted-foreground'>
              Select an emoji…
            </span>
          )
        }
      </frimousseMod.EmojiPicker.ActiveEmoji>
    </div>
  );
}

export { EmojiPicker, EmojiPickerSearch, EmojiPickerContent, EmojiPickerFooter };
