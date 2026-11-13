'use client';

import { lazy, memo, Suspense, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router';

import FeatureFlagGate from '@/components/FeatureFlagGate';
import { createSurfaceSkeleton } from '@/components/Skeleton/Surface';

// The REASON editor tree (Plate/Tiptap, its sidebar and its Tailwind
// stylesheet) is several MB. It loads only when `/docs` is opened, never with
// the app shell, and it is client-only: nothing here reaches the Worker.
const ReasonDocsView = lazy(() => import('./ReasonDocsView'));

const EditorSkeleton = createSurfaceSkeleton('editor');

/**
 * The editor lives in the layout rather than in the `/docs` and
 * `/docs/:docId` pages, so switching documents (which rewrites the URL) never
 * remounts it. The two pages render nothing.
 */
const DocsWorkspace = memo(() => {
  const { docId } = useParams<{ docId?: string }>();
  const navigate = useNavigate();

  const handleActiveDocumentChange = useCallback(
    (id: string | null) => {
      const next = id ? `/docs/${encodeURIComponent(id)}` : '/docs';
      if (window.location.pathname !== next) navigate(next, { replace: true });
    },
    [navigate],
  );

  return (
    <Suspense fallback={<EditorSkeleton />}>
      <ReasonDocsView
        initialDocId={docId ? decodeURIComponent(docId) : null}
        onActiveDocumentChange={handleActiveDocumentChange}
      />
    </Suspense>
  );
});

DocsWorkspace.displayName = 'QwkSearchDocsWorkspace';

const DocsLayout = memo(() => (
  <FeatureFlagGate fallbackPath="/" flag="enableQwkSearch">
    <DocsWorkspace />
  </FeatureFlagGate>
));

DocsLayout.displayName = 'QwkSearchDocsLayout';

/** The `/docs` and `/docs/:docId` pages: the layout above draws the editor. */
export const DocsPage = () => null;

export default DocsLayout;
