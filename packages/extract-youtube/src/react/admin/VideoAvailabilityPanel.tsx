/**
 * @fileoverview The videos YouTube no longer serves — deleted, made private,
 * or with embedding turned off — as found by the last resync.
 *
 * Ported from the availability half of debate-ai.com's `VideoReportsPanel`:
 * takedowns become something an admin sees and acts on, rather than something
 * a viewer discovers by clicking a card that plays nothing. A private upload
 * can be made public again and an embed restriction lifted, so "Mark
 * available" clears the flag without waiting for the next resync.
 */

'use client';

import { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, ExternalLink, Loader2, RefreshCw, Trash2 } from 'lucide-react';

import type { VideoLibraryClient } from '../../library/client';
import type { LibraryVideo, VideoAvailability } from '../../library/types';
import { formatVideoDate } from '../grid/format';
import { GridStylesProvider } from '../grid/styles';

export interface VideoAvailabilityPanelProps {
  client: VideoLibraryClient;
  /** Most rows to list. Default 100. */
  limit?: number;
  /** Called after a video is cleared or removed. */
  onChange?: () => void;
  className?: string;
}

const LABELS: Record<Exclude<VideoAvailability, 'available'>, { text: string; tone: string; hint: string }> = {
  private: { text: 'Private', tone: 'eytg-badge-warn', hint: 'The uploader made it private. It may come back.' },
  not_embeddable: { text: 'Embedding off', tone: 'eytg-badge-warn', hint: 'Still on YouTube, but it will not play inside your site.' },
  removed: { text: 'Removed', tone: 'eytg-badge-danger', hint: 'Deleted or rejected. This is permanent.' },
};

export function VideoAvailabilityPanel({ client, limit = 100, onChange, className }: VideoAvailabilityPanelProps) {
  const [videos, setVideos] = useState<LibraryVideo[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setError(null);
    client
      .unavailable(limit)
      .then(setVideos)
      .catch((err) => setError(err instanceof Error ? err.message : String(err)));
  }, [client, limit]);

  useEffect(load, [load]);

  const act = async (videoId: string, job: () => Promise<unknown>) => {
    setBusy(videoId);
    setError(null);
    try {
      await job();
      setVideos((prev) => prev?.filter((video) => video.videoId !== videoId) ?? null);
      onChange?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(null);
    }
  };

  return (
    <GridStylesProvider>
      <section className={`eytg-root eytg-admin${className ? ` ${className}` : ''}`} aria-label="Unavailable videos">
        <div className="eytg-toolbar">
          <strong style={{ flex: 1 }}>Unavailable on YouTube{videos ? ` (${videos.length})` : ''}</strong>
          <button type="button" className="eytg-btn" onClick={load}>
            <RefreshCw size={14} /> Reload
          </button>
        </div>
        {error && <div className="eytg-banner eytg-banner-error" role="alert">{error}</div>}
        {videos === null ? (
          <div className="eytg-empty">
            <Loader2 size={16} className="eytg-spin" />
          </div>
        ) : videos.length === 0 ? (
          <div className="eytg-empty">Every video in the library is playable. Run a resync to re-check.</div>
        ) : (
          <div className="eytg-table-wrap">
            <table className="eytg-table">
              <colgroup>
                <col />
                <col style={{ width: 140 }} />
                <col style={{ width: 120 }} />
                <col style={{ width: 200 }} />
              </colgroup>
              <thead>
                <tr>
                  <th>Video</th>
                  <th>Status</th>
                  <th>Checked</th>
                  <th aria-label="Actions" />
                </tr>
              </thead>
              <tbody>
                {videos.map((video) => {
                  const label = LABELS[video.availability as keyof typeof LABELS] ?? LABELS.removed;
                  return (
                    <tr key={video.videoId}>
                      <td>
                        <div className="eytg-row-text">
                          <strong>{video.title || video.videoId}</strong>
                          <span>{video.channel}</span>
                        </div>
                      </td>
                      <td>
                        <span className={`eytg-badge ${label.tone}`} title={label.hint}>
                          {label.text}
                        </span>
                      </td>
                      <td>{formatVideoDate(video.updatedAt, true)}</td>
                      <td>
                        <div className="eytg-row-actions">
                          <a
                            className="eytg-icon-btn"
                            href={`https://www.youtube.com/watch?v=${encodeURIComponent(video.videoId)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label="Check on YouTube"
                            title="Check on YouTube"
                          >
                            <ExternalLink size={14} />
                          </a>
                          <button
                            type="button"
                            className="eytg-btn"
                            disabled={busy !== null}
                            onClick={() => act(video.videoId, () => client.markAvailable(video.videoId))}
                          >
                            {busy === video.videoId ? <Loader2 size={14} className="eytg-spin" /> : <CheckCircle2 size={14} />} Mark available
                          </button>
                          <button
                            type="button"
                            className="eytg-icon-btn eytg-btn-danger"
                            disabled={busy !== null}
                            onClick={() => act(video.videoId, () => client.remove(video.videoId))}
                            aria-label="Remove from the library"
                            title="Remove from the library"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </GridStylesProvider>
  );
}
