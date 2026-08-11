/**
 * `/docs/demo/plate/:id` — the Plate version of the Reason Editor.
 *
 * Reads the same document as the Tiptap route through the same document API,
 * and renders the same `REASON_TOOLBAR`. Below the toolbar it is the Plate
 * starter: Plate's plugin kits, node components, floating controls and slash
 * menu. Its collaboration room is `reason-editor:plate:<id>` — separate from
 * Tiptap's, because a Slate document and a ProseMirror document are not
 * interchangeable.
 */

'use client';

import { use, useEffect, useMemo, useState } from 'react';

import { htmlToPlateValue, ReasonPlateEditor } from 'react-reason-editor/docs-agent';

import { DemoShell } from '@/components/reason-demo/DemoShell';
import {
  loadDemoDocument,
  loadDemoUser,
  type ReasonDemoDocument,
  type ReasonDemoUser,
} from '@/lib/reason-demo/document-api';

export default function PlateDemoPage({
  params,
}: {
  params: Promise<{ documentId: string }>;
}) {
  const { documentId } = use(params);

  const [document, setDocument] = useState<ReasonDemoDocument | null>(null);
  const [user, setUser] = useState<ReasonDemoUser | null>(null);

  useEffect(() => {
    setDocument(loadDemoDocument(documentId));
    setUser(loadDemoUser());
  }, [documentId]);

  // Seeds an empty room only; once the room has content Yjs is authoritative.
  const initialValue = useMemo(
    () => (document ? htmlToPlateValue(document.html) : undefined),
    [document],
  );

  const authToken = useMemo(
    () => (process.env.NEXT_PUBLIC_HOCUSPOCUS_URL ? user?.id : undefined),
    [user],
  );

  if (!document || !user || !initialValue) return null;

  return (
    <DemoShell
      collaborative={Boolean(authToken)}
      documentId={documentId}
      engine="plate"
      title={document.title}
    >
      <ReasonPlateEditor
        authToken={authToken}
        documentId={documentId}
        initialValue={initialValue}
        user={user}
      />
    </DemoShell>
  );
}
