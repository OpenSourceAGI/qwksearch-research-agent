import { act, render, screen, fireEvent } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
    CategoryDockProvider,
    useCategoryDock,
    useCategoryDockState,
    useCategoryDockVisibility,
} from '../src/shadcn-app-dock-context';

function StateReadout() {
    const state = useCategoryDockState();
    return <div data-testid="state">{state ? String(state.currentCategory) : 'none'}</div>;
}

function VisibilityReadout() {
    const { dockHidden, toggleDock } = useCategoryDockVisibility();
    return (
        <button type="button" onClick={toggleDock} data-testid="visibility">
            {dockHidden ? 'hidden' : 'visible'}
        </button>
    );
}

function Page({ category, onChange }: { category: string; onChange: (c: any) => void }) {
    useCategoryDock(category, onChange);
    return null;
}

beforeEach(() => {
    window.localStorage.clear();
});

describe('CategoryDockProvider', () => {
    it('renders its children', () => {
        render(
            <CategoryDockProvider>
                <span>child</span>
            </CategoryDockProvider>
        );

        expect(screen.getByText('child')).toBeDefined();
    });

    it('starts with no registered category state', () => {
        render(
            <CategoryDockProvider>
                <StateReadout />
            </CategoryDockProvider>
        );

        expect(screen.getByTestId('state').textContent).toBe('none');
    });

    it('starts visible when nothing is persisted', () => {
        render(
            <CategoryDockProvider>
                <VisibilityReadout />
            </CategoryDockProvider>
        );

        expect(screen.getByTestId('visibility').textContent).toBe('visible');
    });

    it('restores the hidden flag from localStorage', () => {
        window.localStorage.setItem('dock-hidden', 'true');

        render(
            <CategoryDockProvider>
                <VisibilityReadout />
            </CategoryDockProvider>
        );

        expect(screen.getByTestId('visibility').textContent).toBe('hidden');
    });

    it('ignores a non-"true" persisted value', () => {
        window.localStorage.setItem('dock-hidden', 'nope');

        render(
            <CategoryDockProvider>
                <VisibilityReadout />
            </CategoryDockProvider>
        );

        expect(screen.getByTestId('visibility').textContent).toBe('visible');
    });

    it('persists the flag when the dock is toggled', () => {
        render(
            <CategoryDockProvider>
                <VisibilityReadout />
            </CategoryDockProvider>
        );

        fireEvent.click(screen.getByTestId('visibility'));

        expect(screen.getByTestId('visibility').textContent).toBe('hidden');
        expect(window.localStorage.getItem('dock-hidden')).toBe('true');

        fireEvent.click(screen.getByTestId('visibility'));

        expect(screen.getByTestId('visibility').textContent).toBe('visible');
        expect(window.localStorage.getItem('dock-hidden')).toBe('false');
    });
});

describe('useCategoryDock', () => {
    it('registers the page category into the shared state', () => {
        render(
            <CategoryDockProvider>
                <Page category="news" onChange={() => {}} />
                <StateReadout />
            </CategoryDockProvider>
        );

        expect(screen.getByTestId('state').textContent).toBe('news');
    });

    it('re-registers when the category changes', () => {
        const { rerender } = render(
            <CategoryDockProvider>
                <Page category="news" onChange={() => {}} />
                <StateReadout />
            </CategoryDockProvider>
        );

        rerender(
            <CategoryDockProvider>
                <Page category="docs" onChange={() => {}} />
                <StateReadout />
            </CategoryDockProvider>
        );

        expect(screen.getByTestId('state').textContent).toBe('docs');
    });

    it('exposes the registered change handler', () => {
        const onChange = vi.fn();
        let captured: ((category: any) => void) | undefined;

        function Capture() {
            captured = useCategoryDockState()?.onCategoryChange;
            return null;
        }

        render(
            <CategoryDockProvider>
                <Page category="news" onChange={onChange} />
                <Capture />
            </CategoryDockProvider>
        );

        act(() => captured?.('docs'));

        expect(onChange).toHaveBeenCalledWith('docs');
    });

    it('unregisters when the page unmounts', () => {
        function Host({ mounted }: { mounted: boolean }) {
            return (
                <CategoryDockProvider>
                    {mounted && <Page category="news" onChange={() => {}} />}
                    <StateReadout />
                </CategoryDockProvider>
            );
        }

        const { rerender } = render(<Host mounted />);
        expect(screen.getByTestId('state').textContent).toBe('news');

        rerender(<Host mounted={false} />);

        expect(screen.getByTestId('state').textContent).toBe('none');
    });
});

describe('hooks outside a provider', () => {
    it('fall back to the default context value', () => {
        render(
            <>
                <StateReadout />
                <VisibilityReadout />
            </>
        );

        expect(screen.getByTestId('state').textContent).toBe('none');
        expect(screen.getByTestId('visibility').textContent).toBe('visible');

        // The default toggle is a no-op rather than a crash.
        expect(() => fireEvent.click(screen.getByTestId('visibility'))).not.toThrow();
    });
});
