/**
 * @fileoverview Scoped styles for the video grid, list and admin components.
 *
 * Same approach as the floating player and the transcript modal: no Tailwind,
 * no CSS-in-JS, no design system. One stylesheet with an `eytg-` prefix,
 * rendered as a `<style>` element so it also arrives with server-rendered
 * HTML (an effect-injected sheet would flash unstyled cards on first paint).
 *
 * Theming is CSS custom properties on `.eytg-root`. Defaults follow
 * `prefers-color-scheme`, and a `dark` class or `data-theme="dark"` on any
 * ancestor (what next-themes and most design systems set) wins over it:
 *
 * ```css
 * .eytg-root { --eytg-accent: #e11d48; --eytg-radius: 4px; }
 * ```
 */

'use client';

import { createContext, useContext, type ReactNode } from 'react';

export const GRID_STYLES = `
.eytg-root {
  --eytg-bg: #ffffff;
  --eytg-card: #ffffff;
  --eytg-fg: #0f172a;
  --eytg-muted: #64748b;
  --eytg-subtle: #f1f5f9;
  --eytg-border: #e2e8f0;
  --eytg-accent: #2563eb;
  --eytg-accent-fg: #ffffff;
  --eytg-danger: #dc2626;
  --eytg-warn: #b45309;
  --eytg-ok: #15803d;
  --eytg-gold: #ca8a04;
  --eytg-radius: 12px;
  --eytg-card-min: 240px;
  color: var(--eytg-fg);
  font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  font-size: 14px;
  line-height: 1.4;
}
@media (prefers-color-scheme: dark) {
  :root:not(.light):not([data-theme="light"]) .eytg-root {
    --eytg-bg: #0b1120; --eytg-card: #111827; --eytg-fg: #e5e7eb; --eytg-muted: #94a3b8;
    --eytg-subtle: #1e293b; --eytg-border: #273449; --eytg-accent: #60a5fa; --eytg-accent-fg: #0b1120;
    --eytg-danger: #f87171; --eytg-warn: #fbbf24; --eytg-ok: #4ade80; --eytg-gold: #facc15;
  }
}
.dark .eytg-root, [data-theme="dark"] .eytg-root {
  --eytg-bg: #0b1120; --eytg-card: #111827; --eytg-fg: #e5e7eb; --eytg-muted: #94a3b8;
  --eytg-subtle: #1e293b; --eytg-border: #273449; --eytg-accent: #60a5fa; --eytg-accent-fg: #0b1120;
  --eytg-danger: #f87171; --eytg-warn: #fbbf24; --eytg-ok: #4ade80; --eytg-gold: #facc15;
}
.eytg-root *, .eytg-root *::before, .eytg-root *::after { box-sizing: border-box; }

/* ── buttons & inputs ─────────────────────────────────────────────────── */
.eytg-icon-btn {
  display: inline-flex; align-items: center; justify-content: center;
  width: 28px; height: 28px; padding: 0; border: 0; border-radius: 8px;
  background: transparent; color: var(--eytg-muted); cursor: pointer;
  transition: background .15s, color .15s;
}
.eytg-icon-btn:hover:not(:disabled) { background: var(--eytg-subtle); color: var(--eytg-fg); }
.eytg-icon-btn:disabled { opacity: .4; cursor: default; }
.eytg-icon-btn:focus-visible, .eytg-btn:focus-visible { outline: 2px solid var(--eytg-accent); outline-offset: 1px; }
.eytg-icon-btn.eytg-on { color: var(--eytg-gold); }
.eytg-btn {
  display: inline-flex; align-items: center; gap: 6px; height: 32px; padding: 0 12px;
  border: 1px solid var(--eytg-border); border-radius: 8px; background: var(--eytg-card);
  color: var(--eytg-fg); font: inherit; font-size: 13px; font-weight: 500; cursor: pointer; white-space: nowrap;
}
.eytg-btn:hover:not(:disabled) { background: var(--eytg-subtle); }
.eytg-btn:disabled { opacity: .5; cursor: default; }
.eytg-btn-primary { background: var(--eytg-accent); border-color: var(--eytg-accent); color: var(--eytg-accent-fg); }
.eytg-btn-primary:hover:not(:disabled) { background: var(--eytg-accent); filter: brightness(1.08); }
.eytg-btn-danger { color: var(--eytg-danger); }
.eytg-input, .eytg-select, .eytg-textarea {
  height: 32px; padding: 0 10px; border: 1px solid var(--eytg-border); border-radius: 8px;
  background: var(--eytg-card); color: var(--eytg-fg); font: inherit; font-size: 13px; min-width: 0;
}
.eytg-textarea { height: auto; min-height: 88px; padding: 8px 10px; resize: vertical; width: 100%; }
.eytg-input:focus, .eytg-select:focus, .eytg-textarea:focus { outline: 2px solid var(--eytg-accent); outline-offset: -1px; }

/* ── badges ───────────────────────────────────────────────────────────── */
.eytg-badge {
  display: inline-flex; align-items: center; gap: 4px; max-width: 100%;
  padding: 1px 7px; border-radius: 999px; border: 1px solid var(--eytg-border);
  background: var(--eytg-subtle); color: var(--eytg-muted); font-size: 11px; font-weight: 500;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
button.eytg-badge { cursor: pointer; font-family: inherit; }
button.eytg-badge:hover { color: var(--eytg-fg); }
.eytg-badge-accent { background: var(--eytg-accent); border-color: var(--eytg-accent); color: var(--eytg-accent-fg); }
.eytg-badge-gold { background: rgba(202, 138, 4, .14); border-color: rgba(202, 138, 4, .4); color: var(--eytg-gold); }
.eytg-badge-warn { background: rgba(180, 83, 9, .12); border-color: rgba(180, 83, 9, .35); color: var(--eytg-warn); }
.eytg-badge-danger { background: rgba(220, 38, 38, .1); border-color: rgba(220, 38, 38, .35); color: var(--eytg-danger); }
.eytg-badge-ok { background: rgba(21, 128, 61, .1); border-color: rgba(21, 128, 61, .35); color: var(--eytg-ok); }

/* ── grid & card ──────────────────────────────────────────────────────── */
.eytg-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, var(--eytg-card-min)), 1fr)); gap: 16px; }
.eytg-empty { padding: 32px 16px; text-align: center; color: var(--eytg-muted); border: 1px dashed var(--eytg-border); border-radius: var(--eytg-radius); }
.eytg-slot { position: relative; height: 100%; }
.eytg-card {
  position: relative; display: flex; flex-direction: column; height: 100%; overflow: hidden;
  background: var(--eytg-card); border: 1px solid var(--eytg-border); border-radius: var(--eytg-radius);
  transition: box-shadow .2s, transform .2s, border-color .2s;
}
.eytg-card:hover { box-shadow: 0 10px 30px -12px rgba(15, 23, 42, .35); transform: translateY(-1px); }
.eytg-card.eytg-playing { border-color: var(--eytg-accent); box-shadow: 0 0 0 1px var(--eytg-accent); }
.eytg-card.eytg-hidden { opacity: .6; border-style: dashed; }
.eytg-thumb {
  position: relative; display: block; width: 100%; aspect-ratio: 16 / 9; padding: 0; border: 0;
  background: var(--eytg-subtle); cursor: pointer; overflow: hidden;
}
.eytg-thumb img { width: 100%; height: 100%; object-fit: cover; display: block; transition: transform .3s; }
.eytg-card:hover .eytg-thumb img { transform: scale(1.03); }
.eytg-thumb-play {
  position: absolute; inset: 0; display: flex; align-items: center; justify-content: center;
  color: #fff; background: rgba(0, 0, 0, .35); opacity: 0; transition: opacity .2s;
}
.eytg-thumb:hover .eytg-thumb-play, .eytg-thumb:focus-visible .eytg-thumb-play { opacity: 1; }
.eytg-thumb-badges { position: absolute; top: 8px; right: 8px; display: flex; gap: 4px; }
.eytg-thumb-badges .eytg-badge { background: rgba(0, 0, 0, .7); border-color: transparent; color: #fff; }
.eytg-thumb-badges .eytg-badge-accent { background: var(--eytg-accent); color: var(--eytg-accent-fg); }
.eytg-thumb-badges .eytg-badge-gold { background: rgba(0, 0, 0, .7); color: #facc15; }
.eytg-progress { position: absolute; left: 0; right: 0; bottom: 0; height: 3px; background: rgba(255, 255, 255, .35); }
.eytg-progress > span { display: block; height: 100%; background: #ef4444; }
.eytg-card-body { display: flex; flex-direction: column; gap: 6px; padding: 10px 12px 4px; flex: 1; min-width: 0; }
.eytg-card-title {
  margin: 0; font-size: 14px; font-weight: 600; line-height: 1.3; color: var(--eytg-fg);
  display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
}
.eytg-card-meta { display: flex; flex-wrap: wrap; align-items: center; gap: 4px 8px; color: var(--eytg-muted); font-size: 12px; }
.eytg-card-meta button { padding: 0; border: 0; background: none; color: inherit; font: inherit; cursor: pointer; }
.eytg-card-meta button:hover { color: var(--eytg-fg); text-decoration: underline; }
.eytg-card-badges { display: flex; flex-wrap: wrap; gap: 4px; }
.eytg-card-desc {
  margin: 0; color: var(--eytg-muted); font-size: 12px;
  display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden;
}
.eytg-card-actions { display: flex; align-items: center; gap: 2px; padding: 4px 8px 8px; }
.eytg-card-actions .eytg-spacer { flex: 1; }
.eytg-hidden-flag { position: absolute; top: 8px; left: 8px; z-index: 2; }

/* ── stack nav ────────────────────────────────────────────────────────── */
.eytg-stack {
  display: inline-flex; align-items: center; gap: 2px; padding: 1px 4px; font-size: 11px; font-weight: 500;
  color: var(--eytg-muted); border: 1px solid var(--eytg-border); border-radius: 6px; background: var(--eytg-card);
}
.eytg-stack-overlay { position: absolute; top: 8px; left: 8px; z-index: 3; background: rgba(255, 255, 255, .92); box-shadow: 0 1px 3px rgba(0,0,0,.15); }
.dark .eytg-stack-overlay, [data-theme="dark"] .eytg-stack-overlay { background: rgba(17, 24, 39, .92); }
.eytg-stack button {
  display: inline-flex; align-items: center; justify-content: center; width: 20px; height: 20px;
  padding: 0; border: 0; border-radius: 4px; background: transparent; color: inherit; cursor: pointer;
}
.eytg-stack button:hover { background: var(--eytg-subtle); color: var(--eytg-fg); }
.eytg-stack-count { font-variant-numeric: tabular-nums; }
.eytg-stack-label { max-width: 9rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; margin-left: 2px; }

/* ── list / table ─────────────────────────────────────────────────────── */
.eytg-table-wrap { overflow-x: auto; border: 1px solid var(--eytg-border); border-radius: var(--eytg-radius); background: var(--eytg-card); }
.eytg-table { width: 100%; border-collapse: collapse; table-layout: fixed; font-size: 13px; }
.eytg-table th {
  position: relative; text-align: left; font-weight: 600; font-size: 12px; color: var(--eytg-muted);
  padding: 8px 10px; border-bottom: 1px solid var(--eytg-border); background: var(--eytg-subtle); white-space: nowrap;
}
.eytg-table th.eytg-num, .eytg-table td.eytg-num { text-align: right; font-variant-numeric: tabular-nums; }
.eytg-th-btn { display: inline-flex; align-items: center; gap: 4px; padding: 0; border: 0; background: none; color: inherit; font: inherit; cursor: pointer; }
.eytg-th-btn:hover { color: var(--eytg-fg); }
.eytg-table td { padding: 6px 10px; border-bottom: 1px solid var(--eytg-border); vertical-align: middle; overflow: hidden; text-overflow: ellipsis; }
.eytg-table tr:last-child td { border-bottom: 0; }
.eytg-row { cursor: pointer; }
.eytg-row:hover td { background: var(--eytg-subtle); }
.eytg-row.eytg-playing td { background: rgba(37, 99, 235, .08); }
.eytg-row-title { display: flex; align-items: center; gap: 10px; min-width: 0; }
.eytg-row-thumb { flex: none; width: 96px; aspect-ratio: 16 / 9; border-radius: 6px; object-fit: cover; background: var(--eytg-subtle); }
.eytg-row-text { min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.eytg-row-text strong { font-weight: 500; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.eytg-row-text span { color: var(--eytg-muted); font-size: 12px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.eytg-group-row td { background: var(--eytg-subtle); font-weight: 600; cursor: pointer; }
.eytg-group-row:hover td { filter: brightness(.97); }
.eytg-group-label { display: inline-flex; align-items: center; gap: 6px; }
.eytg-group-count { color: var(--eytg-muted); font-weight: 400; font-size: 12px; }
.eytg-levels { display: inline-flex; gap: 2px; margin-left: 8px; vertical-align: middle; }
.eytg-levels button {
  height: 20px; min-width: 24px; padding: 0 4px; border: 1px solid var(--eytg-border); border-radius: 4px;
  background: var(--eytg-card); color: var(--eytg-muted); font: inherit; font-size: 10px; cursor: pointer;
}
.eytg-levels button.eytg-on { background: var(--eytg-accent); border-color: var(--eytg-accent); color: var(--eytg-accent-fg); }
.eytg-resize { position: absolute; top: 0; right: 0; z-index: 1; width: 8px; height: 100%; cursor: col-resize; touch-action: none; user-select: none; }
.eytg-resize:hover, .eytg-resize:active { background: rgba(37, 99, 235, .35); }
.eytg-resizing, .eytg-resizing * { cursor: col-resize !important; user-select: none !important; }
.eytg-row-actions { display: flex; align-items: center; justify-content: flex-end; gap: 2px; }

/* ── admin ────────────────────────────────────────────────────────────── */
.eytg-admin { display: flex; flex-direction: column; gap: 12px; }
.eytg-toolbar { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; }
.eytg-toolbar .eytg-grow { flex: 1 1 200px; }
.eytg-banner { padding: 8px 12px; border-radius: 8px; font-size: 13px; border: 1px solid var(--eytg-border); background: var(--eytg-subtle); }
.eytg-banner-error { border-color: rgba(220, 38, 38, .4); color: var(--eytg-danger); background: rgba(220, 38, 38, .06); }
.eytg-banner-ok { border-color: rgba(21, 128, 61, .35); color: var(--eytg-ok); background: rgba(21, 128, 61, .06); }
.eytg-pager { display: flex; align-items: center; justify-content: space-between; gap: 8px; color: var(--eytg-muted); font-size: 12px; }
.eytg-pager > div { display: flex; gap: 6px; }
.eytg-overlay {
  position: fixed; inset: 0; z-index: 10000; display: flex; align-items: flex-start; justify-content: center;
  padding: 5vh 16px; background: rgba(15, 23, 42, .55); overflow-y: auto;
}
.eytg-dialog {
  width: 100%; max-width: 640px; background: var(--eytg-card); color: var(--eytg-fg);
  border: 1px solid var(--eytg-border); border-radius: var(--eytg-radius); box-shadow: 0 30px 60px -20px rgba(0,0,0,.5);
}
.eytg-dialog-sm { max-width: 420px; }
.eytg-dialog header { display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 14px 16px; border-bottom: 1px solid var(--eytg-border); }
.eytg-dialog header h2 { margin: 0; font-size: 16px; }
.eytg-dialog-body { padding: 16px; display: flex; flex-direction: column; gap: 12px; }
.eytg-dialog footer { display: flex; justify-content: flex-end; gap: 8px; padding: 12px 16px; border-top: 1px solid var(--eytg-border); }
.eytg-form-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
@media (max-width: 560px) { .eytg-form-grid { grid-template-columns: 1fr; } }
.eytg-field { display: flex; flex-direction: column; gap: 4px; min-width: 0; }
.eytg-field-wide { grid-column: 1 / -1; }
.eytg-field > span { font-size: 12px; font-weight: 600; color: var(--eytg-muted); }
.eytg-field small { font-size: 11px; color: var(--eytg-muted); }
.eytg-check { display: inline-flex; align-items: center; gap: 8px; font-size: 13px; }
.eytg-section-title { margin: 4px 0 0; font-size: 12px; text-transform: uppercase; letter-spacing: .05em; color: var(--eytg-muted); }
.eytg-spin { animation: eytg-spin 1s linear infinite; }
@keyframes eytg-spin { to { transform: rotate(360deg); } }
`;

/** Set by a component that already rendered the stylesheet, so its children don't repeat it. */
const StylesRendered = createContext(false);

/**
 * Renders the stylesheet unless an ancestor already did, and marks the subtree
 * as styled. Every top-level component wraps itself in this, so a `<VideoCard>`
 * rendered alone is styled and a grid of 500 cards carries one `<style>`, not 500.
 */
export function GridStylesProvider({ children }: { children: ReactNode }) {
  const rendered = useContext(StylesRendered);
  if (rendered) return <>{children}</>;
  return (
    <StylesRendered.Provider value={true}>
      <style data-extract-youtube-grid="">{GRID_STYLES}</style>
      {children}
    </StylesRendered.Provider>
  );
}
