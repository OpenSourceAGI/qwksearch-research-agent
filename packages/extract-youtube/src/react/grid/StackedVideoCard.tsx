/**
 * @fileoverview One grid slot holding a stacked playlist.
 *
 * Renders the selected member as an ordinary {@link VideoCard} — so every card
 * in a grid is the same card with the same actions — and lays the flip control
 * over its corner. A slot with one video skips the control entirely, which is
 * what a standalone video renders as.
 */

'use client';

import { useState } from 'react';

import type { VideoItem } from '../../library/types';
import { StackNav, defaultStackLabel } from './StackNav';
import { VideoCard, type VideoCardProps } from './VideoCard';

export interface StackedVideoCardProps extends Omit<VideoCardProps, 'video' | 'overlay'> {
  /** The stack's members, primary first. A one-entry list is a plain card. */
  videos: VideoItem[];
  /** Which member to open on — the one the feed itself returned. */
  initialIndex?: number;
  /** Label for the member on screen. Defaults to its category, else "Part N". */
  stackLabel?: (video: VideoItem, index: number) => string | undefined;
}

export function StackedVideoCard({ videos, initialIndex = 0, stackLabel = defaultStackLabel, ...cardProps }: StackedVideoCardProps) {
  const [index, setIndex] = useState(initialIndex);
  // A feed page can shrink a stack under this index (a member hidden, a
  // filter change); clamp rather than render nothing.
  const position = Math.min(Math.max(index, 0), videos.length - 1);
  const active = videos[position] ?? videos[0];
  if (!active) return null;

  return (
    <div className="eytg-slot">
      <VideoCard
        {...cardProps}
        video={active}
        overlay={
          videos.length > 1 ? (
            <StackNav index={position} count={videos.length} label={stackLabel(active, position)} onSelect={setIndex} />
          ) : undefined
        }
      />
    </div>
  );
}
