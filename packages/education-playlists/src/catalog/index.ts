/**
 * @fileoverview The catalog as the widget and the server read it: the
 * taxonomy plus the preset playlists, and the lookups over them.
 */
import type { EducationCatalog, Playlist, PlaylistItem } from '../types';
import { EDUCATION_CATEGORIES } from './taxonomy';
import { MIT_OCW_PRESET_PLAYLISTS } from './mit-ocw-seed';

export { EDUCATION_CATEGORIES } from './taxonomy';
export { MIT_OCW_PRESET_PLAYLISTS, MIT_OCW_SEED_COURSES } from './mit-ocw-seed';
export type { SeedCourse } from './mit-ocw-seed';

/** The bundled catalog: every category, and every preset playlist. */
export function getDefaultCatalog(): EducationCatalog {
  return { categories: EDUCATION_CATEGORIES, playlists: MIT_OCW_PRESET_PLAYLISTS };
}

/** Narrows playlists to a category, major and program; any of them may be left out. */
export function filterPlaylists(
  playlists: Playlist[],
  filter: { categoryId?: string; majorId?: string; programId?: string },
): Playlist[] {
  return playlists.filter(
    (playlist) =>
      (!filter.categoryId || playlist.categoryId === filter.categoryId) &&
      (!filter.majorId || playlist.majorId === filter.majorId) &&
      (!filter.programId || playlist.programId === filter.programId),
  );
}

/** Every distinct item in the catalog, first occurrence wins. */
export function catalogItems(catalog: EducationCatalog): PlaylistItem[] {
  const seen = new Map<string, PlaylistItem>();
  for (const playlist of catalog.playlists) {
    for (const item of playlist.items) if (!seen.has(item.id)) seen.set(item.id, item);
  }
  return [...seen.values()];
}
