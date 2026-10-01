/**
 * @fileoverview A responsive grid of video cards.
 *
 * Cards are laid out one per **slot** rather than one per video: a stacked
 * playlist folds its members into the slot its first member occupies and is
 * flipped through in place with the card's `<` / `>` arrows. See
 * `library/stacks.ts` for the folding rule.
 *
 * ```tsx
 * <FloatingYouTubePlayer transcriptUrl="/api/transcript" />   // once, at the root
 * <VideoGrid
 *   videos={videos}
 *   favorites={favorites}
 *   onToggleFavorite={toggle}
 *   transcriptUrl="/api/transcript"
 * />
 * ```
 */

'use client';

import { memo, useMemo, type CSSProperties, type ReactNode, type Ref } from 'react';

import { buildVideoSlots, type VideoStackMap } from '../../library/stacks';
import type { VideoItem } from '../../library/types';
import { StackedVideoCard } from './StackedVideoCard';
import type { VideoActionProps } from './VideoCard';
import { GridStylesProvider } from './styles';

export interface VideoGridProps extends VideoActionProps {
  videos: readonly VideoItem[];
  /**
   * Members of the stacks on screen, keyed by stack key (from the library's
   * `/stacks` route or `client.stacks()`). Omit it and stacks are formed from
   * the `videos` you pass — enough when the whole library is loaded.
   */
  stacks?: VideoStackMap | null;
  /** `false` gives every video its own card. Default `true`. */
  stacksEnabled?: boolean;
  /** Label for a stack member on its flip control. */
  stackLabel?: (video: VideoItem, index: number) => string | undefined;
  showThumbnails?: boolean;
  showDescription?: boolean;
  showFullDate?: boolean;
  /** Smallest card width before the grid drops a column. Default `240px`. */
  minCardWidth?: number | string;
  /** Rendered when `videos` is empty. */
  emptyState?: ReactNode;
  className?: string;
  /** Ref to the grid element — for infinite scroll sentinels and scroll restoration. */
  containerRef?: Ref<HTMLDivElement>;
}

function VideoGridComponent({
  videos,
  stacks,
  stacksEnabled = true,
  stackLabel,
  showThumbnails = true,
  showDescription,
  showFullDate,
  minCardWidth,
  emptyState,
  className,
  containerRef,
  ...actions
}: VideoGridProps) {
  const slots = useMemo(() => buildVideoSlots(videos, stacks, stacksEnabled), [videos, stacks, stacksEnabled]);
  const style = minCardWidth
    ? ({ '--eytg-card-min': typeof minCardWidth === 'number' ? `${minCardWidth}px` : minCardWidth } as CSSProperties)
    : undefined;

  return (
    <GridStylesProvider>
      <div className={`eytg-root${className ? ` ${className}` : ''}`} style={style}>
        {slots.length === 0 ? (
          <div className="eytg-empty">{emptyState ?? 'No videos to show.'}</div>
        ) : (
          <div className="eytg-grid" ref={containerRef}>
            {slots.map((slot) => (
              <StackedVideoCard
                key={slot.key}
                videos={slot.videos}
                initialIndex={slot.initialIndex}
                stackLabel={stackLabel}
                showThumbnail={showThumbnails}
                showDescription={showDescription}
                showFullDate={showFullDate}
                {...actions}
              />
            ))}
          </div>
        )}
      </div>
    </GridStylesProvider>
  );
}

/**
 * Memoised: the page above typically re-renders on every keystroke in a search
 * box, and the grid's own props change far less often than that.
 */
export const VideoGrid = memo(VideoGridComponent);
