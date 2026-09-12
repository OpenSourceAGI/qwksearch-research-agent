/**
 * @fileoverview Guards the app shell against regrowing a second, global
 * sidebar — and against losing the dock menu that replaced it.
 *
 * #420 moved the dock's Settings menu into an `AppSidebar` mounted by
 * `QwkSearchProviders`, so it rendered on every surface the shell wraps.
 * #430 reverted it: because the sidebar mounted globally it also overlaid the
 * REASON workspace — its fixed toggle sat on top of REASON's own trigger in
 * the top-left corner, and on desktop the collapsed rail left a sliver of a
 * second sidebar beside REASON's. REASON's sidebar footer already offers
 * Settings, Login/Sign Out and the panel menu, so the overlay only duplicated
 * chrome that was there.
 *
 * The revert deleted a file, which is the kind of change a later "restore the
 * sidebar" patch reintroduces without anything failing — the duplicate chrome
 * is only visible on the one route (`/workspace`) a reviewer may not open. So
 * the decision is asserted here rather than left to memory, in the same shape
 * as `entryBoundaries.test.ts`: scan the source, not the DOM.
 *
 * The second half is the other side of the same decision. Those controls have
 * to live *somewhere*: the marketing and settings routes never mount REASON,
 * so if the dock's Settings menu is removed as well, Settings, Login/Logout
 * and the theme picker become unreachable there.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const SRC = resolve(dirname(fileURLToPath(import.meta.url)), '../src');

/** Every `.ts`/`.tsx` source file in the package, recursively. */
function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) return sourceFiles(path);
    return /\.tsx?$/.test(path) ? [path] : [];
  });
}

/**
 * Markers of the reverted sidebar. They are deliberately about *this* shell's
 * own chrome: REASON's editor sidebar (`react-reason-editor-sidebar`) and the
 * dock's own panels are a different surface and match none of these.
 */
const SIDEBAR_MARKERS = [
  'AppSidebar',
  'application-sidebar',
  'application sidebar',
  'siteLinksForPath',
];

describe('app shell chrome', () => {
  it('mounts no global application sidebar', () => {
    const offenders = sourceFiles(SRC).flatMap((file) => {
      const source = readFileSync(file, 'utf8');
      return SIDEBAR_MARKERS.filter((marker) => source.includes(marker)).map(
        (marker) => `${relative(SRC, file)}: ${marker}`,
      );
    });

    expect(offenders).toEqual([]);
  });

  it("keeps Settings, Login/Logout and the theme picker in the dock's menu", () => {
    const dock = readFileSync(resolve(SRC, 'app/CategoryDock.tsx'), 'utf8');

    expect(dock).toContain('<ThemeMenu />');
    for (const label of ['Settings', 'Login', 'Logout']) {
      expect(dock).toContain(`<span className="text-sm">${label}</span>`);
    }
  });
});
