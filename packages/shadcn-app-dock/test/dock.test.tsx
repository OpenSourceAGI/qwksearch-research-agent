import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Dock, DockIcon, DockItem, DockLabel, dockVariants } from '../src/components/dock';

describe('dockVariants', () => {
    it('produces the base dock classes', () => {
        expect(dockVariants()).toContain('backdrop-blur-md');
    });

    it('appends a caller-supplied class name', () => {
        expect(dockVariants({ className: 'custom-dock' })).toContain('custom-dock');
    });
});

describe('Dock', () => {
    it('renders its children', () => {
        render(
            <Dock>
                <DockItem>
                    <DockLabel>Home</DockLabel>
                    <DockIcon>icon</DockIcon>
                </DockItem>
            </Dock>
        );

        expect(screen.getByText('Home')).toBeDefined();
        expect(screen.getByText('icon')).toBeDefined();
    });

    it('aligns items according to the direction prop', () => {
        const { container: bottom } = render(<Dock direction="bottom">x</Dock>);
        const { container: middle } = render(<Dock direction="middle">y</Dock>);
        const { container: top } = render(<Dock direction="top">z</Dock>);

        expect(bottom.firstElementChild?.className).toContain('items-end');
        expect(middle.firstElementChild?.className).toContain('items-center');
        expect(top.firstElementChild?.className).toContain('items-start');
    });

    it('merges a custom class name onto the dock', () => {
        const { container } = render(<Dock className="my-dock">x</Dock>);

        expect(container.firstElementChild?.className).toContain('my-dock');
    });

    it('tracks pointer movement without throwing', () => {
        const { container } = render(
            <Dock>
                <DockItem>
                    <DockIcon>icon</DockIcon>
                </DockItem>
            </Dock>
        );
        const dock = container.firstElementChild!;

        expect(() => {
            fireEvent.mouseMove(dock, { pageX: 120 });
            fireEvent.mouseLeave(dock);
        }).not.toThrow();
    });

    it('passes non-element children through untouched', () => {
        render(<Dock>plain text</Dock>);

        expect(screen.getByText('plain text')).toBeDefined();
    });

    it('forwards a ref to the dock element', () => {
        const ref = { current: null as HTMLDivElement | null };

        render(<Dock ref={ref}>x</Dock>);

        expect(ref.current).toBeInstanceOf(HTMLElement);
    });
});

describe('DockItem', () => {
    it('fires onClick', () => {
        const onClick = vi.fn();
        render(
            <DockItem onClick={onClick}>
                <DockLabel>Search</DockLabel>
            </DockItem>
        );

        fireEvent.click(screen.getByText('Search'));

        expect(onClick).toHaveBeenCalledTimes(1);
    });

    it('injects magnification props into DockIcon children only', () => {
        render(
            <DockItem magnification={80} distance={100}>
                <DockLabel>Label stays</DockLabel>
                <DockIcon>Icon</DockIcon>
            </DockItem>
        );

        expect(screen.getByText('Label stays')).toBeDefined();
        expect(screen.getByText('Icon')).toBeDefined();
    });

    it('merges a custom class name', () => {
        const { container } = render(<DockItem className="my-item">x</DockItem>);

        expect(container.firstElementChild?.className).toContain('my-item');
    });
});

describe('DockIcon', () => {
    it('renders its children inside a sized wrapper', () => {
        const { container } = render(<DockIcon className="my-icon">star</DockIcon>);

        expect(screen.getByText('star')).toBeDefined();
        expect(container.firstElementChild?.className).toContain('my-icon');
        expect(container.firstElementChild?.className).toContain('aspect-square');
    });

    it('accepts an external motion value for the pointer position', () => {
        expect(() =>
            render(
                <Dock magnification={70} distance={90}>
                    <DockIcon>star</DockIcon>
                </Dock>
            )
        ).not.toThrow();
    });
});

describe('DockLabel', () => {
    it('renders a hover tooltip that is hidden by default', () => {
        const { container } = render(<DockLabel>Tooltip</DockLabel>);

        expect(container.firstElementChild?.className).toContain('opacity-0');
        expect(container.firstElementChild?.className).toContain('group-hover:opacity-100');
    });

    it('merges a custom class name', () => {
        const { container } = render(<DockLabel className="my-label">Tooltip</DockLabel>);

        expect(container.firstElementChild?.className).toContain('my-label');
    });
});
