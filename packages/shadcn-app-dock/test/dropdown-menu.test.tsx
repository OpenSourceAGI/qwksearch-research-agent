import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import {
    DropdownMenu,
    DropdownMenuCheckboxItem,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuPortal,
    DropdownMenuRadioGroup,
    DropdownMenuRadioItem,
    DropdownMenuSeparator,
    DropdownMenuShortcut,
    DropdownMenuSub,
    DropdownMenuSubContent,
    DropdownMenuSubTrigger,
    DropdownMenuTrigger,
} from '../src/components/dropdown-menu';

/** Renders `children` inside an already-open dropdown so the portal content mounts. */
function renderOpen(children: React.ReactNode) {
    return render(
        <DropdownMenu defaultOpen>
            <DropdownMenuTrigger>open</DropdownMenuTrigger>
            <DropdownMenuContent>{children}</DropdownMenuContent>
        </DropdownMenu>
    );
}

function slot(name: string) {
    return document.querySelector(`[data-slot="dropdown-menu-${name}"]`);
}

describe('DropdownMenu', () => {
    it('keeps the content unmounted while closed', () => {
        render(
            <DropdownMenu>
                <DropdownMenuTrigger>open</DropdownMenuTrigger>
                <DropdownMenuContent>
                    <DropdownMenuItem>Hidden</DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        );

        expect(screen.queryByText('Hidden')).toBeNull();
        expect(slot('trigger')).not.toBeNull();
    });

    it('mounts the content when open', () => {
        renderOpen(<DropdownMenuItem>Visible</DropdownMenuItem>);

        expect(screen.getByText('Visible')).toBeDefined();
        expect(slot('content')).not.toBeNull();
    });

    it('merges a custom class name onto the content', () => {
        render(
            <DropdownMenu defaultOpen>
                <DropdownMenuTrigger>open</DropdownMenuTrigger>
                <DropdownMenuContent className="w-72">
                    <DropdownMenuItem>Wide</DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        );

        const wide = screen.getByText('Wide').closest('[data-slot="dropdown-menu-content"]');
        expect(wide?.className).toContain('w-72');
    });
});

describe('DropdownMenuItem', () => {
    it('fires onSelect when clicked', () => {
        const onSelect = vi.fn();
        renderOpen(<DropdownMenuItem onSelect={onSelect}>Click me</DropdownMenuItem>);

        fireEvent.click(screen.getByText('Click me'));

        expect(onSelect).toHaveBeenCalledTimes(1);
    });

    it('defaults to the "default" variant', () => {
        renderOpen(<DropdownMenuItem>Plain</DropdownMenuItem>);

        expect(screen.getByText('Plain').getAttribute('data-variant')).toBe('default');
    });

    it('supports the destructive variant', () => {
        renderOpen(<DropdownMenuItem variant="destructive">Delete</DropdownMenuItem>);

        expect(screen.getByText('Delete').getAttribute('data-variant')).toBe('destructive');
    });

    it('supports inset spacing', () => {
        renderOpen(<DropdownMenuItem inset>Indented</DropdownMenuItem>);

        expect(screen.getByText('Indented').getAttribute('data-inset')).toBe('true');
    });

    it('does not fire onSelect when disabled', () => {
        const onSelect = vi.fn();
        renderOpen(
            <DropdownMenuItem disabled onSelect={onSelect}>
                Disabled
            </DropdownMenuItem>
        );

        fireEvent.click(screen.getByText('Disabled'));

        expect(onSelect).not.toHaveBeenCalled();
    });

    it('merges a custom class name', () => {
        renderOpen(<DropdownMenuItem className="my-item">Styled</DropdownMenuItem>);

        expect(screen.getByText('Styled').className).toContain('my-item');
    });
});

describe('DropdownMenuCheckboxItem', () => {
    it('renders the indicator only when checked', () => {
        renderOpen(
            <>
                <DropdownMenuCheckboxItem checked>On</DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem checked={false}>Off</DropdownMenuCheckboxItem>
            </>
        );

        expect(screen.getByText('On').querySelector('svg')).not.toBeNull();
        expect(screen.getByText('Off').querySelector('svg')).toBeNull();
    });

    it('reports the new state on change', () => {
        const onCheckedChange = vi.fn();
        renderOpen(
            <DropdownMenuCheckboxItem checked={false} onCheckedChange={onCheckedChange}>
                Toggle
            </DropdownMenuCheckboxItem>
        );

        fireEvent.click(screen.getByText('Toggle'));

        expect(onCheckedChange).toHaveBeenCalledWith(true);
    });

    it('merges a custom class name', () => {
        renderOpen(
            <DropdownMenuCheckboxItem className="my-check" checked>
                Styled
            </DropdownMenuCheckboxItem>
        );

        expect(screen.getByText('Styled').className).toContain('my-check');
    });
});

describe('DropdownMenuRadioGroup', () => {
    it('marks the selected radio item', () => {
        renderOpen(
            <DropdownMenuRadioGroup value="b">
                <DropdownMenuRadioItem value="a">A</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="b">B</DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
        );

        expect(screen.getByText('A').getAttribute('data-state')).toBe('unchecked');
        expect(screen.getByText('B').getAttribute('data-state')).toBe('checked');
        expect(slot('radio-group')).not.toBeNull();
    });

    it('reports the newly selected value', () => {
        const onValueChange = vi.fn();
        renderOpen(
            <DropdownMenuRadioGroup value="a" onValueChange={onValueChange}>
                <DropdownMenuRadioItem value="a">A</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="b">B</DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
        );

        fireEvent.click(screen.getByText('B'));

        expect(onValueChange).toHaveBeenCalledWith('b');
    });

    it('merges a custom class name onto the radio item', () => {
        renderOpen(
            <DropdownMenuRadioGroup value="a">
                <DropdownMenuRadioItem className="my-radio" value="a">
                    A
                </DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
        );

        expect(screen.getByText('A').className).toContain('my-radio');
    });
});

describe('DropdownMenuLabel, Separator, Shortcut and Group', () => {
    it('renders a label, optionally inset', () => {
        renderOpen(
            <>
                <DropdownMenuLabel>Section</DropdownMenuLabel>
                <DropdownMenuLabel inset className="my-label">
                    Inset section
                </DropdownMenuLabel>
            </>
        );

        expect(screen.getByText('Section').getAttribute('data-slot')).toBe('dropdown-menu-label');
        expect(screen.getByText('Inset section').getAttribute('data-inset')).toBe('true');
        expect(screen.getByText('Inset section').className).toContain('my-label');
    });

    it('renders a separator', () => {
        renderOpen(
            <>
                <DropdownMenuItem>Above</DropdownMenuItem>
                <DropdownMenuSeparator className="my-sep" />
                <DropdownMenuItem>Below</DropdownMenuItem>
            </>
        );

        const separator = slot('separator')!;
        expect(separator).not.toBeNull();
        expect(separator.className).toContain('my-sep');
    });

    it('renders a keyboard shortcut hint', () => {
        renderOpen(
            <DropdownMenuItem>
                Save
                <DropdownMenuShortcut className="my-shortcut">⌘S</DropdownMenuShortcut>
            </DropdownMenuItem>
        );

        const shortcut = screen.getByText('⌘S');
        expect(shortcut.getAttribute('data-slot')).toBe('dropdown-menu-shortcut');
        expect(shortcut.className).toContain('my-shortcut');
    });

    it('groups items', () => {
        renderOpen(
            <DropdownMenuGroup>
                <DropdownMenuItem>Grouped</DropdownMenuItem>
            </DropdownMenuGroup>
        );

        expect(slot('group')).not.toBeNull();
    });
});

describe('DropdownMenuSub', () => {
    it('renders a sub trigger with its chevron and keeps the submenu closed', () => {
        renderOpen(
            <DropdownMenuSub>
                <DropdownMenuSubTrigger className="my-sub-trigger">More</DropdownMenuSubTrigger>
                <DropdownMenuSubContent>
                    <DropdownMenuItem>Nested</DropdownMenuItem>
                </DropdownMenuSubContent>
            </DropdownMenuSub>
        );

        const trigger = slot('sub-trigger')!;
        expect(trigger.textContent).toContain('More');
        expect(trigger.querySelector('svg')).not.toBeNull();
        expect(trigger.className).toContain('my-sub-trigger');
        expect(screen.queryByText('Nested')).toBeNull();
    });

    it('mounts the sub content when the submenu opens', () => {
        renderOpen(
            <DropdownMenuSub open>
                <DropdownMenuSubTrigger inset>More</DropdownMenuSubTrigger>
                <DropdownMenuSubContent className="my-sub-content">
                    <DropdownMenuItem>Nested</DropdownMenuItem>
                </DropdownMenuSubContent>
            </DropdownMenuSub>
        );

        expect(screen.getByText('Nested')).toBeDefined();
        expect(slot('sub-trigger')!.getAttribute('data-inset')).toBe('true');
        expect(slot('sub-content')!.className).toContain('my-sub-content');
    });
});

describe('DropdownMenuPortal', () => {
    it('renders its children through a portal', () => {
        render(
            <DropdownMenu defaultOpen>
                <DropdownMenuTrigger>open</DropdownMenuTrigger>
                <DropdownMenuPortal>
                    <span>portalled</span>
                </DropdownMenuPortal>
            </DropdownMenu>
        );

        expect(screen.getByText('portalled')).toBeDefined();
        expect(slot('portal')).toBeNull();
    });
});
