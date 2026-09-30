/**
 * @fileoverview Display formatting shared by the card, the list and the admin
 * table, so a view count or a date reads the same in all three.
 */

import type { CustomFieldDef, CustomFieldValue, VideoItem } from '../../library/types';

/** `987`, `12.3K`, `4.5M`, `1.2B` — YouTube's own compact style. */
export function formatViewCount(views: number | null | undefined): string {
  const n = Number(views ?? 0);
  if (!Number.isFinite(n) || n < 0) return '0';
  if (n < 1_000) return String(Math.trunc(n));
  const units: [number, string][] = [[1e9, 'B'], [1e6, 'M'], [1e3, 'K']];
  for (const [size, suffix] of units) {
    if (n >= size) {
      const value = n / size;
      return `${value >= 100 ? Math.round(value) : Number(value.toFixed(1))}${suffix}`;
    }
  }
  return String(n);
}

/**
 * A publish date for display. Date-only strings (`2024-05-01`) are formatted
 * in UTC so they don't shift a day west of Greenwich.
 *
 * @param full - `May 1, 2024` instead of `May 2024`.
 */
export function formatVideoDate(value: string | null | undefined, full = false): string {
  if (!value) return '';
  const ms = Date.parse(value);
  if (!Number.isFinite(ms)) return value;
  const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(value);
  return new Intl.DateTimeFormat(undefined, {
    year: 'numeric',
    month: 'short',
    ...(full ? { day: 'numeric' } : {}),
    ...(dateOnly ? { timeZone: 'UTC' } : {}),
  }).format(new Date(ms));
}

/** A custom value as badge/cell text; `null` for "nothing to show". */
export function formatCustomValue(def: CustomFieldDef, value: CustomFieldValue | undefined): string | null {
  if (value === null || value === undefined || value === '') return null;
  if (def.type === 'boolean') return value ? def.label : null;
  if (def.type === 'number' && typeof value === 'number') return `${def.label}: ${value.toLocaleString()}`;
  return String(value);
}

/**
 * A custom field's value for a table cell, where the column header already
 * names the field: `✓` for a true boolean, a localized number, else the text.
 * Empty values give `''`.
 */
export function formatCustomCell(def: CustomFieldDef, value: CustomFieldValue | undefined): string {
  if (value === null || value === undefined || value === '') return '';
  if (def.type === 'boolean') return value ? '✓' : '';
  if (def.type === 'number' && typeof value === 'number') return value.toLocaleString();
  return String(value);
}

/** The `PlayerVideo` the floating player expects, built from a grid item. */
export function toPlayerVideo(video: VideoItem) {
  return {
    videoId: video.videoId,
    title: video.title,
    meta: { channel: video.channel, publishedAt: video.publishedAt },
  };
}

/** `https://i.ytimg.com/vi/<id>/<quality>.jpg` */
export function thumbnailFor(videoId: string, quality: 'mqdefault' | 'hqdefault' | 'maxresdefault' = 'mqdefault'): string {
  return `https://i.ytimg.com/vi/${encodeURIComponent(videoId)}/${quality}.jpg`;
}
