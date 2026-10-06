import { describe, it, expect } from 'vitest';
import { getDefaultCatalog, filterPlaylists, catalogItems, MIT_OCW_SEED_COURSES } from '../src/catalog';

describe('bundled MIT OCW catalog', () => {
  const catalog = getDefaultCatalog();

  it('files every preset playlist under a category, major and program that exist', () => {
    for (const playlist of catalog.playlists) {
      const category = catalog.categories.find((c) => c.id === playlist.categoryId);
      const major = category?.majors.find((m) => m.id === playlist.majorId);
      expect(major, `${playlist.id} has no major`).toBeDefined();
      expect(major!.programs.some((p) => p.id === playlist.programId), `${playlist.id} has no program`).toBe(true);
      expect(playlist.visibility).toBe('preset');
    }
  });

  it('gives every program at least one playlist', () => {
    for (const category of catalog.categories)
      for (const major of category.majors)
        for (const program of major.programs)
          expect(filterPlaylists(catalog.playlists, { programId: program.id }).length, program.id).toBeGreaterThan(0);
  });

  it('links courseware to the canonical OCW course page and marks seed records unverified', () => {
    for (const item of catalogItems(catalog)) {
      expect(item.minutes).toBeGreaterThan(0);
      expect(item.estimate).toBe('rough');
      expect(item.provenance).toMatchObject({ provider: 'mit_ocw', method: 'curated_seed', verified: false });
      if (item.kind === 'courseware') expect(item.url).toMatch(/^https:\/\/ocw\.mit\.edu\/courses\/[a-z0-9-]+\/$/);
      else expect(item.url).toMatch(/^https:\/\/www\.youtube\.com\/@mitocw\/search\?query=/);
    }
  });

  it('keeps a course with no recorded lectures to its courseware', () => {
    const items = catalogItems(catalog).filter((item) => item.courseNumber === '18.05');
    expect(items.map((item) => item.kind)).toEqual(['courseware']);
    expect(MIT_OCW_SEED_COURSES['18.05'].lectures).toBe(0);
  });

  it('has unique item ids', () => {
    const ids = catalogItems(catalog).map((item) => item.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
