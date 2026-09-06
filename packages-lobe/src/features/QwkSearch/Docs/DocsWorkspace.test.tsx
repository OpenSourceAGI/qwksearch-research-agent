/**
 * @vitest-environment happy-dom
 */
import { fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { QwkDocument } from './api';
import { useDocsStore } from './store';

const navigate = vi.fn();
const routeParams: { docId?: string } = {};

vi.mock('react-router', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  useNavigate: () => navigate,
  useParams: () => routeParams,
}));

vi.mock('@lobehub/ui', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  Markdown: ({ children }: { children: ReactNode }) => (
    <div data-testid={'markdown'}>{children}</div>
  ),
}));

vi.mock('antd-style', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  createStaticStyles: () => new Proxy({}, { get: (_, key) => String(key) }),
  cssVar: new Proxy({}, { get: (_, token) => `var(--${String(token)})` }),
  cx: (...args: unknown[]) => args.filter(Boolean).join(' '),
}));

const DocsWorkspace = (await import('./DocsWorkspace')).default;

const doc = (id: number, overrides: Partial<QwkDocument> = {}): QwkDocument => ({
  content: 'Existing notes',
  createdAt: '2026-01-01T00:00:00Z',
  id,
  isExpanded: 0,
  isFolder: 0,
  metadata: null,
  name: 'Research',
  parentId: null,
  title: 'Research',
  updatedAt: '2026-01-01T00:00:00Z',
  userId: 'user_1',
  ...overrides,
});

const resetStore = (overrides = {}) =>
  useDocsStore.setState({
    activeId: undefined,
    dirty: false,
    documents: [],
    draft: { content: '', title: '' },
    error: undefined,
    initialized: true,
    loading: false,
    saving: false,
    ...overrides,
  });

describe('DocsWorkspace', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('[]')));
    navigate.mockReset();
    delete routeParams.docId;
    resetStore();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('invites the reader to create a document when none exist', () => {
    render(<DocsWorkspace />);
    expect(screen.getByText('docs.empty.title')).toBeTruthy();
    expect(screen.getByText('docs.empty.description')).toBeTruthy();
  });

  it('creates a document from the empty state and routes to it', async () => {
    const create = vi.fn(async () => doc(7));
    resetStore();
    useDocsStore.setState({ create });

    render(<DocsWorkspace />);
    fireEvent.click(screen.getByText('docs.actions.newDocument'));
    await vi.waitFor(() => expect(navigate).toHaveBeenCalledWith('/docs/7'));
  });

  it('renders the active document title and body in the editor', () => {
    routeParams.docId = '3';
    resetStore({
      activeId: 3,
      documents: [doc(3)],
      draft: { content: 'Existing notes', title: 'Research' },
    });

    render(<DocsWorkspace />);

    expect(screen.getByDisplayValue('Research')).toBeTruthy();
    expect(screen.getByDisplayValue('Existing notes')).toBeTruthy();
    expect(screen.getByText('docs.actions.saved')).toBeTruthy();
  });

  it('marks the draft dirty as the reader types', () => {
    routeParams.docId = '3';
    resetStore({
      activeId: 3,
      documents: [doc(3)],
      draft: { content: 'Existing notes', title: 'Research' },
    });

    render(<DocsWorkspace />);
    fireEvent.change(screen.getByDisplayValue('Existing notes'), {
      target: { value: 'Existing notes plus more' },
    });

    const state = useDocsStore.getState();
    expect(state.dirty).toBe(true);
    expect(state.draft.content).toBe('Existing notes plus more');
  });

  it('switches to a rendered preview of the draft', () => {
    routeParams.docId = '3';
    resetStore({
      activeId: 3,
      documents: [doc(3)],
      draft: { content: '# Heading', title: 'Research' },
    });

    render(<DocsWorkspace />);
    fireEvent.click(screen.getByText('docs.editor.preview'));

    expect(screen.getByTestId('markdown').textContent).toBe('# Heading');
  });

  it('reports a failed save instead of silently losing the edit', () => {
    routeParams.docId = '3';
    resetStore({
      activeId: 3,
      documents: [doc(3)],
      draft: { content: 'body', title: 'Research' },
      error: 'save',
    });

    render(<DocsWorkspace />);
    expect(screen.getByText('docs.error.save')).toBeTruthy();
  });
});
