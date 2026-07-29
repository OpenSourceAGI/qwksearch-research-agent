import { describe, expect, it } from 'vitest';
import { CategoryDock, ThemeMenu, CategoryDockProvider, Dock } from '../src/index';

// Smoke test against the package's real main entry point (src/index.ts).
// Unlike research-agent-ui, this package's exports are plain component/hook
// definitions (dock, dropdown menu, theme switcher) with no top-level
// browser/audio API access, so importing the full barrel is safe under jsdom.
describe('shadcn-app-dock package entry (src/index)', () => {
    it('exports CategoryDock component', () => {
        expect(CategoryDock).toBeDefined();
    });

    it('exports ThemeMenu component', () => {
        expect(ThemeMenu).toBeDefined();
    });

    it('exports CategoryDockProvider', () => {
        expect(CategoryDockProvider).toBeDefined();
        expect(typeof CategoryDockProvider).toBe('function');
    });

    it('exports the Dock primitive', () => {
        expect(Dock).toBeDefined();
    });
});
