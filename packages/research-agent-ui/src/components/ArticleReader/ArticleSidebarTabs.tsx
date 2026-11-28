/**
 * @fileoverview The two-tab switcher at the top of the article reader's
 * sidebar: Questions (the prompt and suggested follow-ups) and Outline (the
 * article's headings). A WAI-ARIA tabs pattern — roving tabindex, Left/Right
 * (wrapping), Home and End move and select, Tab leaves the list — and the
 * panels it controls are rendered by the parent with the ids from
 * {@link articleTabIds}.
 */
'use client';

import React, { useRef } from 'react';

export type ArticleSidebarTab = 'questions' | 'outline';

const TABS: { value: ArticleSidebarTab; label: string }[] = [
  { value: 'questions', label: 'Questions' },
  { value: 'outline', label: 'Outline' },
];

/** Ids that tie a tab to its panel (`aria-controls` / `aria-labelledby`). */
export function articleTabIds(idBase: string, tab: ArticleSidebarTab) {
  return { tab: `${idBase}-tab-${tab}`, panel: `${idBase}-panel-${tab}` };
}

interface ArticleSidebarTabsProps {
  value: ArticleSidebarTab;
  onValueChange: (tab: ArticleSidebarTab) => void;
  /** Unique per panel instance; feeds {@link articleTabIds}. */
  idBase: string;
}

const ArticleSidebarTabs: React.FC<ArticleSidebarTabsProps> = ({ value, onValueChange, idBase }) => {
  const refs = useRef<Partial<Record<ArticleSidebarTab, HTMLButtonElement | null>>>({});

  const select = (tab: ArticleSidebarTab) => {
    onValueChange(tab);
    refs.current[tab]?.focus();
  };

  const onKeyDown = (event: React.KeyboardEvent, index: number) => {
    const last = TABS.length - 1;
    const next =
      event.key === 'ArrowRight' ? (index === last ? 0 : index + 1)
      : event.key === 'ArrowLeft' ? (index === 0 ? last : index - 1)
      : event.key === 'Home' ? 0
      : event.key === 'End' ? last
      : null;
    if (next === null) return;
    event.preventDefault();
    select(TABS[next].value);
  };

  return (
    <div role="tablist" aria-label="Article sidebar" className="flex gap-1 border-b border-border">
      {TABS.map((tab, index) => {
        const selected = tab.value === value;
        const ids = articleTabIds(idBase, tab.value);
        return (
          <button
            key={tab.value}
            ref={(el) => {
              refs.current[tab.value] = el;
            }}
            type="button"
            role="tab"
            id={ids.tab}
            aria-selected={selected}
            aria-controls={ids.panel}
            tabIndex={selected ? 0 : -1}
            onClick={() => onValueChange(tab.value)}
            onKeyDown={(event) => onKeyDown(event, index)}
            className={[
              '-mb-px rounded-t-md border-b-2 px-3 py-1.5 text-sm font-medium transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              selected
                ? 'border-primary text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground',
            ].join(' ')}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
};

export default ArticleSidebarTabs;
