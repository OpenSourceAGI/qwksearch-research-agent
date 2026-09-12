'use client';

import * as React from 'react';

import { logSsrError, traceSsr } from '@/lib/debug/ssr-trace';

/**
 * The one place the app mounts `research-agent-ui/workspace`.
 *
 * Why it exists: that entry pulls in the REASON editor and, through it, a few
 * hundred transitive modules. If *any* of them touches `document` or `window`
 * while being evaluated, a static `import` of this entry throws
 * `ReferenceError: document is not defined` as the route module loads — before
 * React has a boundary to fall back to — so the server answers the whole
 * request with Next's error shell and a 500. That is exactly what took the
 * homepage (and `/workspace`) down in #440, and the cause there was a
 * dependency's *build*, not this repo's code: nothing in the app can promise it
 * will not happen again on the next dependency bump.
 *
 * So the import is lazy and lives inside a Suspense boundary. The module is
 * then evaluated *during render* rather than at module load, which makes a
 * throw an ordinary render error in a subtree React knows how to give up on:
 * it streams this fallback instead, marks the subtree for client rendering, and
 * the response stays a 200 carrying the real page shell. The browser — where
 * `document` exists — renders the workspace a moment later, so a DOM-only
 * dependency costs a flash of skeleton rather than the entire site.
 *
 * The error boundary above the Suspense is the second line: if the chunk fails
 * in the browser too (an offline navigation, a half-deployed asset), the reader
 * gets a reload prompt rather than a blank screen.
 */
const ResearchWorkspaceView = React.lazy(() => {
  traceSsr('workspace:chunk:import:begin');
  return import('research-agent-ui/workspace').then(
    (mod) => {
      traceSsr('workspace:chunk:import:end', {
        hasView: typeof mod.ResearchWorkspaceView === 'function',
      });
      return { default: mod.ResearchWorkspaceView };
    },
    (error) => {
      // The whole point of the lazy import is that this failure costs a
      // skeleton instead of the page — but React only reports it as a
      // *recoverable* error, which production logs nowhere. Log it here, then
      // rethrow so the Suspense/error boundary behaviour below is unchanged.
      logSsrError('workspace:chunk:import:failed', error);
      throw error;
    },
  );
});

/**
 * Holds the workspace's footprint while its chunk is in flight. The workspace
 * is a fixed 100vh app shell, so the placeholder is one too — anything shorter
 * would let the content stacked beneath it (the features slab on the homepage)
 * jump up into the first screen and back down again.
 */
function WorkspaceSkeleton() {
  return (
    <div
      className="bg-background flex h-screen w-full items-center justify-center"
      aria-busy="true"
      aria-label="Loading the research workspace"
      data-testid="workspace-skeleton"
    >
      <div className="border-muted-foreground/30 border-t-foreground/60 size-8 animate-spin rounded-full border-2" />
    </div>
  );
}

function WorkspaceUnavailable() {
  return (
    <div className="bg-background flex h-screen w-full flex-col items-center justify-center gap-4 px-6 text-center">
      <p className="text-muted-foreground text-sm">
        The research workspace could not be loaded.
      </p>
      <button
        type="button"
        onClick={() => window.location.reload()}
        className="hover:bg-accent rounded-full border px-4 py-2 text-sm font-medium"
      >
        Reload
      </button>
    </div>
  );
}

class WorkspaceErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError(error: unknown) {
    // Unlike `componentDidCatch`, this runs during a server render too, so it
    // is the only hook that reports a workspace failure from inside the Worker.
    logSsrError('workspace:boundary:derived-state', error);
    return { failed: true };
  }

  componentDidCatch(error: unknown) {
    // Surfaces in the browser console and in whatever error reporting the page
    // installs; the server-side attempt is already reported by React as a
    // recoverable error.
    console.error('[workspace] failed to mount', error);
  }

  render() {
    return this.state.failed ? <WorkspaceUnavailable /> : this.props.children;
  }
}

/** The research workspace, mounted so that failing to load it is not a 500. */
export function WorkspaceMount() {
  traceSsr('workspace:mount:render');

  return (
    <WorkspaceErrorBoundary>
      <React.Suspense fallback={<WorkspaceSkeleton />}>
        <ResearchWorkspaceView />
      </React.Suspense>
    </WorkspaceErrorBoundary>
  );
}

traceSsr('module:components/layout/WorkspaceMount');
