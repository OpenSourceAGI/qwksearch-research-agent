/**
 * @vitest-environment happy-dom
 */
import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const navigate = vi.fn();
const routeParams: { docId?: string } = {};
const featureFlags = { enableQwkSearch: true as boolean };

vi.mock('react-router', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  useNavigate: () => navigate,
  useParams: () => routeParams,
}));

vi.mock('@/store/serverConfig', () => ({
  useServerConfigStore: (selector: (s: unknown) => unknown) => selector({}),
}));
vi.mock('@/store/serverConfig/selectors', () => ({
  featureFlagsSelectors: () => featureFlags,
}));

vi.mock('@/components/Skeleton/Surface', () => ({
  createSurfaceSkeleton: () => () => <div data-testid={'skeleton'} />,
}));

// The real view pulls in the whole REASON editor; the layout only has to hand
// it the route's document and mirror its active document back into the URL.
let reportActive: ((id: string | null) => void) | undefined;
vi.mock('./ReasonDocsView', () => ({
  default: (props: {
    initialDocId?: string | null;
    onActiveDocumentChange?: (id: string | null) => void;
  }) => {
    reportActive = props.onActiveDocumentChange;
    return <div data-testid={'reason-docs'}>{props.initialDocId ?? 'none'}</div>;
  },
}));

const { DocsLayout, DocsPage } = await import('./index');

describe('QwkSearch DocsLayout', () => {
  beforeEach(() => {
    navigate.mockReset();
    delete routeParams.docId;
    featureFlags.enableQwkSearch = true;
    reportActive = undefined;
    window.history.replaceState(null, '', '/docs');
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('mounts the REASON editor lazily and passes the route document', async () => {
    routeParams.docId = 'doc%201';
    render(<DocsLayout />);

    expect((await screen.findByTestId('reason-docs')).textContent).toBe('doc 1');
  });

  it('opens with no document on /docs', async () => {
    render(<DocsLayout />);

    expect((await screen.findByTestId('reason-docs')).textContent).toBe('none');
  });

  it('mirrors the active document into the URL without stacking history', async () => {
    render(<DocsLayout />);
    await screen.findByTestId('reason-docs');

    act(() => reportActive?.('abc'));
    expect(navigate).toHaveBeenCalledWith('/docs/abc', { replace: true });

    navigate.mockReset();
    window.history.replaceState(null, '', '/docs/abc');
    act(() => reportActive?.('abc'));
    expect(navigate).not.toHaveBeenCalled();

    act(() => reportActive?.(null));
    expect(navigate).toHaveBeenCalledWith('/docs', { replace: true });
  });

  it('sends the user home when the QwkSearch add-ons are off', () => {
    featureFlags.enableQwkSearch = false;
    render(<DocsLayout />);

    expect(screen.queryByTestId('reason-docs')).toBeNull();
    expect(navigate).toHaveBeenCalledWith('/', { replace: true });
  });

  it('leaves the pages empty, since the layout draws the editor', () => {
    const { container } = render(<DocsPage />);
    expect(container.innerHTML).toBe('');
  });
});
