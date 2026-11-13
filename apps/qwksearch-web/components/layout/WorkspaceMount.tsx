'use client';

import * as React from 'react';
import { isChunkLoadError, reloadForChunkError } from 'research-agent-ui/chunk-error-reload';

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
 * So the import is lazy, lives inside a Suspense boundary, and only ever runs
 * in the browser (see `WorkspaceMount` below): the server streams the skeleton
 * and never evaluates the entry, so neither a DOM-only dependency nor the
 * entry's sheer size can cost the response. The browser — where `document`
 * exists — renders the workspace a moment after hydration.
 *
 * The error boundary above the Suspense is the second line. If a chunk fails
 * to load in the browser — almost always a tab (or cached script) from before
 * the last deploy asking for a hash the new build no longer serves — it
 * reloads the page once to pick up the current build, holding the skeleton
 * meanwhile. Any other failure, or a chunk that is still missing after that
 * reload, gets a reload prompt rather than a blank screen.
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
  { failed: boolean; reloading: boolean }
> {
  state = { failed: false, reloading: false };

  static getDerivedStateFromError(error: unknown) {
    // Unlike `componentDidCatch`, this runs during a server render too, so it
    // is the only hook that reports a workspace failure from inside the Worker.
    logSsrError('workspace:boundary:derived-state', error);
    // A stale chunk is recovered by reloading (in `componentDidCatch`, since a
    // reload is a side effect); keep the skeleton up rather than flash the
    // error in between.
    return {
      failed: true,
      reloading: typeof window !== 'undefined' && isChunkLoadError(error),
    };
  }

  componentDidCatch(error: unknown) {
    if (reloadForChunkError(error)) {
      console.warn('[workspace] chunk failed to load, reloading for the current build', error);
      return;
    }
    // Surfaces in the browser console and in whatever error reporting the page
    // installs; the server-side attempt is already reported by React as a
    // recoverable error.
    console.error('[workspace] failed to mount', error);
    if (this.state.reloading) this.setState({ reloading: false });
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return this.state.reloading ? <WorkspaceSkeleton /> : <WorkspaceUnavailable />;
  }
}

const subscribeNever = () => () => {};

/**
 * `false` on the server and during hydration, `true` once the browser has
 * committed. `useSyncExternalStore` hands React the server snapshot while it
 * hydrates, so the first client render matches the server's skeleton and the
 * switch to the workspace is an ordinary update afterwards — no mismatch.
 */
function useIsBrowser() {
  return React.useSyncExternalStore(
    subscribeNever,
    () => true,
    () => false,
  );
}

/**
 * The research workspace, mounted so that loading it can never take the page
 * down — and never loaded on the server at all.
 *
 * `React.lazy` is not client-only: rendered on the server, it calls its loader
 * and the SSR environment dynamic-imports `research-agent-ui/workspace` and its
 * static graph (~150 modules, ~5 MB of code) inside the Worker. That import is
 * what failed in production with `Dynamic import exceeded memory limits.` on
 * `GET /` — the isolate's 128 MB was spent evaluating an editor the server only
 * ever renders as a 100vh app shell the browser re-renders anyway. Because the
 * failed import surfaced as a shell error, vinext then retried with
 * `global-error.tsx`, which needs the SSR handler again, and the request died
 * there too.
 *
 * So the server renders the skeleton and stops; the browser mounts the lazy
 * view right after hydration.
 */
export function WorkspaceMount() {
  traceSsr('workspace:mount:render');
  const isBrowser = useIsBrowser();

  if (!isBrowser) return <WorkspaceSkeleton />;

  return (
    <WorkspaceErrorBoundary>
      <React.Suspense fallback={<WorkspaceSkeleton />}>
        <ResearchWorkspaceView />
      </React.Suspense>
    </WorkspaceErrorBoundary>
  );
}

traceSsr('module:components/layout/WorkspaceMount');
