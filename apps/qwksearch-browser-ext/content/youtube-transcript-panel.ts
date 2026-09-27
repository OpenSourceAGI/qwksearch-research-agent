/**
 * @fileoverview The synced transcript column on YouTube watch pages — the
 * same reading view debate-ai's watch page puts beside its player: the
 * video's captions regrouped into sentences, the spoken one highlighted and
 * followed, every line clickable to seek, and a search box over the lot.
 *
 * The panel is drawn inside a shadow root so YouTube's styles can't reach it,
 * at the top of the right-hand column (`#secondary`). When that column is
 * missing or hidden (theater mode, narrow windows) it floats at the right
 * edge instead. YouTube is a single-page app, so the panel is kept across
 * navigations and reloaded for each new video.
 */

import {
  activeIndexAt,
  fetchYouTubeTranscript,
  formatTimecode,
  getYouTubeVideoId,
  transcriptToText,
  TranscriptUnavailableError,
  type LoadedTranscript,
  type TranscriptSnippet,
} from '@/lib/youtube-transcript';

const HOST_ID = 'qwksearch-yt-transcript';
const PREFS_KEY = 'qwksearchYouTubeTranscript';

interface PanelPrefs {
  collapsed: boolean;
  autoScroll: boolean;
}

type PanelState =
  | { kind: 'loading' }
  | { kind: 'error'; message: string }
  | { kind: 'ready'; transcript: LoadedTranscript };

const STYLES = `
:host { all: initial; display: block; }
:host(.floating) {
  position: fixed; top: 72px; right: 12px; z-index: 2000;
  width: 360px; max-width: calc(100vw - 24px);
}
.panel {
  --bg: #ffffff; --fg: #0f0f0f; --muted: #606060; --border: rgba(0,0,0,.12);
  --hover: rgba(0,0,0,.05); --active: rgba(62,166,255,.16); --word: rgba(62,166,255,.38);
  --accent: #065fd4; --mark: rgba(250,204,21,.6);
  font: 14px/1.5 Roboto, Arial, sans-serif; color: var(--fg); background: var(--bg);
  border: 1px solid var(--border); border-radius: 12px; overflow: hidden;
  display: flex; flex-direction: column; margin-bottom: 16px;
  box-sizing: border-box;
}
:host(.dark) .panel {
  --bg: #0f0f0f; --fg: #f1f1f1; --muted: #aaaaaa; --border: rgba(255,255,255,.16);
  --hover: rgba(255,255,255,.08); --active: rgba(62,166,255,.2); --word: rgba(62,166,255,.45);
  --accent: #3ea6ff; --mark: rgba(234,179,8,.45);
}
:host(.floating) .panel { box-shadow: 0 8px 24px rgba(0,0,0,.25); }
.head {
  display: flex; align-items: center; gap: 8px; padding: 8px 12px;
  border-bottom: 1px solid var(--border);
}
.panel.collapsed .head { border-bottom: 0; }
.title { font-size: 13px; font-weight: 600; flex: 1; min-width: 0;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.title small { font-weight: 400; color: var(--muted); margin-left: 6px; }
.clock { font-size: 11px; color: var(--muted); font-variant-numeric: tabular-nums; }
button { font: inherit; color: inherit; background: none; border: 0; cursor: pointer; }
.icon { padding: 4px 6px; border-radius: 6px; font-size: 12px; color: var(--muted); }
.icon:hover { background: var(--hover); color: var(--fg); }
.tools { display: flex; align-items: center; gap: 8px; padding: 6px 12px;
  border-bottom: 1px solid var(--border); }
.search { flex: 1; min-width: 0; font: inherit; font-size: 12px; color: var(--fg);
  background: transparent; border: 1px solid var(--border); border-radius: 8px; padding: 5px 8px; outline: none; }
.search:focus { border-color: var(--accent); }
label { display: flex; align-items: center; gap: 4px; font-size: 11px; color: var(--muted);
  white-space: nowrap; cursor: pointer; }
.list { overflow-y: auto; max-height: 460px; padding: 4px 6px; overscroll-behavior: contain; }
:host(.floating) .list { max-height: calc(100vh - 220px); }
.row { display: flex; align-items: flex-start; gap: 6px; }
.time { flex-shrink: 0; margin-top: 7px; font-size: 11px; color: var(--muted);
  font-variant-numeric: tabular-nums; }
.time:hover { color: var(--accent); }
.line { flex: 1; text-align: left; padding: 5px 8px; border-radius: 6px; font-size: 14px; line-height: 1.5; }
.line:hover { background: var(--hover); }
.line.active { background: var(--active); }
.word { border-radius: 3px; }
.word.now { background: var(--word); color: var(--accent); font-weight: 500; }
mark { background: var(--mark); color: inherit; border-radius: 2px; }
.note { padding: 12px; font-size: 13px; color: var(--muted); }
.panel.collapsed .tools, .panel.collapsed .list { display: none; }
`;

/** The transcript panel itself; wiring to the page lives in {@link setupYouTubeTranscript}. */
export class TranscriptPanel {
  readonly host: HTMLElement;
  private root: ShadowRoot;
  private panel: HTMLElement;
  private titleEl: HTMLElement;
  private clockEl: HTMLElement;
  private toolsEl: HTMLElement;
  private searchEl: HTMLInputElement;
  private autoScrollEl: HTMLInputElement;
  private listEl: HTMLElement;
  private collapseBtn: HTMLButtonElement;
  private copyBtn: HTMLButtonElement;

  private state: PanelState = { kind: 'loading' };
  private query = '';
  private lineEls: (HTMLButtonElement | null)[] = [];
  private activeIndex = -1;
  private activeWord = -1;
  private currentTime = 0;
  prefs: PanelPrefs = { collapsed: false, autoScroll: true };

  constructor(
    private onSeek: (seconds: number) => void,
    private onPrefsChange: (prefs: PanelPrefs) => void = () => {},
  ) {
    this.host = document.createElement('div');
    this.host.id = HOST_ID;
    this.root = this.host.attachShadow({ mode: 'open' });

    const style = document.createElement('style');
    style.textContent = STYLES;
    this.root.append(style);

    this.panel = el('section', 'panel');
    this.panel.setAttribute('aria-label', 'Video transcript');

    const head = el('div', 'head');
    this.titleEl = el('div', 'title');
    this.clockEl = el('span', 'clock');
    this.copyBtn = el('button', 'icon') as HTMLButtonElement;
    this.copyBtn.textContent = 'Copy';
    this.copyBtn.title = 'Copy the transcript';
    this.copyBtn.addEventListener('click', () => this.copy());
    this.collapseBtn = el('button', 'icon') as HTMLButtonElement;
    this.collapseBtn.addEventListener('click', () => this.setPrefs({ collapsed: !this.prefs.collapsed }));
    head.append(this.titleEl, this.clockEl, this.copyBtn, this.collapseBtn);

    this.toolsEl = el('div', 'tools');
    this.searchEl = el('input', 'search') as HTMLInputElement;
    this.searchEl.type = 'search';
    this.searchEl.placeholder = 'Search the transcript';
    this.searchEl.setAttribute('aria-label', 'Search the transcript');
    this.searchEl.addEventListener('input', () => {
      this.query = this.searchEl.value;
      this.renderList();
    });
    // YouTube binds single-key shortcuts (k, j, l, f, m…) on the document;
    // typing in the search box must not play, seek or fullscreen the video.
    for (const type of ['keydown', 'keypress', 'keyup']) {
      this.searchEl.addEventListener(type, (event) => event.stopPropagation());
    }
    const autoLabel = el('label');
    this.autoScrollEl = el('input') as HTMLInputElement;
    this.autoScrollEl.type = 'checkbox';
    this.autoScrollEl.addEventListener('change', () =>
      this.setPrefs({ autoScroll: this.autoScrollEl.checked }),
    );
    autoLabel.append(this.autoScrollEl, 'Auto-scroll');
    this.toolsEl.append(this.searchEl, autoLabel);

    this.listEl = el('div', 'list');
    this.listEl.setAttribute('role', 'list');

    this.panel.append(head, this.toolsEl, this.listEl);
    this.root.append(this.panel);
    this.applyPrefs();
    this.render();
  }

  setPrefs(patch: Partial<PanelPrefs>) {
    this.prefs = { ...this.prefs, ...patch };
    this.applyPrefs();
    this.onPrefsChange(this.prefs);
    if (patch.autoScroll) this.scrollToActive();
  }

  setState(state: PanelState) {
    this.state = state;
    this.query = '';
    this.searchEl.value = '';
    this.activeIndex = -1;
    this.activeWord = -1;
    this.render();
  }

  setDark(dark: boolean) {
    this.host.classList.toggle('dark', dark);
  }

  setFloating(floating: boolean) {
    this.host.classList.toggle('floating', floating);
  }

  /** Moves the highlight to what is being said at `seconds`. */
  setTime(seconds: number) {
    this.currentTime = seconds;
    this.clockEl.textContent = this.state.kind === 'ready' ? formatTimecode(seconds) : '';
    if (this.state.kind !== 'ready') return;
    const lines = this.state.transcript.sentences;
    const index = activeIndexAt(lines, seconds);
    const word = index >= 0 ? activeWordAt(lines[index], seconds) : -1;
    if (index === this.activeIndex && word === this.activeWord) return;

    const lineChanged = index !== this.activeIndex;
    const previous = this.lineEls[this.activeIndex];
    this.activeIndex = index;
    this.activeWord = word;
    if (lineChanged && previous) this.paintLine(previous, lines[Number(previous.dataset.index)], false);
    const current = this.lineEls[index];
    if (current) this.paintLine(current, lines[index], true);
    if (lineChanged) this.scrollToActive();
  }

  get activeLineIndex() {
    return this.activeIndex;
  }

  private applyPrefs() {
    this.panel.classList.toggle('collapsed', this.prefs.collapsed);
    this.collapseBtn.textContent = this.prefs.collapsed ? 'Show' : 'Hide';
    this.collapseBtn.setAttribute('aria-expanded', String(!this.prefs.collapsed));
    this.autoScrollEl.checked = this.prefs.autoScroll;
  }

  private render() {
    const { state } = this;
    this.titleEl.textContent = 'Transcript';
    if (state.kind === 'ready') {
      const { languageCode, generated } = state.transcript;
      const small = document.createElement('small');
      small.textContent = `${languageCode}${generated ? ' · auto-generated' : ''}`;
      this.titleEl.append(small);
    }
    this.toolsEl.style.display = state.kind === 'ready' ? '' : 'none';
    this.copyBtn.style.display = state.kind === 'ready' ? '' : 'none';
    this.renderList();
    this.setTime(this.currentTime);
  }

  private renderList() {
    this.listEl.replaceChildren();
    this.lineEls = [];
    const { state } = this;
    if (state.kind === 'loading') {
      this.listEl.append(note('Loading transcript…'));
      return;
    }
    if (state.kind === 'error') {
      this.listEl.append(note(state.message));
      return;
    }

    const lines = state.transcript.sentences;
    const needle = this.query.trim().toLowerCase();
    let shown = 0;
    lines.forEach((line, index) => {
      if (needle && !line.text.toLowerCase().includes(needle)) return;
      shown++;
      const row = el('div', 'row');
      row.setAttribute('role', 'listitem');
      const time = el('button', 'time') as HTMLButtonElement;
      time.textContent = formatTimecode(line.start);
      time.setAttribute('aria-label', `Seek to ${formatTimecode(line.start)}`);
      time.addEventListener('click', () => this.onSeek(line.start));
      const text = el('button', 'line') as HTMLButtonElement;
      text.dataset.index = String(index);
      text.addEventListener('click', () => this.onSeek(line.start));
      this.paintLine(text, line, index === this.activeIndex);
      this.lineEls[index] = text;
      row.append(time, text);
      this.listEl.append(row);
    });
    if (needle && shown === 0) this.listEl.append(note(`No line matches “${this.query.trim()}”.`));
    this.clockEl.title = needle ? `${shown}/${lines.length} lines` : '';
  }

  /** Fills a line's text: words split out while it is active, search matches marked. */
  private paintLine(button: HTMLButtonElement, line: TranscriptSnippet, active: boolean) {
    button.classList.toggle('active', active);
    button.replaceChildren();
    const needle = this.query.trim();
    if (!active) {
      appendHighlighted(button, line.text, needle);
      return;
    }
    line.text.split(/\s+/).filter(Boolean).forEach((word, i) => {
      const span = el('span', i === this.activeWord ? 'word now' : 'word');
      appendHighlighted(span, word, needle);
      button.append(span, ' ');
    });
  }

  /** Follows playback inside the list only — never scrolls the YouTube page. */
  private scrollToActive() {
    if (!this.prefs.autoScroll || this.prefs.collapsed || this.query.trim()) return;
    const target = this.lineEls[this.activeIndex];
    if (!target) return;
    const list = this.listEl;
    const top = target.offsetTop - list.offsetTop - list.clientHeight / 2 + target.offsetHeight / 2;
    list.scrollTo?.({ top: Math.max(0, top), behavior: 'smooth' });
  }

  private async copy() {
    if (this.state.kind !== 'ready') return;
    try {
      await navigator.clipboard.writeText(transcriptToText(this.state.transcript.sentences));
      this.copyBtn.textContent = 'Copied';
    } catch {
      this.copyBtn.textContent = 'Failed';
    }
    setTimeout(() => (this.copyBtn.textContent = 'Copy'), 1500);
  }
}

/** Index of the word being said within `line` at `seconds` — an even spread, as words carry no times. */
function activeWordAt(line: TranscriptSnippet, seconds: number): number {
  const count = line.text.split(/\s+/).filter(Boolean).length;
  if (line.duration <= 0 || count === 0) return -1;
  return Math.min(count - 1, Math.max(0, Math.floor(((seconds - line.start) / line.duration) * count)));
}

function el(tag: string, className?: string): HTMLElement {
  const node = document.createElement(tag);
  if (className) node.className = className;
  return node;
}

function note(text: string): HTMLElement {
  const node = el('p', 'note');
  node.textContent = text;
  return node;
}

/** Appends `text` to `parent`, wrapping case-insensitive matches of `needle` in `<mark>`. */
function appendHighlighted(parent: HTMLElement, text: string, needle: string) {
  if (!needle) {
    parent.append(text);
    return;
  }
  const lower = text.toLowerCase();
  const target = needle.toLowerCase();
  let from = 0;
  let at = lower.indexOf(target);
  while (at !== -1) {
    if (at > from) parent.append(text.slice(from, at));
    const mark = document.createElement('mark');
    mark.textContent = text.slice(at, at + target.length);
    parent.append(mark);
    from = at + target.length;
    at = lower.indexOf(target, from);
  }
  if (from < text.length) parent.append(text.slice(from));
}

function mainVideo(): HTMLVideoElement | null {
  return document.querySelector<HTMLVideoElement>('#movie_player video, video.html5-main-video');
}

/** The watch page's right-hand column, when it is on screen. */
function sidebar(): HTMLElement | null {
  const column = document.querySelector<HTMLElement>('ytd-watch-flexy #secondary-inner, ytd-watch-flexy #secondary');
  return column && column.offsetParent !== null ? column : null;
}

async function loadPrefs(): Promise<Partial<PanelPrefs>> {
  try {
    const stored = await chrome.storage?.local.get(PREFS_KEY);
    return (stored?.[PREFS_KEY] as Partial<PanelPrefs>) ?? {};
  } catch {
    return {};
  }
}

function savePrefs(prefs: PanelPrefs) {
  try {
    void chrome.storage?.local.set({ [PREFS_KEY]: prefs });
  } catch {
    // Storage is a convenience; the panel works without it.
  }
}

/** Starts the transcript panel on youtube.com; a no-op on any other site. */
export function setupYouTubeTranscript() {
  if (!/(^|\.)youtube\.com$/.test(location.hostname) || window.top !== window) return;

  let panel: TranscriptPanel | null = null;
  let loadedFor: string | null = null;
  const cache = new Map<string, Promise<LoadedTranscript>>();

  const ensurePanel = () => {
    if (!panel) {
      panel = new TranscriptPanel(
        (seconds) => {
          const video = mainVideo();
          if (video) video.currentTime = seconds;
        },
        savePrefs,
      );
      void loadPrefs().then((prefs) => panel?.setPrefs(prefs));
    }
    return panel;
  };

  /** Keeps the panel mounted where it belongs; YouTube re-renders the column freely. */
  const place = (p: TranscriptPanel) => {
    const column = sidebar();
    p.setDark(document.documentElement.hasAttribute('dark'));
    p.setFloating(!column);
    const parent = column ?? document.body;
    if (p.host.parentElement !== parent || (column && column.firstElementChild !== p.host)) {
      parent.prepend(p.host);
    }
  };

  const sync = () => {
    const videoId = location.pathname === '/watch' ? getYouTubeVideoId(location.href) : null;
    if (!videoId) {
      panel?.host.remove();
      loadedFor = null;
      return;
    }
    const p = ensurePanel();
    place(p);
    if (loadedFor === videoId) return;
    loadedFor = videoId;
    p.setState({ kind: 'loading' });

    let request = cache.get(videoId);
    if (!request) {
      request = fetchYouTubeTranscript(videoId, {
        pageHtml: document.documentElement.innerHTML,
        preferredLanguages: [document.documentElement.lang, ...navigator.languages, 'en'].filter(Boolean),
      });
      cache.set(videoId, request);
      // Let a failure be retried on the next visit rather than remembered.
      request.catch(() => cache.delete(videoId));
    }
    request.then(
      (transcript) => {
        if (loadedFor === videoId) p.setState({ kind: 'ready', transcript });
      },
      (error: unknown) => {
        if (loadedFor !== videoId) return;
        const message =
          error instanceof TranscriptUnavailableError
            ? error.message
            : 'Couldn’t load the captions for this video.';
        p.setState({ kind: 'error', message });
      },
    );
  };

  // `timeupdate` doesn't bubble, but a capturing listener still sees it —
  // and keeps working when YouTube swaps the <video> element.
  document.addEventListener(
    'timeupdate',
    (event) => {
      const video = event.target;
      if (panel?.host.isConnected && video instanceof HTMLVideoElement && video === mainVideo()) {
        panel.setTime(video.currentTime);
      }
    },
    true,
  );

  document.addEventListener('yt-navigate-finish', sync);
  window.addEventListener('popstate', sync);
  // Covers the first load and the column appearing late, being re-rendered,
  // or hidden when the window narrows or theater mode is toggled.
  setInterval(sync, 1500);
  sync();
}
