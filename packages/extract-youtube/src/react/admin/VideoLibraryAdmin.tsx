/**
 * @fileoverview The admin library browser: search, filter, sort and page every
 * video in the library; add, edit, feature, hide or remove one; and run the
 * whole-library maintenance jobs (YouTube resync, stack recompute).
 *
 * Ported from debate-ai.com's `VideoLibraryTable`. Its style/source/transcript
 * filters were debate-specific; here the filters are category, availability
 * and "top picks", and the host's custom fields with `showInList` become
 * columns. All I/O goes through a `VideoLibraryClient`, so the same component
 * drives a real API (`createLibraryClient`) or an in-process one
 * (`createLocalLibraryClient`, which is what the Storybook stories use).
 */

'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { ChevronDown, ChevronUp, Layers, Loader2, Pencil, Plus, RefreshCw, Search, Star, Trash2 } from 'lucide-react';

import type { VideoLibraryClient } from '../../library/client';
import {
  VIDEO_AVAILABILITIES,
  type CustomFieldDef,
  type LibrarySort,
  type LibraryVideo,
  type VideoAvailability,
} from '../../library/types';
import { formatCustomCell, formatVideoDate, formatViewCount, thumbnailFor } from '../grid/format';
import { GridStylesProvider } from '../grid/styles';
import { VideoEditDialog } from './VideoEditDialog';

export interface VideoLibraryAdminProps {
  client: VideoLibraryClient;
  /**
   * The host's custom fields. Omit to load them from the API's `/fields`
   * route, which serves whatever the handler was configured with.
   */
  customFields?: readonly CustomFieldDef[];
  /** Rows per page. Default 25. */
  pageSize?: number;
  /** Hide the resync / recompute buttons (e.g. for editors who aren't admins). */
  hideMaintenance?: boolean;
  /** Called after any successful write — to refresh a public grid elsewhere on the page. */
  onChange?: () => void;
  className?: string;
}

const AVAILABILITY_BADGE: Record<VideoAvailability, { label: string; tone: string }> = {
  available: { label: 'Available', tone: 'eytg-badge-ok' },
  private: { label: 'Private', tone: 'eytg-badge-warn' },
  not_embeddable: { label: 'No embed', tone: 'eytg-badge-warn' },
  removed: { label: 'Removed', tone: 'eytg-badge-danger' },
};

const SORTABLE: { key: LibrarySort; label: string; numeric?: boolean }[] = [
  { key: 'title', label: 'Video' },
  { key: 'published', label: 'Published' },
  { key: 'views', label: 'Views', numeric: true },
];

export function VideoLibraryAdmin({
  client,
  customFields: customFieldsProp,
  pageSize = 25,
  hideMaintenance = false,
  onChange,
  className,
}: VideoLibraryAdminProps) {
  const [q, setQ] = useState('');
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [availability, setAvailability] = useState<VideoAvailability | ''>('');
  const [featuredOnly, setFeaturedOnly] = useState(false);
  const [sort, setSort] = useState<LibrarySort>('published');
  const [dir, setDir] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);

  const [rows, setRows] = useState<LibraryVideo[]>([]);
  const [total, setTotal] = useState(0);
  const [pageCount, setPageCount] = useState(1);
  const [categories, setCategories] = useState<string[]>([]);
  const [loadedFields, setLoadedFields] = useState<CustomFieldDef[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [editing, setEditing] = useState<LibraryVideo | 'new' | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<LibraryVideo | null>(null);
  const [nonce, setNonce] = useState(0);
  // `null` until the server answers; resync stays clickable if it never does.
  const [resync, setResync] = useState<{ configured: boolean; quotaCost: number } | null>(null);

  const customFields = customFieldsProp ?? loadedFields;
  const listColumns = useMemo(() => customFields.filter((def) => def.showInList), [customFields]);

  // Debounce the search box: the listing is a server round trip per keystroke otherwise.
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(q);
      setPage(1);
    }, 250);
    return () => clearTimeout(timer);
  }, [q]);

  useEffect(() => {
    if (customFieldsProp) return;
    client.fields().then(setLoadedFields).catch(() => setLoadedFields([]));
  }, [client, customFieldsProp]);

  useEffect(() => {
    client.categories().then(setCategories).catch(() => undefined);
  }, [client, nonce]);

  useEffect(() => {
    if (hideMaintenance) return;
    client
      .resyncStatus()
      .then((status) => setResync({ configured: status.configured, quotaCost: status.quotaCost }))
      .catch(() => setResync(null));
  }, [client, hideMaintenance, nonce]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    client
      .list({
        q: search || null,
        category: category || null,
        availability: availability || null,
        featured: featuredOnly || null,
        includeHidden: true,
        sort,
        dir,
        page,
        limit: pageSize,
      })
      .then((result) => {
        if (cancelled) return;
        setRows(result.videos);
        setTotal(result.total);
        setPageCount(result.pageCount);
        if (result.page !== page) setPage(result.page);
        setError(null);
      })
      .catch((err) => !cancelled && setError(err instanceof Error ? err.message : String(err)))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [client, search, category, availability, featuredOnly, sort, dir, page, pageSize, nonce]);

  const refresh = useCallback(() => {
    setNonce((n) => n + 1);
    onChange?.();
  }, [onChange]);

  const run = async (label: string, job: () => Promise<string>) => {
    setBusy(label);
    setError(null);
    setNotice(null);
    try {
      setNotice(await job());
      refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(null);
    }
  };

  const toggleSort = (key: LibrarySort) => {
    if (sort === key) setDir(dir === 'asc' ? 'desc' : 'asc');
    else {
      setSort(key);
      setDir(key === 'title' ? 'asc' : 'desc');
    }
    setPage(1);
  };

  const quickToggle = (video: LibraryVideo, field: 'featured' | 'hidden') =>
    run(`${field}-${video.videoId}`, async () => {
      await client.update(video.videoId, { [field]: !video[field] });
      return `${video.title}: ${field === 'featured' ? (video.featured ? 'no longer a top pick' : 'marked as a top pick') : video.hidden ? 'visible again' : 'hidden'}.`;
    });

  return (
    <GridStylesProvider>
      <div className={`eytg-root eytg-admin${className ? ` ${className}` : ''}`}>
        <div className="eytg-toolbar">
          <label className="eytg-grow" style={{ position: 'relative', display: 'flex' }}>
            <Search size={14} style={{ position: 'absolute', left: 10, top: 9, color: 'var(--eytg-muted)' }} aria-hidden="true" />
            <input
              className="eytg-input"
              style={{ paddingLeft: 30, width: '100%' }}
              type="search"
              placeholder="Search title, channel, description, id…"
              value={q}
              onChange={(event) => setQ(event.target.value)}
              aria-label="Search the library"
            />
          </label>
          <select
            className="eytg-select"
            value={category}
            onChange={(event) => {
              setCategory(event.target.value);
              setPage(1);
            }}
            aria-label="Category"
          >
            <option value="">All categories</option>
            {categories.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
          <select
            className="eytg-select"
            value={availability}
            onChange={(event) => {
              setAvailability(event.target.value as VideoAvailability | '');
              setPage(1);
            }}
            aria-label="Availability"
          >
            <option value="">Any availability</option>
            {VIDEO_AVAILABILITIES.map((value) => (
              <option key={value} value={value}>
                {AVAILABILITY_BADGE[value].label}
              </option>
            ))}
          </select>
          <label className="eytg-check">
            <input
              type="checkbox"
              checked={featuredOnly}
              onChange={(event) => {
                setFeaturedOnly(event.target.checked);
                setPage(1);
              }}
            />
            Top picks
          </label>
          <button type="button" className="eytg-btn eytg-btn-primary" onClick={() => setEditing('new')}>
            <Plus size={14} /> Add video
          </button>
        </div>

        {!hideMaintenance && (
          <div className="eytg-toolbar">
            <button
              type="button"
              className="eytg-btn"
              disabled={busy !== null || resync?.configured === false}
              onClick={() =>
                run('resync', async () => {
                  const result = await client.resync();
                  return `Checked ${result.videosChecked} videos: ${result.viewCountsUpdated} view counts and ${result.availabilityChanged} availability changes updated.`;
                })
              }
              title={
                resync?.configured === false
                  ? 'Needs a YouTube Data API key on the server (youtubeApiKey)'
                  : `Refresh view counts and takedown status from the YouTube Data API${resync ? ` (about ${resync.quotaCost} quota units)` : ''}`
              }
            >
              {busy === 'resync' ? <Loader2 size={14} className="eytg-spin" /> : <RefreshCw size={14} />} Resync from YouTube
            </button>
            <button
              type="button"
              className="eytg-btn"
              disabled={busy !== null}
              onClick={() =>
                run('stacks', async () => {
                  const { moved } = await client.recomputeStacks();
                  return moved === 0 ? 'Stacks are up to date.' : `Re-stacked ${moved} video${moved === 1 ? '' : 's'}.`;
                })
              }
              title="Rebuild stacked playlists from the links in descriptions"
            >
              {busy === 'stacks' ? <Loader2 size={14} className="eytg-spin" /> : <Layers size={14} />} Recompute stacks
            </button>
            <span style={{ color: 'var(--eytg-muted)', fontSize: 12 }}>
              {total} video{total === 1 ? '' : 's'}
            </span>
          </div>
        )}

        {error && <div className="eytg-banner eytg-banner-error" role="alert">{error}</div>}
        {notice && <div className="eytg-banner eytg-banner-ok" role="status">{notice}</div>}

        <div className="eytg-table-wrap">
          <table className="eytg-table">
            <colgroup>
              <col style={{ width: 360 }} />
              <col style={{ width: 130 }} />
              <col style={{ width: 110 }} />
              <col style={{ width: 80 }} />
              {listColumns.map((def) => (
                <col key={def.key} style={{ width: 130 }} />
              ))}
              <col style={{ width: 110 }} />
              <col style={{ width: 150 }} />
            </colgroup>
            <thead>
              <tr>
                {SORTABLE.slice(0, 1).map((column) => (
                  <SortHeader key={column.key} column={column} sort={sort} dir={dir} onSort={toggleSort} />
                ))}
                <th>Category</th>
                {SORTABLE.slice(1).map((column) => (
                  <SortHeader key={column.key} column={column} sort={sort} dir={dir} onSort={toggleSort} />
                ))}
                {listColumns.map((def) => (
                  <th key={def.key}>{def.label}</th>
                ))}
                <th>Status</th>
                <th aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {loading && rows.length === 0 ? (
                <tr>
                  <td colSpan={6 + listColumns.length} style={{ textAlign: 'center', padding: 24 }}>
                    <Loader2 size={16} className="eytg-spin" />
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={6 + listColumns.length} style={{ textAlign: 'center', padding: 24, color: 'var(--eytg-muted)' }}>
                    No videos match.
                  </td>
                </tr>
              ) : (
                rows.map((video) => (
                  <tr key={video.videoId} style={{ opacity: loading ? 0.6 : video.hidden ? 0.7 : 1 }}>
                    <td>
                      <div className="eytg-row-title">
                        <img className="eytg-row-thumb" style={{ width: 72 }} src={thumbnailFor(video.videoId)} alt="" loading="lazy" />
                        <div className="eytg-row-text">
                          <strong title={video.title}>{video.title || video.videoId}</strong>
                          <span>
                            {video.channel} · <code>{video.videoId}</code>
                          </span>
                        </div>
                      </div>
                    </td>
                    <td>{video.category ?? ''}</td>
                    <td>{formatVideoDate(video.publishedAt, true)}</td>
                    <td className="eytg-num">{formatViewCount(video.viewCount)}</td>
                    {listColumns.map((def) => (
                      <td key={def.key}>{formatCustomCell(def, video.custom?.[def.key])}</td>
                    ))}
                    <td>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                        <span className={`eytg-badge ${AVAILABILITY_BADGE[video.availability].tone}`}>
                          {AVAILABILITY_BADGE[video.availability].label}
                        </span>
                        {video.hidden && <span className="eytg-badge">Hidden</span>}
                        {video.stackKey && <span className="eytg-badge" title={`Stack ${video.stackKey}`}>Stack {video.stackPosition + 1}</span>}
                      </div>
                    </td>
                    <td>
                      <div className="eytg-row-actions">
                        <button
                          type="button"
                          className={`eytg-icon-btn${video.featured ? ' eytg-on' : ''}`}
                          onClick={() => quickToggle(video, 'featured')}
                          disabled={busy !== null}
                          aria-pressed={video.featured}
                          aria-label={video.featured ? 'Unmark top pick' : 'Mark as top pick'}
                          title={video.featured ? 'Unmark top pick' : 'Mark as top pick'}
                        >
                          <Star size={14} fill={video.featured ? 'currentColor' : 'none'} />
                        </button>
                        <button type="button" className="eytg-icon-btn" onClick={() => setEditing(video)} aria-label="Edit" title="Edit">
                          <Pencil size={14} />
                        </button>
                        <button
                          type="button"
                          className="eytg-icon-btn eytg-btn-danger"
                          onClick={() => setConfirmDelete(video)}
                          aria-label="Remove"
                          title="Remove from the library"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="eytg-pager">
          <span>
            Page {page} of {pageCount}
          </span>
          <div>
            <button type="button" className="eytg-btn" disabled={page <= 1 || loading} onClick={() => setPage(page - 1)}>
              Previous
            </button>
            <button type="button" className="eytg-btn" disabled={page >= pageCount || loading} onClick={() => setPage(page + 1)}>
              Next
            </button>
          </div>
        </div>

        {editing && (
          <VideoEditDialog
            client={client}
            video={editing === 'new' ? null : editing}
            customFields={customFields}
            categories={categories}
            onClose={() => setEditing(null)}
            onSaved={(saved) => {
              setEditing(null);
              setNotice(`Saved “${saved.title}”.`);
              refresh();
            }}
          />
        )}

        {confirmDelete && (
          <div className="eytg-overlay" role="presentation" onClick={() => setConfirmDelete(null)}>
            <div className="eytg-dialog eytg-dialog-sm" role="alertdialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
              <header>
                <h2>Remove this video?</h2>
              </header>
              <div className="eytg-dialog-body">
                <p style={{ margin: 0 }}>
                  <strong>{confirmDelete.title}</strong> will be deleted from the library and excluded from future
                  imports. To show it less prominently instead, hide it.
                </p>
              </div>
              <footer>
                <button type="button" className="eytg-btn" onClick={() => setConfirmDelete(null)}>
                  Cancel
                </button>
                <button
                  type="button"
                  className="eytg-btn eytg-btn-primary"
                  style={{ background: 'var(--eytg-danger)', borderColor: 'var(--eytg-danger)' }}
                  onClick={() => {
                    const target = confirmDelete;
                    setConfirmDelete(null);
                    run(`delete-${target.videoId}`, async () => {
                      await client.remove(target.videoId);
                      return `Removed “${target.title}”.`;
                    });
                  }}
                >
                  Remove
                </button>
              </footer>
            </div>
          </div>
        )}
      </div>
    </GridStylesProvider>
  );
}

function SortHeader({
  column,
  sort,
  dir,
  onSort,
}: {
  column: { key: LibrarySort; label: string; numeric?: boolean };
  sort: LibrarySort;
  dir: 'asc' | 'desc';
  onSort: (key: LibrarySort) => void;
}) {
  const active = sort === column.key;
  return (
    <th className={column.numeric ? 'eytg-num' : undefined} aria-sort={active ? (dir === 'asc' ? 'ascending' : 'descending') : 'none'}>
      <button type="button" className="eytg-th-btn" onClick={() => onSort(column.key)}>
        {column.label}
        {active && (dir === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />)}
      </button>
    </th>
  );
}
