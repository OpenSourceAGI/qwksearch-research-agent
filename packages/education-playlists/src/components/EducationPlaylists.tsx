/**
 * @fileoverview The Education Playlists widget: browse playlists by category,
 * major and program; open one to work through it at your own pace; keep your
 * own; or plan a custom one with the AI planner.
 *
 * `compact` is the homepage card: a single row of playlists that expands in
 * place into the full widget, like the trending-news card beside it. Without
 * `compact` it is the full-page view.
 */
import React, { useEffect, useMemo, useState } from 'react';
import type { EducationCatalog, Playlist } from '../types';
import { filterPlaylists, getDefaultCatalog } from '../catalog';
import { createProgressStore, toggleDone } from '../lib/progress';
import { createLocalPlaylistStore, createPlaylist } from '../lib/playlists';
import { decodeShareFragment } from '../lib/sharing';
import { formatMinutes, playlistTime } from '../lib/time';
import type { PlanResult } from '../planner';
import type { QuizGenerator } from '../quiz';
import { PlaylistView } from './PlaylistView';
import { PlaylistPlanner } from './PlaylistPlanner';
import { s } from './styles';

export interface EducationPlaylistsProps {
  className?: string;
  style?: React.CSSProperties;
  /** The homepage card: one row of playlists that expands in place. */
  compact?: boolean;
  /** Catalog to browse; defaults to the bundled MIT OpenCourseWare seed. */
  catalog?: EducationCatalog;
  /**
   * The host's planner endpoint (see `education-playlists/server`). Without
   * one the planner runs locally: standard questions, catalog keyword search.
   */
  planEndpoint?: string;
  /** Full-page view to link to from the compact card, e.g. `/learn`. */
  openHref?: string;
  /** Page a share link opens; defaults to `openHref`, then the current page. */
  shareBaseHref?: string;
  /** Open a playlist carried in the page's `#playlist=` fragment. */
  importFromHash?: boolean;
  /** Signed-in user, recorded as the owner of playlists they create. */
  userId?: string;
  /** Turns on "Quiz me" for each item (NotebookLM or another quiz source). */
  quizGenerator?: QuizGenerator;
}

type Tab = 'browse' | 'mine' | 'plan';
type Source = 'preset' | 'mine' | 'shared' | 'planned';

interface OpenPlaylist {
  playlist: Playlist;
  source: Source;
  plan?: Pick<PlanResult, 'searches' | 'mode' | 'minutesPerWeek'>;
}

function ChevronIcon({ up }: { up?: boolean }) {
  return (
    <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ transform: up ? 'rotate(180deg)' : undefined, transition: 'transform 150ms ease' }}>
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

function PlaylistCard({ playlist, done, onOpen, compact }: { playlist: Playlist; done: ReadonlySet<string>; onOpen: () => void; compact?: boolean }) {
  const time = playlistTime(playlist, done);
  return (
    <button type="button" style={compact ? s.compactCard : s.card} onClick={onOpen}>
      <span style={{ ...s.title, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: compact ? 'nowrap' : undefined }}>{playlist.title}</span>
      {!compact && playlist.description && <span style={s.muted}>{playlist.description}</span>}
      <span style={s.muted}>
        {time.itemCount} items · ~{formatMinutes(time.totalMinutes)}
        {time.percent > 0 ? ` · ${time.percent}% done` : ''}
      </span>
      {time.percent > 0 && (
        <span style={s.bar}>
          <span style={{ ...s.barFill, display: 'block', width: `${time.percent}%` }} />
        </span>
      )}
    </button>
  );
}

export function EducationPlaylists({
  className,
  style,
  compact = false,
  catalog: catalogProp,
  planEndpoint,
  openHref,
  shareBaseHref,
  importFromHash = false,
  userId,
  quizGenerator,
}: EducationPlaylistsProps) {
  const catalog = useMemo(() => catalogProp ?? getDefaultCatalog(), [catalogProp]);
  const progressStore = useMemo(() => createProgressStore(), []);
  const playlistStore = useMemo(() => createLocalPlaylistStore(), []);

  const [expanded, setExpanded] = useState(!compact);
  const [tab, setTab] = useState<Tab>('browse');
  const [done, setDone] = useState<Set<string>>(() => new Set());
  const [mine, setMine] = useState<Playlist[]>([]);
  const [categoryId, setCategoryId] = useState<string | undefined>();
  const [majorId, setMajorId] = useState<string | undefined>();
  const [programId, setProgramId] = useState<string | undefined>();
  const [open, setOpen] = useState<OpenPlaylist | null>(null);

  // Storage is read after mount so the server render and the first client
  // render agree; progress then fills in.
  useEffect(() => {
    setDone(progressStore.load());
    setMine(playlistStore.list());
  }, [progressStore, playlistStore]);

  useEffect(() => {
    if (!importFromHash || typeof window === 'undefined') return;
    const shared = decodeShareFragment(window.location.hash);
    if (shared) {
      setExpanded(true);
      setOpen({ playlist: shared, source: 'shared' });
    }
  }, [importFromHash]);

  const category = catalog.categories.find((c) => c.id === categoryId);
  const major = category?.majors.find((m) => m.id === majorId);
  const visible = filterPlaylists(catalog.playlists, { categoryId, majorId, programId });

  const toggle = (itemId: string) => {
    setDone((prev) => {
      const next = toggleDone(prev, itemId);
      progressStore.save(next);
      return next;
    });
  };

  const saveMine = (playlist: Playlist) => {
    setMine(playlistStore.save({ ...playlist, updatedAt: new Date().toISOString() }));
    setOpen((current) => (current?.playlist.id === playlist.id ? { ...current, playlist } : current));
  };

  const saveCopy = (playlist: Playlist) => {
    const copy = createPlaylist({
      title: playlist.title,
      description: playlist.description,
      items: playlist.items,
      ownerId: userId,
      plannedFrom: playlist.plannedFrom,
    });
    setMine(playlistStore.save(copy));
    setOpen({ playlist: copy, source: 'mine' });
    setTab('mine');
  };

  const deleteMine = (id: string) => {
    setMine(playlistStore.remove(id));
    setOpen(null);
  };

  const openPlaylist = (playlist: Playlist, source: Source) => {
    setExpanded(true);
    setOpen({ playlist, source });
  };

  const shareBase = shareBaseHref ?? (openHref && typeof window !== 'undefined' ? new URL(openHref, window.location.href).toString() : undefined);

  const header = (
    <div style={s.headerRow}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, minWidth: 0 }}>
        <span style={s.label}>Learn</span>
        <span style={{ ...s.muted, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {catalog.playlists.length} playlists · MIT OpenCourseWare
        </span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        {compact && !expanded && (
          <button
            type="button"
            style={s.chip}
            onClick={() => {
              setExpanded(true);
              setTab('plan');
              setOpen(null);
            }}
          >
            Plan my own
          </button>
        )}
        {compact && openHref && expanded && (
          <a href={openHref} style={{ ...s.chip, textDecoration: 'none' }}>
            Open full page
          </a>
        )}
        {compact && (
          <button type="button" style={s.iconButton} onClick={() => setExpanded((v) => !v)} aria-expanded={expanded} aria-label={expanded ? 'Collapse education playlists' : 'Expand education playlists'}>
            <ChevronIcon up={expanded} />
          </button>
        )}
      </div>
    </div>
  );

  if (compact && !expanded) {
    return (
      <section className={className} style={{ ...s.root, ...style }} aria-label="Education playlists">
        {header}
        <div style={s.scrollRow}>
          {[...mine, ...catalog.playlists].map((playlist) => (
            <PlaylistCard key={playlist.id} playlist={playlist} done={done} compact onOpen={() => openPlaylist(playlist, playlist.visibility === 'preset' ? 'preset' : 'mine')} />
          ))}
        </div>
      </section>
    );
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: 'browse', label: 'Browse' },
    { id: 'mine', label: `My playlists${mine.length ? ` (${mine.length})` : ''}` },
    { id: 'plan', label: 'Plan with AI' },
  ];

  let body: React.ReactNode;
  if (open) {
    const editable = open.source === 'mine';
    body = (
      <div style={s.section}>
        <div style={s.row}>
          <button type="button" style={s.button} onClick={() => setOpen(null)}>
            ← Back
          </button>
          {open.source === 'shared' && <span style={s.muted}>Shared with you by link</span>}
          {open.source === 'planned' && open.plan && (
            <span style={s.muted}>
              {open.plan.mode === 'llm' ? 'Planned by AI' : 'Planned from the catalog (AI not connected)'} from: {open.plan.searches.join(' · ')}
            </span>
          )}
          {editable && (
            <button type="button" style={s.button} onClick={() => deleteMine(open.playlist.id)}>
              Delete
            </button>
          )}
        </div>
        <PlaylistView
          playlist={open.playlist}
          done={done}
          onToggle={toggle}
          onChange={editable ? saveMine : undefined}
          onSaveCopy={editable ? undefined : saveCopy}
          minutesPerWeek={open.plan?.minutesPerWeek}
          shareBaseHref={shareBase}
          quizGenerator={quizGenerator}
        />
      </div>
    );
  } else if (tab === 'browse') {
    body = (
      <div style={s.section}>
        <div style={s.row}>
          <button type="button" style={{ ...s.chip, ...(!categoryId ? s.chipActive : null) }} onClick={() => { setCategoryId(undefined); setMajorId(undefined); setProgramId(undefined); }}>
            All
          </button>
          {catalog.categories.map((c) => (
            <button key={c.id} type="button" style={{ ...s.chip, ...(categoryId === c.id ? s.chipActive : null) }} aria-pressed={categoryId === c.id} onClick={() => { setCategoryId(c.id); setMajorId(undefined); setProgramId(undefined); }}>
              {c.name}
            </button>
          ))}
        </div>
        {category && (
          <div style={s.row}>
            <span style={s.muted}>Major:</span>
            {category.majors.map((m) => (
              <button key={m.id} type="button" style={{ ...s.chip, ...(majorId === m.id ? s.chipActive : null) }} aria-pressed={majorId === m.id} onClick={() => { setMajorId(majorId === m.id ? undefined : m.id); setProgramId(undefined); }}>
                {m.name}
              </button>
            ))}
          </div>
        )}
        {major && major.programs.length > 1 && (
          <div style={s.row}>
            <span style={s.muted}>Program:</span>
            {major.programs.map((p) => (
              <button key={p.id} type="button" style={{ ...s.chip, ...(programId === p.id ? s.chipActive : null) }} aria-pressed={programId === p.id} onClick={() => setProgramId(programId === p.id ? undefined : p.id)}>
                {p.name}
              </button>
            ))}
          </div>
        )}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 6 }}>
          {visible.map((playlist) => (
            <PlaylistCard key={playlist.id} playlist={playlist} done={done} onOpen={() => openPlaylist(playlist, 'preset')} />
          ))}
        </div>
      </div>
    );
  } else if (tab === 'mine') {
    body = mine.length ? (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 6 }}>
        {mine.map((playlist) => (
          <PlaylistCard key={playlist.id} playlist={playlist} done={done} onOpen={() => openPlaylist(playlist, 'mine')} />
        ))}
      </div>
    ) : (
      <div style={s.muted}>Nothing saved yet. Save a preset playlist, or plan your own with AI.</div>
    );
  } else {
    body = <PlaylistPlanner planEndpoint={planEndpoint} onPlanned={(result) => setOpen({ playlist: result.playlist, source: 'planned', plan: result })} />;
  }

  return (
    <section className={className} style={{ ...s.root, ...style }} aria-label="Education playlists">
      {header}
      {!open && (
        <div style={s.row} role="tablist">
          {tabs.map((t) => (
            <button key={t.id} type="button" role="tab" aria-selected={tab === t.id} style={{ ...s.chip, ...(tab === t.id ? s.chipActive : null) }} onClick={() => setTab(t.id)}>
              {t.label}
            </button>
          ))}
        </div>
      )}
      {body}
    </section>
  );
}
