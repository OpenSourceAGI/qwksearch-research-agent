import { render, screen, fireEvent } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const themeState = { theme: 'system' as string | undefined };
const setTheme = vi.fn((next: string) => {
    themeState.theme = next;
});

vi.mock('next-themes', () => ({
    useTheme: () => ({ theme: themeState.theme, setTheme }),
}));

// A small, fixed theme list keeps the assertions independent of the upstream package.
vi.mock('shadcn-theme-menu', () => ({
    themeNames: ['modern-minimal', 'ocean-breeze'],
    themeColors: {
        'modern-minimal': { primary: '#111111', secondary: '#222222' },
    },
    formatThemeName: (name: string) =>
        name
            .split('-')
            .map((part) => part[0].toUpperCase() + part.slice(1))
            .join(' '),
}));

const { ThemeMenu } = await import('../src/theme-menu');
const { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } = await import(
    '../src/components/dropdown-menu'
);

function renderMenu(props: Parameters<typeof ThemeMenu>[0] = {}) {
    return render(
        <DropdownMenu defaultOpen>
            <DropdownMenuTrigger>open</DropdownMenuTrigger>
            <DropdownMenuContent>
                <ThemeMenu {...props} />
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

beforeEach(() => {
    window.localStorage.clear();
    document.documentElement.className = '';
    document.cookie = 'color-theme=; path=/; max-age=0';
    themeState.theme = 'system';
    setTheme.mockClear();
});

afterEach(() => {
    document.documentElement.className = '';
});

describe('ThemeMenu appearance section', () => {
    it('renders the light/dark/system options by default', () => {
        renderMenu();

        expect(screen.getByText('Appearance')).toBeDefined();
        expect(screen.getByText('Light')).toBeDefined();
        expect(screen.getByText('Dark')).toBeDefined();
        expect(screen.getByText('System')).toBeDefined();
    });

    it('can be hidden', () => {
        renderMenu({ showAppearance: false });

        expect(screen.queryByText('Appearance')).toBeNull();
        expect(screen.queryByText('Light')).toBeNull();
        expect(screen.getByText('Color Theme')).toBeDefined();
    });

    it('switches the appearance when an option is clicked', () => {
        renderMenu();

        fireEvent.click(screen.getByText('Dark'));

        expect(setTheme).toHaveBeenCalledWith('dark');
    });

    it('marks the active appearance with a check', () => {
        themeState.theme = 'light';
        const { container } = renderMenu();

        const lightRow = screen.getByText('Light').closest('[data-slot="dropdown-menu-item"]')!;
        expect(lightRow.textContent).toContain('✓');
        expect(container).toBeDefined();
    });
});

describe('ThemeMenu color themes', () => {
    it('lists every known color theme with a formatted name', () => {
        renderMenu();

        expect(screen.getByText('Modern Minimal')).toBeDefined();
        expect(screen.getByText('Ocean Breeze')).toBeDefined();
    });

    it('shows the default color theme as current', () => {
        renderMenu();

        expect(screen.getByText(/Current:/).textContent).toBe('Current: Modern Minimal');
    });

    it('restores a persisted color theme', () => {
        window.localStorage.setItem('color-theme', 'ocean-breeze');

        renderMenu();

        expect(screen.getByText(/Current:/).textContent).toBe('Current: Ocean Breeze');
    });

    it('ignores a persisted theme that is no longer known', () => {
        window.localStorage.setItem('color-theme', 'retired-theme');

        renderMenu();

        expect(screen.getByText(/Current:/).textContent).toBe('Current: Modern Minimal');
    });

    it('honours the defaultColorTheme prop', () => {
        renderMenu({ defaultColorTheme: 'ocean-breeze' });

        expect(screen.getByText(/Current:/).textContent).toBe('Current: Ocean Breeze');
    });

    it('renders swatches only for themes that declare colors', () => {
        const { baseElement } = renderMenu();

        const swatches = baseElement.querySelectorAll('[style*="background-color"]');
        expect(swatches).toHaveLength(2);
    });

    it('persists the chosen theme to localStorage, a cookie and the root class', () => {
        renderMenu();

        fireEvent.click(screen.getByText('Ocean Breeze'));

        expect(window.localStorage.getItem('color-theme')).toBe('ocean-breeze');
        expect(document.cookie).toContain('color-theme=ocean-breeze');
        expect(document.documentElement.classList.contains('theme-ocean-breeze')).toBe(true);
        expect(document.documentElement.classList.contains('theme-modern-minimal')).toBe(false);
    });

    it('previews a theme on hover', () => {
        renderMenu();

        fireEvent.mouseEnter(screen.getByText('Ocean Breeze'));

        expect(document.documentElement.classList.contains('theme-ocean-breeze')).toBe(true);
        // Hover previews are not persisted.
        expect(window.localStorage.getItem('color-theme')).toBeNull();
    });

    it('restores the selected theme when the preview ends', () => {
        renderMenu();

        fireEvent.mouseEnter(screen.getByText('Ocean Breeze'));
        fireEvent.mouseLeave(screen.getByText('Ocean Breeze'));

        expect(document.documentElement.classList.contains('theme-modern-minimal')).toBe(true);
        expect(document.documentElement.classList.contains('theme-ocean-breeze')).toBe(false);
    });

    it('does nothing when a mouse leave arrives without a preview', () => {
        renderMenu();

        fireEvent.mouseLeave(screen.getByText('Ocean Breeze'));

        expect(document.documentElement.className).toBe('');
    });

    it('highlights the selected color theme', () => {
        renderMenu();

        const row = screen.getByText('Modern Minimal').closest('[data-slot="dropdown-menu-item"]')!;
        expect(row.className).toContain('bg-accent');
        expect(row.textContent).toContain('✓');
    });
});
