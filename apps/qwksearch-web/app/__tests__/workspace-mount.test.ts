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
 * `WorkspaceMount` is the fix, so this holds the property that matters: when
 * loading that entry throws, server rendering still produces the page with a
 * placeholder in the workspace's place and hands the subtree to the client.
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

  it('renders the workspace when its chunk loads', async () => {
    vi.doMock('research-agent-ui/workspace', () => ({
      ResearchWorkspaceView: () =>
        React.createElement('main', { 'data-testid': 'workspace' }, 'workspace'),
    }));

    const { html, errors } = await renderMount();

    expect(html).toContain('data-testid="workspace"');
    expect(errors).toEqual([]);
  });

  it('still renders a page when loading the workspace throws', async () => {
    vi.doMock('research-agent-ui/workspace', () => {
      // What a DOM-only dependency does to this entry on a server.
      throw new ReferenceError('document is not defined');
    });

    const { html, errors } = await renderMount();

    // The response is the page plus a placeholder — not an error shell.
    expect(html).toContain('data-testid="workspace-skeleton"');
    expect(html).not.toContain('data-testid="workspace"');
    // React reported the failure as recoverable and deferred to the client
    // rather than letting it escape the render. (Vitest rewrites the message of
    // an error thrown out of a mock factory, so only the count is asserted.)
    expect(errors).toHaveLength(1);
  });
});
