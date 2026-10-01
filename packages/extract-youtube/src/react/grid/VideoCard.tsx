/**
 * @fileoverview One video as a card: thumbnail, title, channel, date, views,
 * the host's custom-field badges, and an action row.
 *
 * Ported from debate-ai.com's `VideoCard`, which read a 19-slot debate tuple
 * (aff team at index 9, judge decision at 12, …) and a zustand store. Here it
 * takes a plain {@link VideoItem}, reads playback state from this package's own
 * player store, and app-specific data arrives as custom-field badges or through
 * `renderActions` — so the card stays generic.
 *
 * Clicking the thumbnail plays the video in `<FloatingYouTubePlayer />` (mount
 * one at the app root) unless you pass `onPlay`.
 */

'use client';

import { memo, useState, type ReactNode } from 'react';
import { ExternalLink, Eye, EyeOff, ListPlus, Medal, Play, Star } from 'lucide-react';

import type { CustomFieldDef, VideoItem } from '../../library/types';
import { YouTubeTranscriptModal, type YouTubeTranscriptModalProps } from '../YouTubeTranscriptModal';
import { usePlayerSelector, youtubePlayer } from '../player/playerStore';
import type { TranscriptSource } from '../transcript';
import { formatCustomValue, formatVideoDate, formatViewCount, thumbnailFor, toPlayerVideo } from './format';
import { GridStylesProvider } from './styles';

/**
 * Behaviour shared by `<VideoCard>`, `<VideoGrid>` and `<VideoList>`. Every
 * callback is optional; an action whose callback is missing is not rendered.
 */
export interface VideoActionProps extends TranscriptSource {
  /** Ids the user has starred. */
  favorites?: ReadonlySet<string> | readonly string[];
  /** Ids the user has hidden. Hidden videos render dimmed with an "Unhide" action. */
  hidden?: ReadonlySet<string> | readonly string[];
  onToggleFavorite?: (videoId: string) => void;
  /** Called after the user confirms hiding a video. */
  onHide?: (videoId: string) => void;
  onUnhide?: (videoId: string) => void;
  /** Replaces the default play action (`youtubePlayer.play`). */
  onPlay?: (video: VideoItem) => void;
  /** Show the "add to queue" button. Default `true`. */
  showQueueButton?: boolean;
  /** Show the "open on YouTube" link. Default `true`. */
  showYouTubeLink?: boolean;
  /** Makes channel and category clickable — e.g. to search the library for them. */
  onBadgeClick?: (text: string) => void;
  /** The host's custom fields; those with `showOnCard` render as badges. */
  customFields?: readonly CustomFieldDef[];
  /** Watch progress, `0…1`, drawn as a bar under the thumbnail. */
  getProgress?: (videoId: string) => number | null | undefined;
  /** Extra buttons at the end of the action row. */
  renderActions?: (video: VideoItem) => ReactNode;
}

export interface VideoCardProps extends VideoActionProps {
  video: VideoItem;
  /** Show the thumbnail. Default `true`. */
  showThumbnail?: boolean;
  /** Show up to three lines of the description. */
  showDescription?: boolean;
  /** `May 1, 2024` instead of `May 2024`. */
  showFullDate?: boolean;
  /** Rendered over the thumbnail's top-left corner — `<StackedVideoCard>` puts its flip control here. */
  overlay?: ReactNode;
}

/** `Set`/array membership, for the two list-shaped props. */
export function hasId(list: ReadonlySet<string> | readonly string[] | undefined, id: string): boolean {
  if (!list) return false;
  return 'has' in list ? list.has(id) : list.includes(id);
}

/** Confirms before hiding: a hidden video vanishes from the listing, which is easy to do by accident. */
export function HideConfirm({ title, onConfirm, onCancel }: { title?: string; onConfirm: () => void; onCancel: () => void }) {
  return (
    <div className="eytg-overlay" role="presentation" onClick={onCancel}>
      <div
        className="eytg-dialog eytg-dialog-sm"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="eytg-hide-title"
        onClick={(event) => event.stopPropagation()}
      >
        <header>
          <h2 id="eytg-hide-title">Hide this video?</h2>
        </header>
        <div className="eytg-dialog-body">
          <p style={{ margin: 0 }}>
            {title ? <strong>{title}</strong> : 'This video'} will be hidden from your listing. You can show it
            again from the hidden filter.
          </p>
        </div>
        <footer>
          <button type="button" className="eytg-btn" onClick={onCancel}>
            Cancel
          </button>
          <button type="button" className="eytg-btn eytg-btn-primary" onClick={onConfirm} autoFocus>
            Hide
          </button>
        </footer>
      </div>
    </div>
  );
}

function VideoCardComponent({
  video,
  showThumbnail = true,
  showDescription = false,
  showFullDate = false,
  overlay,
  favorites,
  hidden,
  onToggleFavorite,
  onHide,
  onUnhide,
  onPlay,
  showQueueButton = true,
  showYouTubeLink = true,
  onBadgeClick,
  customFields,
  getProgress,
  renderActions,
  transcriptUrl,
  fetchTranscript,
}: VideoCardProps) {
  const { videoId } = video;
  // Narrow selectors: each yields a boolean, so a card re-renders only when
  // its own playing/queued state flips, not on every change to the player.
  const isPlaying = usePlayerSelector((state) => state.activeVideo?.videoId === videoId);
  const isQueued = usePlayerSelector((state) => state.queue.some((item) => item.videoId === videoId));
  const [confirmHide, setConfirmHide] = useState(false);

  const title = video.title || videoId;
  const isFavorite = hasId(favorites, videoId);
  const isHidden = hasId(hidden, videoId);
  const progress = getProgress?.(videoId);
  const play = () => (onPlay ? onPlay(video) : youtubePlayer.play(toPlayerVideo(video)));

  const badges = (customFields ?? [])
    .filter((def) => def.showOnCard)
    .map((def) => ({ def, text: formatCustomValue(def, video.custom?.[def.key]) }))
    .filter((badge): badge is { def: CustomFieldDef; text: string } => badge.text !== null);
  const unavailable = video.availability && video.availability !== 'available';

  const metaItem = (text: string | null | undefined) =>
    !text ? null : onBadgeClick ? (
      <button type="button" onClick={() => onBadgeClick(text)} title={`Filter by ${text}`}>
        {text}
      </button>
    ) : (
      <span>{text}</span>
    );

  return (
    <GridStylesProvider>
      <article
        className={`eytg-card${isPlaying ? ' eytg-playing' : ''}${isHidden ? ' eytg-hidden' : ''}`}
        aria-label={title}
      >
        {overlay}
        {isHidden && !overlay && (
          <span className="eytg-hidden-flag eytg-badge">Hidden</span>
        )}

        {showThumbnail && (
          <button type="button" className="eytg-thumb" onClick={play} aria-label={`Play ${title}`}>
            <img src={thumbnailFor(videoId)} alt="" loading="lazy" decoding="async" />
            <span className="eytg-thumb-play" aria-hidden="true">
              <Play size={36} fill="currentColor" />
            </span>
            <span className="eytg-thumb-badges">
              {video.featured && (
                <span className="eytg-badge eytg-badge-gold" title="Top pick">
                  <Medal size={11} /> Top pick
                </span>
              )}
              {isPlaying && <span className="eytg-badge eytg-badge-accent">Playing</span>}
              {!isPlaying && isQueued && <span className="eytg-badge">Queued</span>}
            </span>
            {typeof progress === 'number' && progress > 0 && (
              <span className="eytg-progress" aria-label={`${Math.round(progress * 100)}% watched`}>
                <span style={{ width: `${Math.min(100, Math.round(progress * 100))}%` }} />
              </span>
            )}
          </button>
        )}

        <div className="eytg-card-body">
          <h3 className="eytg-card-title" title={title}>
            {showThumbnail ? (
              title
            ) : (
              <button
                type="button"
                onClick={play}
                style={{ all: 'unset', cursor: 'pointer' }}
                aria-label={`Play ${title}`}
              >
                {title}
              </button>
            )}
          </h3>
          <div className="eytg-card-meta">
            {metaItem(video.channel)}
            {video.publishedAt && <span>{formatVideoDate(video.publishedAt, showFullDate)}</span>}
            {typeof video.viewCount === 'number' && video.viewCount > 0 && (
              <span>{formatViewCount(video.viewCount)} views</span>
            )}
            {metaItem(video.category)}
          </div>
          {(badges.length > 0 || unavailable) && (
            <div className="eytg-card-badges">
              {unavailable && (
                <span className="eytg-badge eytg-badge-warn">
                  {video.availability === 'not_embeddable' ? 'Embedding off' : video.availability === 'private' ? 'Private' : 'Removed'}
                </span>
              )}
              {badges.map(({ def, text }) =>
                onBadgeClick ? (
                  <button type="button" key={def.key} className="eytg-badge" title={def.label} onClick={() => onBadgeClick(text)}>
                    {text}
                  </button>
                ) : (
                  <span key={def.key} className="eytg-badge" title={def.label}>
                    {text}
                  </span>
                ),
              )}
            </div>
          )}
          {showDescription && video.description && <p className="eytg-card-desc">{video.description}</p>}
        </div>

        <div className="eytg-card-actions">
          {onToggleFavorite && (
            <button
              type="button"
              className={`eytg-icon-btn${isFavorite ? ' eytg-on' : ''}`}
              onClick={() => onToggleFavorite(videoId)}
              aria-pressed={isFavorite}
              aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
              title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
            >
              <Star size={15} fill={isFavorite ? 'currentColor' : 'none'} />
            </button>
          )}
          {showQueueButton && (
            <button
              type="button"
              className="eytg-icon-btn"
              onClick={() => youtubePlayer.addToQueue(toPlayerVideo(video))}
              disabled={isPlaying || isQueued}
              aria-label="Add to queue"
              title={isQueued ? 'Already queued' : 'Add to queue'}
            >
              <ListPlus size={15} />
            </button>
          )}
          {(transcriptUrl || fetchTranscript) && (
            <YouTubeTranscriptModal
              videoId={videoId}
              title={title}
              transcriptUrl={transcriptUrl}
              fetchTranscript={fetchTranscript as YouTubeTranscriptModalProps['fetchTranscript']}
            />
          )}
          {showYouTubeLink && (
            <a
              className="eytg-icon-btn"
              href={`https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}`}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Open on YouTube"
              title="Open on YouTube"
            >
              <ExternalLink size={15} />
            </a>
          )}
          <span className="eytg-spacer" />
          {renderActions?.(video)}
          {isHidden
            ? onUnhide && (
                <button type="button" className="eytg-icon-btn" onClick={() => onUnhide(videoId)} aria-label="Unhide" title="Unhide">
                  <Eye size={15} />
                </button>
              )
            : onHide && (
                <button type="button" className="eytg-icon-btn" onClick={() => setConfirmHide(true)} aria-label="Hide" title="Hide">
                  <EyeOff size={15} />
                </button>
              )}
        </div>
      </article>
      {confirmHide && onHide && (
        <HideConfirm
          title={title}
          onCancel={() => setConfirmHide(false)}
          onConfirm={() => {
            setConfirmHide(false);
            onHide(videoId);
          }}
        />
      )}
    </GridStylesProvider>
  );
}

/**
 * Memoised: a grid re-renders on every keystroke in a search box and every
 * page appended by infinite scroll, and cards whose props did not change
 * should not re-render with it.
 */
export const VideoCard = memo(VideoCardComponent);
