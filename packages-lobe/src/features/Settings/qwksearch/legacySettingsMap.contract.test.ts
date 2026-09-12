/**
 * The drift guard for § 2.1's map.
 *
 * `legacySettingsMap.ts` describes two codebases it cannot import: the legacy
 * settings surface, which lives in the root Bun workspace and is bundled for
 * Next.js, and the engine's own tab registry, which is a module full of
 * `dynamic()` imports that would pull half the SPA into this test. So both
 * halves are read from disk as text instead, and every claim the map makes
 * about a file, a section key or a tab is checked against the thing itself.
 *
 * What that buys: the map cannot quietly stop being true. If a tenth section
 * is added to `sections.json`, if a field is added to `search.json`, if
 * upstream renames or drops a settings pane, or if one of the legacy
 * components moves, this fails — instead of 2.4 reading a stale page and
 * deleting a section that had nowhere to land.
 *
 * It deliberately does not check *judgement*: whether a gap is really a gap is
 * not testable, and re-deciding it is the next run's job.
 */
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { SettingsTabs } from '@/store/global/initialState';

import {
  engineTabsInUse,
  LEGACY_SEARCH_FIELDS,
  LEGACY_SETTINGS_SECTIONS,
  retirementBlockers,
} from './legacySettingsMap';

/** `src/features/Settings/qwksearch` → `packages-lobe` → the repository root. */
const REPO_ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '../../../../..');
const ENGINE_ROOT = path.join(REPO_ROOT, 'packages-lobe');
const SETTINGS_FEATURES = path.join(ENGINE_ROOT, 'src/features/Settings');
const SCHEMA_DIR = path.join(REPO_ROOT, 'packages/research-agent-ui/src/settings');

const readJson = <T>(file: string): T => JSON.parse(readFileSync(file, 'utf8')) as T;

const sectionsJson = readJson<{ key: string; name: string }[]>(
  path.join(SCHEMA_DIR, 'sections.json'),
);
const searchJson = readJson<{ key: string }[]>(path.join(SCHEMA_DIR, 'search.json'));

/**
 * The tabs `componentMap.ts` actually registers, by enum *value*.
 *
 * Parsed rather than imported: the module body is `dynamic(() => import(...))`
 * for thirty panes, and evaluating it here would make this guard cost more
 * than the suite it lives in. A registration is always spelled
 * `[SettingsTabs.Foo]:`, so the source is an honest index of what is reachable.
 */
const registeredTabs = (): Set<string> => {
  const source = readFileSync(path.join(SETTINGS_FEATURES, 'features/componentMap.ts'), 'utf8');
  const names = [...source.matchAll(/\[SettingsTabs\.(\w+)\]:/g)].map(([, name]) => name);

  expect(names.length).toBeGreaterThan(10);

  return new Set(
    names.map((name) => {
      const value = (SettingsTabs as Record<string, string>)[name];
      expect(
        value,
        `componentMap registers SettingsTabs.${name}, which is not in the enum`,
      ).toBeDefined();
      return value;
    }),
  );
};

describe('the map covers the legacy surface exactly', () => {
  it('lists every section of sections.json, in order', () => {
    expect(LEGACY_SETTINGS_SECTIONS.map((section) => section.key)).toEqual(
      sectionsJson.map((section) => section.key),
    );
  });

  it('uses the labels the old surface shows', () => {
    const names = Object.fromEntries(sectionsJson.map((section) => [section.key, section.name]));

    for (const section of LEGACY_SETTINGS_SECTIONS) {
      expect(section.name, `${section.key} label`).toBe(names[section.key]);
    }
  });

  it('names legacy components that exist', () => {
    for (const section of LEGACY_SETTINGS_SECTIONS) {
      expect(
        existsSync(path.join(REPO_ROOT, section.legacyComponent)),
        section.legacyComponent,
      ).toBe(true);
    }
  });

  it('maps every field of search.json, in order', () => {
    expect(LEGACY_SEARCH_FIELDS.map((field) => field.key)).toEqual(
      searchJson.map((field) => field.key),
    );
  });
});

describe('the map points at engine panes that exist', () => {
  it('names feature directories that are present', () => {
    for (const section of LEGACY_SETTINGS_SECTIONS) {
      for (const feature of section.engineFeatures) {
        expect(
          existsSync(path.join(SETTINGS_FEATURES, feature)),
          `${section.key} → ${feature}`,
        ).toBe(true);
      }
    }
  });

  it('only names tabs componentMap registers', () => {
    const registered = registeredTabs();

    for (const section of LEGACY_SETTINGS_SECTIONS) {
      for (const tab of section.engineTabs) {
        expect(registered.has(tab), `${section.key} → SettingsTabs "${tab}" is not reachable`).toBe(
          true,
        );
      }
    }
  });

  it('includes both QwkSearch panes among the tabs in use', () => {
    // The two panes 2.2 shipped are the reason Phase 2 is not blocked on UI.
    // If either stops appearing here, the map has lost the work they did.
    expect(engineTabsInUse()).toEqual(
      expect.arrayContaining([SettingsTabs.Search, SettingsTabs.Extraction]),
    );
  });
});

describe('status and gaps stay consistent', () => {
  it('gives every non-covered section at least one gap', () => {
    for (const section of LEGACY_SETTINGS_SECTIONS) {
      if (section.status === 'covered') {
        expect(section.gaps, `${section.key} is covered but lists gaps`).toEqual([]);
      } else {
        expect(
          section.gaps.length,
          `${section.key} is ${section.status} with no gap recorded`,
        ).toBeGreaterThan(0);
      }
    }
  });

  it('leaves engineTabs empty exactly for the sections with no engine home', () => {
    for (const section of LEGACY_SETTINGS_SECTIONS) {
      expect(section.engineTabs.length === 0, `${section.key} (${section.status})`).toBe(
        section.status === 'gap',
      );
      expect(section.engineFeatures.length === 0, `${section.key} (${section.status})`).toBe(
        section.status === 'gap',
      );
    }
  });

  it('reports the sections 2.4 is blocked on', () => {
    expect(retirementBlockers().map((section) => section.key)).toEqual(
      LEGACY_SETTINGS_SECTIONS.filter((section) => section.status !== 'covered').map(
        (section) => section.key,
      ),
    );
  });

  it('is not finished — a run that clears the last blocker should delete this file too', () => {
    // Phase 2.4 may delete the old surface when this is 0. Until then the
    // number is the honest answer to "is the map done?", and an assertion is
    // how a run that clears one notices it has to update the page as well.
    expect(retirementBlockers().length).toBe(9);
  });
});
