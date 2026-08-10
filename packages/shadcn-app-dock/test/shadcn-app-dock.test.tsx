import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { CategoryDock, type DockNavItem } from '../src/shadcn-app-dock';

const items: DockNavItem[] = [
    { key: 'home', label: 'Home', icon: <span>H</span>, onClick: vi.fn() },
    { key: 'news', label: 'News', icon: <span>N</span>, active: true, onClick: vi.fn() },
];

function makeItems() {
    return [
        { key: 'home', label: 'Home', icon: <span>H</span>, onClick: vi.fn() },
        { key: 'news', label: 'News', icon: <span>N</span>, active: true, onClick: vi.fn() },
    ] satisfies DockNavItem[];
}

describe('CategoryDock', () => {
    it('renders both the desktop and mobile placements by default', () => {
        render(<CategoryDock items={items} />);

        // One label per placement.
        expect(screen.getAllByText('Home')).toHaveLength(2);
        expect(screen.getAllByText('News')).toHaveLength(2);
    });

    it('renders only the desktop placement when asked', () => {
        const { container } = render(
            <CategoryDock items={items} placements={{ desktop: true, mobile: false }} />
        );

        expect(screen.getAllByText('Home')).toHaveLength(1);
        expect(container.querySelector('.md\\:hidden')).toBeNull();
    });

    it('renders only the mobile placement when asked', () => {
        const { container } = render(
            <CategoryDock items={items} placements={{ desktop: false, mobile: true }} />
        );

        expect(screen.getAllByText('Home')).toHaveLength(1);
        expect(container.querySelector('.md\\:block')).toBeNull();
    });

    it('highlights the active item', () => {
        render(<CategoryDock items={items} placements={{ mobile: false }} />);

        const activeItem = screen.getByText('News').closest('div.relative')!;
        expect(activeItem.className).toContain('ring-primary');
    });

    it('calls the item onClick when clicked', () => {
        const current = makeItems();
        render(<CategoryDock items={current} placements={{ mobile: false }} />);

        fireEvent.click(screen.getByText('Home').closest('div.relative')!);

        expect(current[0].onClick).toHaveBeenCalledTimes(1);
    });

    it('renders string icons through the default <img> renderer', () => {
        render(
            <CategoryDock
                items={[{ key: 'logo', label: 'Logo', icon: '/logo.png' }]}
                placements={{ mobile: false }}
            />
        );

        const img = screen.getByAltText('Logo') as HTMLImageElement;
        expect(img.tagName).toBe('IMG');
        expect(img.getAttribute('src')).toBe('/logo.png');
        expect(img.getAttribute('width')).toBe('24');
    });

    it('uses a custom renderImage when provided', () => {
        const renderImage = vi.fn((src: string, alt: string, size: number) => (
            <span data-testid="custom-image">{`${alt}:${src}:${size}`}</span>
        ));

        render(
            <CategoryDock
                items={[{ key: 'logo', label: 'Logo', icon: '/logo.png' }]}
                renderImage={renderImage}
                placements={{ mobile: false }}
            />
        );

        expect(screen.getByTestId('custom-image').textContent).toBe('Logo:/logo.png:24');
        expect(renderImage).toHaveBeenCalledWith('/logo.png', 'Logo', 24);
    });

    it('applies a custom class name to each placement wrapper', () => {
        const { container } = render(<CategoryDock items={items} className="my-dock" />);

        expect(container.querySelectorAll('.my-dock')).toHaveLength(2);
    });

    it('shifts the mobile dock to the end when asked', () => {
        const { container } = render(
            <CategoryDock items={items} mobileAlign="end" placements={{ desktop: false }} />
        );

        expect(container.innerHTML).toContain('sm:ml-auto');
    });

    it('centers the mobile dock by default', () => {
        const { container } = render(
            <CategoryDock items={items} placements={{ desktop: false }} />
        );

        expect(container.innerHTML).not.toContain('sm:ml-auto');
    });

    it('renders a dropdown trigger for items with a menu', () => {
        render(
            <CategoryDock
                items={[
                    {
                        key: 'theme',
                        label: 'Theme',
                        icon: <span>T</span>,
                        menu: { renderContent: () => <span>menu body</span> },
                    },
                ]}
                placements={{ mobile: false }}
            />
        );

        expect(screen.getByText('Theme')).toBeDefined();
        expect(document.querySelector('[data-slot="dropdown-menu-trigger"]')).not.toBeNull();
        // The body only mounts once the menu opens.
        expect(screen.queryByText('menu body')).toBeNull();
    });

    it('prefers the menu trigger icon and label over the item ones', () => {
        render(
            <CategoryDock
                items={[
                    {
                        key: 'theme',
                        label: 'Item label',
                        icon: <span>item icon</span>,
                        menu: {
                            triggerIcon: <span>menu icon</span>,
                            triggerLabel: 'Menu label',
                            renderContent: () => null,
                        },
                    },
                ]}
                placements={{ mobile: false }}
            />
        );

        expect(screen.getByText('Menu label')).toBeDefined();
        expect(screen.getByText('menu icon')).toBeDefined();
        expect(screen.queryByText('Item label')).toBeNull();
    });

    it('renders a menu trigger with no icon at all', () => {
        expect(() =>
            render(
                <CategoryDock
                    items={[{ key: 'blank', label: 'Blank', menu: { renderContent: () => null } } as any]}
                    placements={{ mobile: false }}
                />
            )
        ).not.toThrow();
    });
});

describe('CategoryDock keyboard shortcuts', () => {
    it('are off by default', () => {
        const current = makeItems();
        render(<CategoryDock items={current} placements={{ mobile: false }} />);

        fireEvent.keyDown(window, { key: '1', altKey: true });

        expect(current[0].onClick).not.toHaveBeenCalled();
    });

    it('map Alt+N to the Nth item', () => {
        const current = makeItems();
        render(
            <CategoryDock items={current} enableKeyboardShortcuts placements={{ mobile: false }} />
        );

        fireEvent.keyDown(window, { key: '2', altKey: true });

        expect(current[1].onClick).toHaveBeenCalledTimes(1);
        expect(current[0].onClick).not.toHaveBeenCalled();
    });

    it('ignore numbers past the end of the list', () => {
        const current = makeItems();
        render(
            <CategoryDock items={current} enableKeyboardShortcuts placements={{ mobile: false }} />
        );

        fireEvent.keyDown(window, { key: '9', altKey: true });

        expect(current[0].onClick).not.toHaveBeenCalled();
        expect(current[1].onClick).not.toHaveBeenCalled();
    });

    it('ignore non-numeric keys', () => {
        const current = makeItems();
        render(
            <CategoryDock items={current} enableKeyboardShortcuts placements={{ mobile: false }} />
        );

        fireEvent.keyDown(window, { key: 'a', altKey: true });

        expect(current[0].onClick).not.toHaveBeenCalled();
    });

    it('ignore Alt combined with another modifier', () => {
        const current = makeItems();
        render(
            <CategoryDock items={current} enableKeyboardShortcuts placements={{ mobile: false }} />
        );

        fireEvent.keyDown(window, { key: '1', altKey: true, shiftKey: true });
        fireEvent.keyDown(window, { key: '1', altKey: true, ctrlKey: true });
        fireEvent.keyDown(window, { key: '1', altKey: true, metaKey: true });
        fireEvent.keyDown(window, { key: '1' });

        expect(current[0].onClick).not.toHaveBeenCalled();
    });

    it('stop listening once unmounted', () => {
        const current = makeItems();
        const { unmount } = render(
            <CategoryDock items={current} enableKeyboardShortcuts placements={{ mobile: false }} />
        );

        unmount();
        fireEvent.keyDown(window, { key: '1', altKey: true });

        expect(current[0].onClick).not.toHaveBeenCalled();
    });

    it('tolerate an item without an onClick handler', () => {
        render(
            <CategoryDock
                items={[{ key: 'noop', label: 'Noop', icon: <span>x</span> }]}
                enableKeyboardShortcuts
                placements={{ mobile: false }}
            />
        );

        expect(() => fireEvent.keyDown(window, { key: '1', altKey: true })).not.toThrow();
    });
});
