/**
 * @fileoverview Inline styles for the widget. Colors are translucent greys
 * over `currentColor`, so the widget takes on whatever light or dark surface
 * the host puts it on, the way the news and weather widgets do.
 */
import type { CSSProperties } from 'react';

const line = '1px solid rgba(127,127,127,0.3)';

export const s = {
  root: { fontFamily: 'system-ui, sans-serif', display: 'flex', flexDirection: 'column', gap: 8, padding: '10px 14px', borderRadius: 8, fontSize: 13, lineHeight: 1.4, minWidth: 0 } as CSSProperties,
  headerRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 } as CSSProperties,
  label: { fontSize: 11, fontWeight: 600, opacity: 0.75, letterSpacing: 0.3, textTransform: 'uppercase' } as CSSProperties,
  muted: { opacity: 0.7, fontSize: 12 } as CSSProperties,
  row: { display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' } as CSSProperties,
  scrollRow: { display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 2, scrollbarWidth: 'thin' } as CSSProperties,
  chip: { border: line, borderRadius: 999, padding: '2px 10px', fontSize: 12, background: 'transparent', color: 'inherit', cursor: 'pointer', whiteSpace: 'nowrap' } as CSSProperties,
  chipActive: { background: 'rgba(127,127,127,0.22)', borderColor: 'rgba(127,127,127,0.6)' } as CSSProperties,
  button: { border: line, borderRadius: 6, padding: '4px 10px', fontSize: 12, background: 'rgba(127,127,127,0.12)', color: 'inherit', cursor: 'pointer' } as CSSProperties,
  primary: { border: '1px solid rgba(99,102,241,0.7)', borderRadius: 6, padding: '5px 12px', fontSize: 12, fontWeight: 600, background: 'rgba(99,102,241,0.25)', color: 'inherit', cursor: 'pointer' } as CSSProperties,
  iconButton: { border: 'none', background: 'transparent', color: 'inherit', cursor: 'pointer', padding: 2, opacity: 0.75, display: 'flex' } as CSSProperties,
  input: { flex: 1, minWidth: 0, border: line, borderRadius: 6, padding: '5px 8px', fontSize: 13, background: 'rgba(127,127,127,0.08)', color: 'inherit' } as CSSProperties,
  card: { border: line, borderRadius: 8, padding: '8px 10px', background: 'rgba(127,127,127,0.06)', textAlign: 'left', color: 'inherit', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 } as CSSProperties,
  compactCard: { border: line, borderRadius: 8, padding: '6px 10px', background: 'rgba(127,127,127,0.06)', textAlign: 'left', color: 'inherit', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 2, minWidth: 150, maxWidth: 190, flex: '0 0 auto' } as CSSProperties,
  title: { fontWeight: 600, fontSize: 13 } as CSSProperties,
  bar: { height: 4, borderRadius: 2, background: 'rgba(127,127,127,0.25)', overflow: 'hidden' } as CSSProperties,
  barFill: { height: '100%', background: 'rgba(34,197,94,0.85)' } as CSSProperties,
  list: { listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 4 } as CSSProperties,
  item: { display: 'flex', alignItems: 'flex-start', gap: 8, padding: '6px 4px', borderBottom: '1px solid rgba(127,127,127,0.15)' } as CSSProperties,
  link: { color: 'inherit', textDecoration: 'none', fontWeight: 500 } as CSSProperties,
  badge: { fontSize: 10, border: line, borderRadius: 4, padding: '0 5px', opacity: 0.8, whiteSpace: 'nowrap' } as CSSProperties,
  section: { display: 'flex', flexDirection: 'column', gap: 6 } as CSSProperties,
} as const;
