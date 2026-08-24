/**
 * `/docs/demo/tiptap/:id` — the control version of the Reason Editor.
 *
 * Same document API and same toolbar schema as the Plate route; only the engine
 * differs. Its collaboration room is `reason-editor:tiptap:<id>`, which Plate
 * clients never open.
 */

'use client';

import { use, useEffect, useMemo, useState } from 'react';

import { ReasonTiptapEditor } from 'react-reason-editor/docs-agent';

import { DemoShell } from '@/components/reason-demo/DemoShell';
import {
  loadDemoDocument,
  loadDemoUser,
  type ReasonDemoDocument,
  type ReasonDemoUser,
} from '@/lib/reason-demo/document-api';

export default function TiptapDemoPage({
  params,
}: {
  params: Promise<{ documentId: string }>;
}) {
  const { documentId } = use(params);

  const [document, setDocument] = useState<ReasonDemoDocument | null>(null);
  const [user, setUser] = useState<ReasonDemoUser | null>(null);

  // The document store is localStorage-backed, so it can only be read once the
  // component is on the client.
  useEffect(() => {
    setDocument(loadDemoDocument(documentId));
    setUser(loadDemoUser());
  }, [documentId]);

  const authToken = useMemo(
    () => (process.env.NEXT_PUBLIC_HOCUSPOCUS_URL ? user?.id : undefined),
    [user],
  );

  if (!document || !user) return null;

  return (
    <DemoShell
      collaborative={Boolean(authToken)}
      documentId={documentId}
      engine="tiptap"
      title={document.title}
    >
      <ReasonTiptapEditor
        authToken={authToken}
        documentId={documentId}
        initialContent={document.html}
        user={user}
      />
    </DemoShell>
  );
}
