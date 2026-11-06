/**
 * The demo's **YouTube** tab: extract-youtube's own live demo, against the
 * routes in `worker/youtube.ts`, which this site serves at `/api/youtube/*`.
 * Ported from `packages/extract-youtube/site`.
 *
 * - **Library** (`/demo#youtube`): `<VideoGrid />` and `<VideoList />` over
 *   `useVideoLibrary()`, reading the library API at `/api/youtube/library`.
 * - **Admin** (`/demo#youtube-admin`): `<VideoLibraryAdmin />` and
 *   `<VideoAvailabilityPanel />`, writing through the same API.
 * - `<FloatingYouTubePlayer />`, mounted once below, which every Play button
 *   drives through `youtubePlayer`, with captions from `/api/youtube/transcript`.
 *
 * Rendered outside the other tabs' `.epd-demo` wrapper: the package styles its
 * own components, and the PDF demo's element rules (its full-height iframes,
 * for one) would otherwise reach the floating player.
 */
import { FloatingYouTubePlayer } from 'extract-youtube/react';
import { useEffect, useState } from 'react';

import type { YouTubeDemoInfo } from '../../../worker/youtube';
import { AdminView } from './AdminView';
import { LibraryView } from './LibraryView';
import { SpeedButton } from './SpeedButton';

type View = 'library' | 'admin';

const viewFromHash = (): View => (window.location.hash === '#youtube-admin' ? 'admin' : 'library');

export function YouTubeDemo() {
  const [view, setView] = useState<View>(viewFromHash);
  const [info, setInfo] = useState<YouTubeDemoInfo | null>(null);

  useEffect(() => {
    const onHash = () => setView(viewFromHash());
    window.addEventListener('hashchange', onHash);
    fetch('/api/youtube/demo')
      .then((response) => (response.ok ? (response.json() as Promise<YouTubeDemoInfo>) : null))
      .then(setInfo)
      .catch(() => setInfo(null));
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const select = (next: View) => {
    setView(next);
    window.history.replaceState(null, '', next === 'admin' ? '#youtube-admin' : '#youtube');
  };

  return (
    <div className="eyt-demo">
      <section className="page">
        <p className="intro">
          A video library served by extract-youtube's own admin API on this site's server. Browse it as a grid or a
          grouped list, play anything in the floating player with captions synced from{' '}
          <code>/api/youtube/transcript</code>, and edit the catalog on the Admin view.{' '}
          <a href="/docs/youtube">Read the extract-youtube docs</a>.
        </p>

        <div className="subtabs" role="tablist" aria-label="YouTube demo sections">
          <button type="button" role="tab" aria-selected={view === 'library'} onClick={() => select('library')}>
            Library
          </button>
          <button type="button" role="tab" aria-selected={view === 'admin'} onClick={() => select('admin')}>
            Admin
          </button>
        </div>

        {view === 'library' ? <LibraryView /> : <AdminView info={info} />}

        {/*
          Mounted once for the tab. It renders nothing until something calls
          `youtubePlayer.play(...)`. `extraControls` is the seam for
          app-specific chrome; see SpeedButton.tsx.
        */}
        <FloatingYouTubePlayer
          transcriptUrl="/api/youtube/transcript"
          extraControls={({ playbackRate, player }) => <SpeedButton playbackRate={playbackRate} player={player} />}
        />
      </section>
    </div>
  );
}
