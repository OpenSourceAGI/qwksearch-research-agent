'use client';

import * as React from 'react';

import type { PlateLeafProps } from 'platejs/react';

import { PlateLeaf } from 'platejs/react';

import { cn } from '@/lib/utils';

/**
 * A Harper issue: Google Docs' wavy underline, red for spelling and amber for
 * grammar. Clicking it opens the spelling and grammar panel on that issue.
 */
export function HarperLeaf(props: PlateLeafProps) {
  const leaf = props.leaf as PlateLeafProps['leaf'] & {
    harperId?: string;
    harperMessage?: string;
    harperSpelling?: boolean;
  };
  const { editor } = props;

  return (
    <PlateLeaf
      {...props}
      attributes={{
        ...props.attributes,
        'data-harper-id': leaf.harperId,
        title: leaf.harperMessage,
        onClick: () => {
          if (!leaf.harperId) return;
          (editor.api as any).harper?.openPanel(leaf.harperId);
        },
      }}
      className={cn(
        'cursor-pointer underline decoration-wavy decoration-[1.5px] underline-offset-[3px] [text-decoration-skip-ink:none]',
        leaf.harperSpelling ? 'decoration-[#e5484d]' : 'decoration-[#f5a623]',
      )}
    >
      {props.children}
    </PlateLeaf>
  );
}
