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
import { canEdit, decodeShareFragment } from '../lib/sharing';
import { createRemotePlaylistStore, readInviteFragment, type PlaylistInvite } from '../api/playlists';
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
  /**
   * The host's playlist store (see `handlePlaylistStoreRequest`), e.g.
   * `/api/learn/playlists`. With it and a `userId`, "My playlists" live in the
   * account: they follow the user across devices, invites reach invitees, and
   * playlists made on this device while signed out move into the account.
   * Without it, playlists stay in this browser.
   */
  playlistsEndpoint?: string;
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
  playlistsEndpoint,
  quizGenerator,
}: EducationPlaylistsProps) {
  const catalog = useMemo(() => catalogProp ?? getDefaultCatalog(), [catalogProp]);
  const progressStore = useMemo(() => createProgressStore(), []);
  const playlistStore = useMemo(() => createLocalPlaylistStore(), []);
  const remote = useMemo(() => (playlistsEndpoint && userId ? createRemotePlaylistStore(playlistsEndpoint) : null), [playlistsEndpoint, userId]);

  const [expanded, setExpanded] = useState(!compact);
  const [tab, setTab] = useState<Tab>('browse');
  const [done, setDone] = useState<Set<string>>(() => new Set());
  const [mine, setMine] = useState<Playlist[]>([]);
  const [categoryId, setCategoryId] = useState<string | undefined>();
  const [majorId, setMajorId] = useState<string | undefined>();
  const [programId, setProgramId] = useState<string | undefined>();
  const [open, setOpen] = useState<OpenPlaylist | null>(null);
  const [invites, setInvites] = useState<PlaylistInvite[]>([]);
  const [notice, setNotice] = useState<string | null>(null);

  // Storage is read after mount so the server render and the first client
  // render agree; progress then fills in.
  useEffect(() => {
    setDone(progressStore.load());
    setMine(playlistStore.list());
  }, [progressStore, playlistStore]);

  // Signed in with a store: the account is the source of truth. Playlists
  // this device kept while signed out are uploaded once, then dropped locally.
  useEffect(() => {
    if (!remote) return;
    const controller = new AbortController();
    (async () => {
      for (const playlist of playlistStore.list().filter((p) => !p.ownerId || p.ownerId === userId)) {
        try {
          await remote.save({ ...playlist, ownerId: userId });
          playlistStore.remove(playlist.id);
        } catch {
          // Stays on this device; the next visit tries again.
        }
      }
      const result = await remote.list(controller.signal);
      setMine(result.playlists);
      setInvites(result.invites);
    })().catch((error: Error) => {
      if (error.name !== 'AbortError') setNotice(`Couldn't load your saved playlists: ${error.message}`);
    });
    return () => controller.abort();
  }, [remote, playlistStore, userId]);

  useEffect(() => {
    if (!importFromHash || typeof window === 'undefined') return;
    const shared = decodeShareFragment(window.location.hash);
    if (shared) {
      setExpanded(true);
      setOpen({ playlist: shared, source: 'shared' });
    }
    const token = readInviteFragment(window.location.hash);
    if (!token) return;
    setExpanded(true);
    if (!remote) {
      // The hash stays put, so the invite is accepted once sign-in completes.
      setNotice(playlistsEndpoint ? 'Sign in with the invited email address to open this playlist.' : 'Invites need an account to open.');
      return;
    }
    window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}`);
    remote
      .acceptInvite(token)
      .then((playlist) => {
        setMine((prev) => [playlist, ...prev.filter((p) => p.id !== playlist.id)]);
        setInvites((prev) => prev.filter((i) => i.token !== token));
        setOpen({ playlist, source: 'mine' });
        setNotice(null);
      })
      .catch((error: Error) => setNotice(error.message));
  }, [importFromHash, remote, playlistsEndpoint]);

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

  const showSaved = (playlist: Playlist) => {
    setMine((prev) => [playlist, ...prev.filter((p) => p.id !== playlist.id)]);
    setOpen((current) => (current?.playlist.id === playlist.id ? { ...current, playlist } : current));
  };

  const saveMine = (playlist: Playlist) => {
    if (!remote) {
      setMine(playlistStore.save({ ...playlist, updatedAt: new Date().toISOString() }));
      setOpen((current) => (current?.playlist.id === playlist.id ? { ...current, playlist } : current));
      return;
    }
    // Shown at once, then replaced by the server's copy (which carries the
    // invite tokens new members were given).
    showSaved(playlist);
    remote
      .save(playlist)
      .then((saved) => {
        showSaved(saved);
        setNotice(null);
      })
      .catch((error: Error) => setNotice(`Couldn't save to your account: ${error.message}`));
  };

  const saveCopy = (playlist: Playlist) => {
    const copy = createPlaylist({
      title: playlist.title,
      description: playlist.description,
      items: playlist.items,
      ownerId: userId,
      plannedFrom: playlist.plannedFrom,
    });
    setOpen({ playlist: copy, source: 'mine' });
    setTab('mine');
    saveMine(copy);
  };

  const deleteMine = (id: string) => {
    setOpen(null);
    if (!remote) {
      setMine(playlistStore.remove(id));
      return;
    }
    setMine((prev) => prev.filter((p) => p.id !== id));
    remote.remove(id).catch((error: Error) => setNotice(`Couldn't delete it from your account: ${error.message}`));
  };

  const acceptInvite = (pending: PlaylistInvite) => {
    remote
      ?.acceptInvite(pending.token)
      .then((playlist) => {
        setInvites((prev) => prev.filter((i) => i.token !== pending.token));
        showSaved(playlist);
        openPlaylist(playlist, 'mine');
      })
      .catch((error: Error) => setNotice(error.message));
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
    { id: 'mine', label: `My playlists${mine.length ? ` (${mine.length})` : ''}${invites.length ? ` · ${invites.length} invite${invites.length === 1 ? '' : 's'}` : ''}` },
    { id: 'plan', label: 'Plan with AI' },
  ];

  let body: React.ReactNode;
  if (open) {
    // Signed in, a playlist in "mine" may be one shared with the user; the
    // server enforces these too, this only decides what to offer.
    const owned = !remote || open.playlist.ownerId === userId;
    const editable = open.source === 'mine' && (owned || canEdit(open.playlist, userId));
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
          {editable && owned && (
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
          onSaveCopy={open.source === 'mine' ? undefined : saveCopy}
          canShare={owned}
          inAccount={Boolean(remote)}
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
    body = (
      <div style={s.section}>
        {invites.map((pending) => (
          <div key={pending.token} style={s.row}>
            <span style={s.muted}>
              You're invited to <strong>{pending.title}</strong> as {pending.role === 'editor' ? 'an editor' : 'a viewer'}.
            </span>
            <button type="button" style={s.primary} onClick={() => acceptInvite(pending)}>
              Accept
            </button>
          </div>
        ))}
        {mine.length ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 6 }}>
            {mine.map((playlist) => (
              <PlaylistCard key={playlist.id} playlist={playlist} done={done} onOpen={() => openPlaylist(playlist, 'mine')} />
            ))}
          </div>
        ) : (
          <div style={s.muted}>Nothing saved yet. Save a preset playlist, or plan your own with AI.</div>
        )}
      </div>
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
      {notice && (
        <div role="status" style={s.muted}>
          {notice}
        </div>
      )}
      {body}
    </section>
  );
}
