import * as React from 'react';
import { renderToReadableStream } from 'react-dom/server.browser';
import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * `/` and `/workspace` both mount the research workspace, and that entry
 * (`research-agent-ui/workspace`) drags the REASON editor's whole dependency
 * tree in with it. A dependency that reads `document` while its module is being
 * evaluated therefore used to take the *response* down, not just the subtree:
 * the import threw as the route module loaded, before React had a boundary, and
 * the server answered with Next's error shell and a 500 (see #440, and the
 * homepage 500 that followed it).
 *
 * `WorkspaceMount` is the fix. It first made that throw a recoverable render
 * error; then production showed that even a *successful* server-side import is
 * too much — `Dynamic import exceeded memory limits.` on `GET /` — because
 * `React.lazy` runs its loader during SSR. So the property held here is the
 * stronger one: the server never imports the entry at all, renders the
 * skeleton, and leaves the workspace to the browser.
 */
async function renderMount() {
  const { WorkspaceMount } = await import('@/components/layout/WorkspaceMount');
  const errors: string[] = [];

  const stream = await renderToReadableStream(React.createElement(WorkspaceMount), {
    onError(error: unknown) {
      errors.push(error instanceof Error ? error.message : String(error));
    },
  });

  return { html: await new Response(stream).text(), errors };
}

describe('WorkspaceMount', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('never imports the workspace entry on the server', async () => {
    const factory = vi.fn(() => ({
      ResearchWorkspaceView: () =>
        React.createElement('main', { 'data-testid': 'workspace' }, 'workspace'),
    }));
    vi.doMock('research-agent-ui/workspace', factory);

    const { html, errors } = await renderMount();

    expect(factory).not.toHaveBeenCalled();
    expect(html).toContain('data-testid="workspace-skeleton"');
    expect(html).not.toContain('data-testid="workspace"');
    expect(errors).toEqual([]);
  });

  it('still renders the page when the workspace entry would throw', async () => {
    vi.doMock('research-agent-ui/workspace', () => {
      // What a DOM-only dependency does to this entry on a server.
      throw new ReferenceError('document is not defined');
    });

    const { html, errors } = await renderMount();

    // The response is the page plus a placeholder — not an error shell — and
    // nothing failed, because the server never evaluated the entry.
    expect(html).toContain('data-testid="workspace-skeleton"');
    expect(errors).toEqual([]);
  });
});
