/**
 * @fileoverview The `<` / `>` control that flips a stacked playlist.
 *
 * One control, two layouts: the card grid pins it over the card's top-left
 * corner (`variant="overlay"`) and the list drops it inline in the row
 * (`variant="inline"`). Both show an arrow either side of a position counter
 * and the current member's label, so a stack reads the same in either layout.
 *
 * The buttons stop propagation: in the list the whole row is a click target
 * that starts playback, and flipping to the companion video must not also
 * start playing the one being flipped away from.
 */

'use client';

import { ChevronLeft, ChevronRight, Layers } from 'lucide-react';
import type { MouseEvent } from 'react';

import type { VideoItem } from '../../library/types';

export interface StackNavProps {
  /** Zero-based index of the member on screen. */
  index: number;
  /** How many videos the stack holds. Renders nothing below 2. */
  count: number;
  /** Short label for the current member, e.g. "Part 2" or its category. */
  label?: string;
  /** Called with the index to move to. Wraps at both ends. */
  onSelect: (index: number) => void;
  variant?: 'overlay' | 'inline';
  className?: string;
}

export function StackNav({ index, count, label, onSelect, variant = 'overlay', className }: StackNavProps) {
  if (count < 2) return null;

  const go = (next: number) => (event: MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    // Wraps both ways: a two-video stack flips with whichever arrow is under the cursor.
    onSelect((next + count) % count);
  };

  return (
    <div
      className={`eytg-stack${variant === 'overlay' ? ' eytg-stack-overlay' : ''}${className ? ` ${className}` : ''}`}
      onClick={(event) => event.stopPropagation()}
      role="group"
      aria-label="Stacked playlist"
    >
      <Layers size={12} aria-hidden="true" />
      <button type="button" onClick={go(index - 1)} aria-label="Previous video in this stack">
        <ChevronLeft size={14} />
      </button>
      <span className="eytg-stack-count">{`${index + 1}/${count}`}</span>
      <button type="button" onClick={go(index + 1)} aria-label="Next video in this stack">
        <ChevronRight size={14} />
      </button>
      {label && (
        <span className="eytg-stack-label" title={label}>
          {label}
        </span>
      )}
    </div>
  );
}

/** Default label for a stack member: its category, else "Part N". */
export function defaultStackLabel(video: VideoItem, index: number): string {
  return video.category?.trim() || `Part ${index + 1}`;
}
