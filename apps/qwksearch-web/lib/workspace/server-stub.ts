/**
 * What `research-agent-ui/workspace` resolves to in the Worker's SSR build.
 *
 * `components/layout/WorkspaceMount` only imports that entry in the browser,
 * so on the server the import is dead code — but a bundler can't see that, and
 * left alone it bundles the entry's whole graph (the REASON editor, its
 * toolbar, docx/html converters, media players, speech models…) into the
 * Worker. That code was tens of megabytes of the Worker's upload, all of it
 * counted against the isolate's 128 MB, and contributed to both
 * `Dynamic import exceeded memory limits.` on `GET /` and deploys failing with
 * `Script startup exceeded memory limits.`
 *
 * `vite.config.ts` points the `ssr` environment here instead. If something
 * ever does render the real view on the server, it fails loudly into
 * WorkspaceMount's error boundary rather than silently bundling the tree back.
 */
export function ResearchWorkspaceView(): never {
  throw new Error(
    'research-agent-ui/workspace is client-only; render it through WorkspaceMount.',
  );
}
