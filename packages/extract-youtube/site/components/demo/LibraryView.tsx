/**
 * The viewer's side of the library: the grid and the list, both fed by
 * `useVideoLibrary()` from the library API.
 *
 * What is on show:
 * - search, category filter and sort, which are server-side query params;
 * - stacked playlists: the two 3Blue1Brown chapters link to each other, so
 *   they fold into one card with `<` / `>` arrows;
 * - favorites and hidden videos, kept per viewer in localStorage;
 * - custom fields (`speaker`, `level`, …) as card badges and list columns,
 *   and a click on a badge searches for it;
 * - `groupBy` on the list: a tree by year, channel, category or any custom
 *   field, with L1…Ln buttons to collapse it to a level;
 * - "Play all", which queues the visible videos in the floating player.
 */
import { createLibraryClient, groupByCustomField, type LibrarySort, type VideoGrouper } from 'extract-youtube/library';
import { VideoGrid, VideoList, toPlayerVideo, useVideoLibrary, youtubePlayer, type BuiltInGrouping } from 'extract-youtube/react';
import { useEffect, useMemo, useState } from 'react';

import { DEMO_FIELDS } from './demo-data';
import { useStoredSet } from './useStoredSet';

// One client for the page. Reads need no token.
const client = createLibraryClient({ baseUrl: '/api/library' });

const GROUPINGS: Record<string, { label: string; groupBy: ReadonlyArray<BuiltInGrouping | VideoGrouper> }> = {
  none: { label: 'No grouping', groupBy: [] },
  year: { label: 'Year', groupBy: ['year'] },
  'year-channel': { label: 'Year, then channel', groupBy: ['year', 'channel'] },
  category: { label: 'Category', groupBy: ['category'] },
  'category-level': { label: 'Category, then level', groupBy: ['category', groupByCustomField('level', { skipEmpty: true })] },
  speaker: { label: 'Speaker (custom field)', groupBy: [groupByCustomField('speaker')] },
};

export function LibraryView() {
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [input, setInput] = useState('');
  const [q, setQ] = useState('');
  const [category, setCategory] = useState('');
  const [sort, setSort] = useState<LibrarySort>('published');
  const [grouping, setGrouping] = useState('year');
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [showHidden, setShowHidden] = useState(false);
  const [categories, setCategories] = useState<string[]>([]);
  const favorites = useStoredSet('extract-youtube-demo:favorites');
  const hidden = useStoredSet('extract-youtube-demo:hidden');

  useEffect(() => {
    const timer = setTimeout(() => setQ(input.trim()), 250);
    return () => clearTimeout(timer);
  }, [input]);

  useEffect(() => {
    client.categories().then(setCategories).catch(() => setCategories([]));
  }, []);

  // `availability: 'available'` keeps videos YouTube no longer plays out of the
  // public grid; they stay listed on the Admin tab for someone to deal with.
  const query = useMemo(
    () => ({ q: q || null, category: category || null, availability: 'available' as const, sort, limit: 100 }),
    [q, category, sort],
  );
  const { videos, stacks, loading, error } = useVideoLibrary(client, query);

  const visible = useMemo(
    () =>
      videos.filter(
        (video) => (showHidden || !hidden.ids.includes(video.videoId)) && (!favoritesOnly || favorites.ids.includes(video.videoId)),
      ),
    [videos, showHidden, hidden.ids, favoritesOnly, favorites.ids],
  );

  const playAll = () => {
    const [first, ...rest] = visible;
    if (!first) return;
    youtubePlayer.play(toPlayerVideo(first));
    youtubePlayer.setQueue(rest.map(toPlayerVideo));
  };

  const actions = {
    favorites: favorites.ids,
    hidden: hidden.ids,
    onToggleFavorite: favorites.toggle,
    onHide: hidden.add,
    onUnhide: hidden.remove,
    onBadgeClick: (text: string) => setInput(text),
    customFields: DEMO_FIELDS,
    transcriptUrl: '/api/transcript',
    showQueueButton: true,
    showYouTubeLink: true,
  };

  const empty = loading ? 'Loading…' : favoritesOnly ? 'No favorites match. Star a video to add it.' : 'No videos match.';

  return (
    <>
      <div className="toolbar">
        <div className="segmented" role="group" aria-label="Layout">
          <button type="button" aria-pressed={view === 'grid'} onClick={() => setView('grid')}>
            Grid
          </button>
          <button type="button" aria-pressed={view === 'list'} onClick={() => setView('list')}>
            List
          </button>
        </div>
        <input type="search" value={input} onChange={(event) => setInput(event.target.value)} placeholder="Search titles, channels, tags, speakers…" aria-label="Search the library" />
        <select value={category} onChange={(event) => setCategory(event.target.value)} aria-label="Category">
          <option value="">All categories</option>
          {categories.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
        <select value={sort} onChange={(event) => setSort(event.target.value as LibrarySort)} aria-label="Sort by">
          <option value="published">Newest</option>
          <option value="views">Most viewed</option>
          <option value="title">Title</option>
          <option value="channel">Channel</option>
          <option value="updated">Recently edited</option>
        </select>
        {view === 'list' && (
          <select value={grouping} onChange={(event) => setGrouping(event.target.value)} aria-label="Group by">
            {Object.entries(GROUPINGS).map(([key, option]) => (
              <option key={key} value={key}>
                {option.label}
              </option>
            ))}
          </select>
        )}
        <button type="button" aria-pressed={favoritesOnly} onClick={() => setFavoritesOnly((on) => !on)}>
          {`Favorites (${favorites.ids.length})`}
        </button>
        {hidden.ids.length > 0 && (
          <button type="button" aria-pressed={showHidden} onClick={() => setShowHidden((on) => !on)}>
            {`Hidden (${hidden.ids.length})`}
          </button>
        )}
        <button type="button" onClick={playAll} disabled={visible.length === 0}>
          Play all
        </button>
      </div>

      {error && <p className="error">{`Could not load the library: ${error}`}</p>}

      {view === 'grid' ? (
        <VideoGrid videos={visible} stacks={stacks} emptyState={empty} {...actions} />
      ) : (
        // Keyed by grouping so switching it resets the collapsed groups.
        <VideoList key={grouping} videos={visible} stacks={stacks} groupBy={GROUPINGS[grouping].groupBy} emptyState={empty} {...actions} />
      )}
    </>
  );
}
