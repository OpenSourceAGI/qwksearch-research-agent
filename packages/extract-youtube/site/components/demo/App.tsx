/**
 * The live demo: every piece of extract-youtube on one page, against the
 * API in `worker/api.ts`, which this site's Worker serves at `/api/*`.
 *
 * - **Library** tab: `<VideoGrid />` and `<VideoList />` over
 *   `useVideoLibrary()`, reading the library API at `/api/library`.
 * - **Admin** tab: `<VideoLibraryAdmin />` and `<VideoAvailabilityPanel />`,
 *   the custom admin screens, writing through the same API.
 * - `<FloatingYouTubePlayer />`, mounted once below, which every Play button
 *   drives through `youtubePlayer`, with captions from `/api/transcript`.
 * - The Storybook, one story per component, served by this same deploy at
 *   `/storybook/`.
 */
import { FloatingYouTubePlayer } from 'extract-youtube/react';
import { useEffect, useState } from 'react';

import type { DemoInfo } from '../../worker/api';
import { AdminView } from './AdminView';
import { LibraryView } from './LibraryView';
import { LINKS } from './links';
import { SpeedButton } from './SpeedButton';

type Tab = 'library' | 'admin';

function tabFromHash(): Tab {
  return typeof window !== 'undefined' && window.location.hash === '#admin' ? 'admin' : 'library';
}

export function App() {
  const [tab, setTab] = useState<Tab>(tabFromHash);
  const [info, setInfo] = useState<DemoInfo | null>(null);

  useEffect(() => {
    const onHash = () => setTab(tabFromHash());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  useEffect(() => {
    fetch('/api/demo')
      .then((response) => (response.ok ? (response.json() as Promise<DemoInfo>) : null))
      .then(setInfo)
      .catch(() => setInfo(null));
  }, []);

  const select = (next: Tab) => {
    setTab(next);
    window.history.replaceState(null, '', next === 'admin' ? '#admin' : window.location.pathname);
  };

  return (
    <main className="page">
      <header className="header">
        <div>
          <h1>extract-youtube live demo</h1>
          <p>
            A video library served by the package's own admin API on a Cloudflare Worker. Browse it as a grid
            or a grouped list, play anything in the floating player with synced captions, and edit the
            catalog on the Admin tab. Every component on this page also has a story in the Storybook.
          </p>
        </div>
        <nav aria-label="Project links">
          <a href={LINKS.storybook}>Storybook</a>
          <a href={LINKS.docs}>Docs</a>
          <a href={LINKS.npm}>npm</a>
          <a href={LINKS.github}>GitHub</a>
        </nav>
      </header>

      <div className="tabs" role="tablist" aria-label="Demo sections">
        <button type="button" role="tab" aria-selected={tab === 'library'} onClick={() => select('library')}>
          Library
        </button>
        <button type="button" role="tab" aria-selected={tab === 'admin'} onClick={() => select('admin')}>
          Admin
        </button>
      </div>

      {tab === 'library' ? <LibraryView /> : <AdminView info={info} />}

      {/*
        Mounted once for the whole app. It renders nothing until something calls
        `youtubePlayer.play(...)`, so it is safe to leave at the root of a layout.
        `extraControls` is the seam for app-specific chrome; see SpeedButton.tsx.
      */}
      <FloatingYouTubePlayer
        transcriptUrl="/api/transcript"
        extraControls={({ playbackRate, player }) => <SpeedButton playbackRate={playbackRate} player={player} />}
      />
    </main>
  );
}
